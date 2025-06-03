const puppeteer = require("puppeteer");
const seeds = require("./seedPhrases.json");
const templates = require("./shortsTemplates");

function getRandomSeed() {
  return seeds[Math.floor(Math.random() * seeds.length)];
}

function getRandomTemplate(seed) {
  return templates(seed)
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    userDataDir: "./youtube-session",
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto("https://www.youtube.com/shorts", {
    waitUntil: "networkidle2",
  });

  // Open comment section
  await page.waitForSelector("#comments-button", { timeout: 5000 });
  await page.click("#comments-button");

  while (true) {
    const seed = getRandomSeed();
    const comment = getRandomTemplate(seed);

    try {
      // Watch for a random time
      const watchTime = Math.floor(Math.random() * 8000) + 1000;
      console.log(`⏱️ Watching for ${watchTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, watchTime));
      // Wait for the comment box and focus
      await page.waitForSelector("ytd-comment-simplebox-renderer", {
        timeout: 5000,
      });
      await page.click("ytd-comment-simplebox-renderer");

      // Type into the real editable div
      await page.waitForSelector("#contenteditable-root", { timeout: 5000 });
      await page.focus("#contenteditable-root");
      await page.evaluate((text) => {
        const el = document.querySelector("#contenteditable-root");
        el.innerText = text;
      }, comment);

      // Submit the comment
      await page.waitForSelector("#submit-button button:not([disabled])", {
        timeout: 5000,
      });
      await page.click("#submit-button button");

      console.log("✅ Comment posted:", comment);
    } catch (e) {
      console.log("⚠️ Skipped due to error:", e.message);
    }

    // Move to next Short
    await page.keyboard.press("ArrowDown");
  }
})();
