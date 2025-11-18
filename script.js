// Set quick example CSS selector
function setSelector(selector) {
    document.getElementById("selectorInput").value = selector;
}

async function scrape() {
    const url = document.getElementById("urlInput").value;
    const selector = document.getElementById("selectorInput").value.trim();
    const outputBox = document.getElementById("output");

    if (!url) {
        outputBox.textContent = "⚠️ Please enter a URL.";
        return;
    }

    outputBox.textContent = "⏳ Scraping... Please wait...";

    try {
        const apiURL = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(apiURL);
        const data = await response.json();

        // Parse HTML using DOMParser (safe & responsive)
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, "text/html");

        let results = [];

        // If selector exists → extract elements
        if (selector) {
            const elements = doc.querySelectorAll(selector);

            if (elements.length === 0) {
                outputBox.textContent = "⚠️ No elements match the CSS selector.";
                return;
            }

            elements.forEach(el => {
                if (el.tagName === "IMG") {
                    results.push("Image: " + (el.src || "No source"));
                } else {
                    results.push(el.textContent.trim());
                }
            });
        } 
        else {
            // Fallback: Extract all visible text
            results = doc.body.innerText.split("\n").map(t => t.trim()).filter(Boolean);
        }

        // Show first 50 results for responsiveness
        const limited = results.slice(0, 50);

        outputBox.textContent = limited.join("\n\n") ||
            "⚠️ Nothing found or page contains protected content.";

    } catch (err) {
        outputBox.textContent = "❌ Error: " + err;
    }
}
