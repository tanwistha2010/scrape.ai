"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Globe, Moon, Sun, FileText, FileSpreadsheet, FileJson, Loader2, Trash2, Clock, Shield } from "lucide-react"

interface ScrapeResult {
  selector: string
  content: string
  tag?: string
  href?: string
  src?: string
}

interface HistoryItem {
  id: string
  url: string
  selector: string
  timestamp: Date
  resultCount: number
}

const QUICK_SELECTORS = [
  { label: "Article Titles", selector: "h1, h2, article h1, article h2" },
  { label: "All Links", selector: "a[href]" },
  { label: "Paragraphs", selector: "p" },
  { label: "Images", selector: "img[src]" },
]

export function WebScraper() {
  const [darkMode, setDarkMode] = useState(false)
  const [url, setUrl] = useState("")
  const [selector, setSelector] = useState("")
  const [results, setResults] = useState<ScrapeResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [useProxy, setUseProxy] = useState(true)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  const handleScrape = async () => {
    if (!url || !selector) {
      setError("Please enter both URL and CSS selector")
      return
    }

    setLoading(true)
    setError("")
    setResults([])

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, selector, useProxy }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to scrape")
      }

      setResults(data.results)

      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        url,
        selector,
        timestamp: new Date(),
        resultCount: data.results.length,
      }
      setHistory((prev) => [historyItem, ...prev].slice(0, 10))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleQuickSelector = (selectorValue: string) => {
    setSelector(selectorValue)
  }

  const loadFromHistory = (item: HistoryItem) => {
    setUrl(item.url)
    setSelector(item.selector)
  }

  const clearHistory = () => {
    setHistory([])
  }

  const downloadFile = (format: "txt" | "csv" | "json") => {
    if (results.length === 0) return

    let content: string
    let mimeType: string
    let extension: string

    switch (format) {
      case "txt":
        content = results.map((r) => r.content).join("\n\n")
        mimeType = "text/plain"
        extension = "txt"
        break
      case "csv":
        const headers = "Selector,Content,Tag,Href,Src\n"
        const rows = results
          .map(
            (r) =>
              `"${r.selector}","${r.content.replace(/"/g, '""')}","${r.tag || ""}","${r.href || ""}","${r.src || ""}"`,
          )
          .join("\n")
        content = headers + rows
        mimeType = "text/csv"
        extension = "csv"
        break
      case "json":
        content = JSON.stringify(results, null, 2)
        mimeType = "application/json"
        extension = "json"
        break
    }

    const blob = new Blob([content], { type: mimeType })
    const downloadUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = downloadUrl
    a.download = `scrape-results.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(downloadUrl)
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">scrape.ai</h1>
              <p className="text-sm text-muted-foreground">Extract data from websites using CSS selectors</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setDarkMode(!darkMode)} className="gap-2">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {darkMode ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm text-foreground">
            <strong>Tip:</strong> Try these practice sites:{" "}
            <code className="bg-muted px-1 rounded">https://quotes.toscrape.com</code> or{" "}
            <code className="bg-muted px-1 rounded">https://books.toscrape.com</code>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scrape Configuration */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Scrape Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Target URL</label>
                <Input placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  CSS Selector{" "}
                  <span className="text-muted-foreground cursor-help" title="Enter CSS selectors separated by commas">
                    (?)
                  </span>
                </label>
                <Input
                  placeholder="h1, .title, #content"
                  value={selector}
                  onChange={(e) => setSelector(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Use CORS Proxy</p>
                    <p className="text-xs text-muted-foreground">Enable to bypass cross-origin restrictions</p>
                  </div>
                </div>
                <Switch checked={useProxy} onCheckedChange={setUseProxy} />
              </div>

              <div className="flex flex-wrap gap-2">
                {QUICK_SELECTORS.map((qs) => (
                  <Badge
                    key={qs.label}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleQuickSelector(qs.selector)}
                  >
                    {qs.label}
                  </Badge>
                ))}
              </div>

              <Button className="w-full" onClick={handleScrape} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Start Scraping
                  </>
                )}
              </Button>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadFile("txt")}
                  disabled={results.length === 0}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Save TXT
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadFile("csv")}
                  disabled={results.length === 0}
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Save CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadFile("json")}
                  disabled={results.length === 0}
                  className="gap-2"
                >
                  <FileJson className="h-4 w-4" />
                  Save JSON
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>History</CardTitle>
              {history.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearHistory}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history yet</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => loadFromHistory(item)}
                    >
                      <p className="text-sm font-medium text-foreground truncate">{item.url}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.selector}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {item.resultCount} results
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            {error && <div className="p-4 rounded-lg bg-destructive/10 text-destructive mb-4">{error}</div>}

            {results.length === 0 && !error ? (
              <p className="text-muted-foreground">Scraped data will appear here</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {result.tag || "text"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{result.selector}</span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">{result.content}</p>
                    {result.href && (
                      <a
                        href={result.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 block truncate"
                      >
                        {result.href}
                      </a>
                    )}
                    {result.src && (
                      <a
                        href={result.src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 block truncate"
                      >
                        {result.src}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
