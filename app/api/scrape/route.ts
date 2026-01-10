import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

const CORS_PROXIES = [
  "https://api.allorigins.win/raw?url=",
  "https://corsproxy.io/?",
  "https://api.codetabs.com/v1/proxy?quest=",
]

export async function POST(request: NextRequest) {
  try {
    const { url, selector, useProxy = true } = await request.json()

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

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Scrape error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred while scraping" },
      { status: 500 },
    )
  }
}
