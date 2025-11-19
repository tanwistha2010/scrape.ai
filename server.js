const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
    res.send("Backend is running!");
});

app.post("/scrape", async (req, res) => {
    const { url, selector } = req.body;

    if (!url) {
        return res.json({ success: false, error: "URL is missing" });
    }

    console.log(`Scraping: ${url} | Selector: ${selector}`);

    try {
        // Timeout added to prevent hanging
        const response = await axios.get(url, { timeout: 15000 });
        const $ = cheerio.load(response.data);

        let results = [];

        if (selector) {
            $(selector).each((i, el) => {

                // If image
                if ($(el).is("img")) {
                    let src = $(el).attr("src");

                    // Convert relative to absolute links
                    try {
                        src = new URL(src, url).href;
                    } catch (err) {}

                    results.push(src);

                } else {
                    results.push($(el).text().trim());
                }
            });

        } else {
            // Extract visible text if no selector provided
            results = $("body")
                .text()
                .split("\n")
                .map(t => t.trim())
                .filter(Boolean);
        }

        return res.json({
            success: true,
            count: results.length,
            data: results.slice(0, 100)
        });

    } catch (err) {
        console.error("Scraping error:", err.message);
        return res.json({ success: false, error: err.message });
    }
});

app.listen(5000, () => {
    console.log("Scraper backend running on http://localhost:5000");
});
