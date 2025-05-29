const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: "./youtube-session", // Same folder as in index.js
  });

  const page = await browser.newPage();
  await page.goto("https://accounts.google.com/", {
    waitUntil: "networkidle2",
  });

  console.log("➡️ Please log into your Google/YouTube account manually...");
  console.log("⏳ Waiting 2 minutes for login...");

  await new Promise((resolve) => setTimeout(resolve, 120000));

  console.log(
    "✅ Login session should now be saved. You can close the browser."
  );
  await browser.close();
})();
