import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { GoogleGenerativeAI } from "@google/generative-ai"

const CORS_PROXIES = [
  "https://api.allorigins.win/raw?url=",
  "https://corsproxy.io/?",
  "https://api.codetabs.com/v1/proxy?quest=",
]

async function summarizeWithGemini(
  results: Array<{ selector: string; content: string; tag?: string; href?: string; src?: string }>,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured")
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  
  // Try different model names - start with the most common ones
  const modelNames = ["gemini-2.0-flash-exp", "gemini-1.5-flash-latest", "gemini-1.5-pro-latest"]
  let model = genAI.getGenerativeModel({ model: modelNames[0] })

  // Prepare data for Gemini
  const scrapedData = results
    .map((r) => r.content)
    .filter((c) => c.trim().length > 0)
    .join("\n")
    .slice(0, 30000) // Limit to avoid token limits

  const prompt = `Summarize the following scraped web data in exactly 20 lines. Be concise and focus on the key information:

${scrapedData}

Provide a clear, structured summary in exactly 20 lines.`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    // Try fallback models if first one fails
    for (let i = 1; i < modelNames.length; i++) {
      try {
        model = genAI.getGenerativeModel({ model: modelNames[i] })
        const result = await model.generateContent(prompt)
        const response = await result.response
        return response.text()
      } catch (fallbackError) {
        if (i === modelNames.length - 1) {
          console.error("Gemini API error:", error)
          throw new Error(`Failed to process with Gemini: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
        continue
      }
    }
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, selector, useProxy = true, useGemini = false } = await request.json()

    if (!url || !selector) {
      return NextResponse.json({ error: "URL and selector are required" }, { status: 400 })
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    let html: string | null = null
    let lastError: Error | null = null

    const fetchAttempts = useProxy
      ? [null, ...CORS_PROXIES] // null means direct fetch
      : [null]

    for (const proxy of fetchAttempts) {
      try {
        const fetchUrl = proxy ? `${proxy}${encodeURIComponent(parsedUrl.toString())}` : parsedUrl.toString()

        const response = await fetch(fetchUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
          signal: AbortSignal.timeout(15000), // 15 second timeout
        })

        if (response.ok) {
          html = await response.text()
          break
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error("Unknown error")
        continue
      }
    }

    if (!html) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${lastError?.message || "All proxies failed"}` },
        { status: 400 },
      )
    }

    const $ = cheerio.load(html)

    const results: Array<{
      selector: string
      content: string
      tag?: string
      href?: string
      src?: string
    }> = []

    // Parse multiple selectors
    const selectors = selector.split(",").map((s: string) => s.trim())

    selectors.forEach((sel: string) => {
      $(sel).each((_, element) => {
        const $el = $(element)
        const tagName = element.type === "tag" ? element.tagName : undefined
        const content = $el.text().trim()
        const href = $el.attr("href")
        const src = $el.attr("src")

        // Resolve relative URLs
        let resolvedHref = href
        let resolvedSrc = src

        if (href && !href.startsWith("http") && !href.startsWith("//")) {
          try {
            resolvedHref = new URL(href, parsedUrl.origin).toString()
          } catch {
            resolvedHref = href
          }
        }

        if (src && !src.startsWith("http") && !src.startsWith("//")) {
          try {
            resolvedSrc = new URL(src, parsedUrl.origin).toString()
          } catch {
            resolvedSrc = src
          }
        }

        if (content || resolvedHref || resolvedSrc) {
          results.push({
            selector: sel,
            content: content || (resolvedSrc ? `[Image: ${resolvedSrc}]` : ""),
            tag: tagName,
            href: resolvedHref,
            src: resolvedSrc,
          })
        }
      })
    })

    // If Gemini is enabled and API key is available, summarize the data
    let summary: string | null = null

    if (useGemini && process.env.GEMINI_API_KEY) {
      try {
        summary = await summarizeWithGemini(results)
      } catch (error) {
        console.error("Gemini processing error:", error)
        // Continue with original results if Gemini fails
        return NextResponse.json(
          {
            results,
            error: `Gemini processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
          { status: 200 }, // Still return results, but with error message
        )
      }
    }

    return NextResponse.json({
      results,
      summary,
    })
  } catch (error) {
    console.error("Scrape error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred while scraping" },
      { status: 500 },
    )
  }
}
