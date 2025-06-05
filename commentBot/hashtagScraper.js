const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const SHORTS_LINKS_FILE = path.resolve(__dirname, "shortsLinks.json");
const HASHTAG = "crypto"; // customize hashtag here
const SCROLL_PAUSE = 2000; // maximum ms between scrolls

// Load existing JSON
function loadJSON(path) {
  try {
    return fs.existsSync(path)
      ? JSON.parse(fs.readFileSync(path, "utf-8"))
      : {};
  } catch {
    return {};
  }
}

// Save JSON
function saveJSON(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

function toVideoID(shortURL) {
  return shortURL.split("/shorts/")[1];
}
function toWatchURL(videoID) {
  return `https://www.youtube.com/watch?v=${videoID}`;
}

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const hashtagUrl = `https://www.youtube.com/hashtag/${HASHTAG}/shorts`;
  await page.goto(hashtagUrl, { waitUntil: "networkidle2" });
  await page.waitForSelector("#contents");

  const tracked = loadJSON(SHORTS_LINKS_FILE);
  let found = 0;

  console.log(`[📈] Starting to scroll for hashtag #${HASHTAG}`);

  while (true) {
    // Scroll down a bit to load more
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(Math.random() * SCROLL_PAUSE))
    );

    // Grab all shorts links currently visible
    const links = await page.$$eval('a[href^="/shorts/"]', (anchors) =>
      anchors.map((a) => a.href)
    );

    for (const shortURL of links) {
      const videoID = toVideoID(shortURL);
      const watchURL = toWatchURL(videoID);
      if (!tracked[videoID]) {
        const now = new Date().toISOString();
        tracked[videoID] = {
          shortsURL: shortURL,
          watchURL: watchURL,
          query: `#${HASHTAG}`,
          foundAt: now,
          visited: false,
          firstVisit: null,
          commented: false,
          commentedAt: null,
        };
        console.log(`✅ Found new: ${watchURL}`);
        found++;
      }
    }

    if (found > 0) {
      saveJSON(SHORTS_LINKS_FILE, tracked);
      found = 0;
    }
  }

  // browser.close(); // never reached in infinite scroll
})();
