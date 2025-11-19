🌐 scrape.ai — Web Scraper with Node.js + Cheerio + Browser UI

scrape.ai is a lightweight web scraping tool that allows users to extract data from any publicly accessible website using simple CSS selectors.

It provides:

✔ Browser UI
✔ Node.js backend
✔ Cheerio-based scraping
✔ Dark mode
✔ Export to TXT/CSV/JSON
✔ Save scrape history
✔ Responsive UI
✔ Works without login on most websites

🚀 Features
✅ 1. Extract Data with CSS Selectors

Just enter:

A website URL

A CSS selector

Example selectors:
h1
p
a
img
.title
#main-content

2. Cheerio Web Scraper (Node.js)

Backend scrapes sites using:

axios

cheerio

express

Supports:

Text extraction

Image source extraction

Automatic relative → absolute URL fixing

Error handling

Timeouts

💾 3. Scraping History

Every scrape is saved locally in localStorage with:

URL

Selector

Timestamp

Click an item to re-run it instantly.

📥 4. Export Results

With one click, download:

results.txt

results.csv

results.json

🎨 5. Dark Mode

Dark mode toggle included:

Stored in localStorage

Automatically remembered

📱 6. Fully Responsive UI

Looks great on:

Desktop

Laptop

Tablet

Mobile

🛠 Tech Stack
🔹 Frontend

HTML5

CSS3

JavaScript

LocalStorage

Responsive layout

🔹 Backend

Node.js

Express

Axios

Cheerio

CORS

📂 Project Structure
│
├── index.html       → Frontend UI
├── style.css        → Styling + dark mode
├── script.js        → Frontend logic & export handling
└── server.js        → Node backend scraper
