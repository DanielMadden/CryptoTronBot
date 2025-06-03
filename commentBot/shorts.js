const puppeteer = require("puppeteer");
const seeds = require("./seedPhrases.json");
const templates = require("./templates");

function getRandomSeed() {
  return seeds[Math.floor(Math.random() * seeds.length)];
}

function getRandomTemplate(seed) {
  const tmpl = templates[Math.floor(Math.random() * templates.length)];
  return tmpl(seed);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    userDataDir: "./youtube-session", // reuse session to stay logged in
  });

  const page = await browser.newPage();
  await page.goto("https://www.youtube.com/shorts", {
    waitUntil: "networkidle2",
  });

  // YouTube Shorts scroll loop
  while (true) {
    const seed = getRandomSeed();
    const comment = getRandomTemplate(seed);

    try {
      await page.waitForSelector("video", { timeout: 10000 });
      await page.evaluate(() => document.querySelector("video")?.play());

      const watchTime = Math.floor(Math.random() * 8000) + 3000;
      console.log(`⏱️ Watching for ${watchTime}ms...`);
      await page.waitForTimeout(watchTime);

      // Try commenting
      try {
        await page.waitForSelector("ytd-comment-simplebox-renderer", {
          timeout: 5000,
        });
        await page.click("ytd-comment-simplebox-renderer");
        await page.keyboard.type(comment, { delay: 40 });

        await page.waitForSelector("#submit-button", { timeout: 5000 });
        await page.click("#submit-button");

        console.log("✅ Comment posted:", comment);
      } catch (e) {
        console.log("⚠️ Failed to comment:", e.message);
      }

      // Move to next Short
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(2000); // slight delay before next video
    } catch (e) {
      console.log("❌ Error during cycle:", e.message);
    }
  }
})();
