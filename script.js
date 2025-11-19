// Fills selector input using quick buttons
function setSelector(selector) {
    document.getElementById("selectorInput").value = selector;
}

let lastResults = [];

// Load history from localStorage
window.onload = () => {
    loadHistory();
    applyTheme();
};

// Main scraping function
async function scrape() {
    const url = document.getElementById("urlInput").value;
    const selector = document.getElementById("selectorInput").value.trim();
    const outputBox = document.getElementById("output");
    const button = document.getElementById("scrapeBtn");

    if (!url) {
        outputBox.textContent = "⚠️ Please enter a URL.";
        return;
    }

    button.innerHTML = "⏳ Scraping...";
    button.disabled = true;
    outputBox.textContent = "Processing…";
    outputBox.classList.add("loading");

    try {
        const response = await fetch("http://127.0.0.1:5000/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, selector })
        });

        const result = await response.json();

        if (!result.success) {
            if (result.error.includes("403") || result.error.includes("denied")) {
                outputBox.textContent = "❌ Target site blocks scraping or requires login.";
            } else {
                outputBox.textContent = "❌ " + result.error;
            }
            return;
        }

        lastResults = result.data;
        outputBox.textContent = result.data.join("\n\n");

        saveHistory(url, selector);

    } catch (err) {
        outputBox.textContent = "❌ Could not reach server.";
    } finally {
        button.innerHTML = "🔍 Start Scraping";
        button.disabled = false;
        outputBox.classList.remove("loading");
    }
}

/* -------------------------------
   HISTORY FUNCTIONS
--------------------------------*/

function saveHistory(url, selector) {
    const history = JSON.parse(localStorage.getItem("scrape_history") || "[]");
    history.unshift({
        url,
        selector,
        time: new Date().toLocaleString()
    });
    localStorage.setItem("scrape_history", JSON.stringify(history));
    loadHistory();
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem("scrape_history") || "[]");
    const list = document.getElementById("historyList");
    list.innerHTML = "";

    history.slice(0, 30).forEach(item => {
        const li = document.createElement("li");
        li.innerText = `${item.time}\n${item.url} [${item.selector || "all"}]`;
        li.onclick = () => {
            document.getElementById("urlInput").value = item.url;
            document.getElementById("selectorInput").value = item.selector;
            scrape();
        };
        list.appendChild(li);
    });
}

/* -------------------------------
   EXPORT FUNCTIONS
--------------------------------*/

function exportTXT() {
    if (!lastResults.length) return;
    downloadFile(lastResults.join("\n\n"), "results.txt", "text/plain");
}

function exportCSV() {
    if (!lastResults.length) return;
    const csv = lastResults.map(r => `"${r.replace(/"/g, '""')}"`).join("\n");
    downloadFile(csv, "results.csv", "text/csv");
}

function exportJSON() {
    if (!lastResults.length) return;
    downloadFile(JSON.stringify(lastResults, null, 2), "results.json", "application/json");
}

function downloadFile(data, filename, type) {
    const blob = new Blob([data], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

/* -------------------------------
   DARK MODE
--------------------------------*/

function applyTheme() {
    const mode = localStorage.getItem("theme");
    if (mode === "dark") document.body.classList.add("dark");
}

document.getElementById("darkToggle").onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme",
        document.body.classList.contains("dark") ? "dark" : "light"
    );
};
