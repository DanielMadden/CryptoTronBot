const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const SHORTS_LINKS_FILE = path.resolve(__dirname, "shortsLinks.json");
const HASHTAG = "crypto"; // customize hashtag here
const SCROLL_PAUSE = 2000; // ms between scrolls

// Load existing links
function loadLinks() {
  try {
    return fs.existsSync(SHORTS_LINKS_FILE)
      ? JSON.parse(fs.readFileSync(SHORTS_LINKS_FILE, "utf-8"))
      : {};
  } catch {
    return {};
  }
}

// Save links
function saveLinks(data) {
  fs.writeFileSync(SHORTS_LINKS_FILE, JSON.stringify(data, null, 2));
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

  const hashtagUrl = `https://www.youtube.com/hashtag/${HASHTAG}/shorts`;
  await page.goto(hashtagUrl, { waitUntil: "networkidle2" });
  await page.waitForSelector("#contents");

  const tracked = loadLinks();
  let found = 0;

  console.log(`[📈] Starting to scroll for hashtag #${HASHTAG}`);

  while (true) {
    // Scroll down a bit to load more
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    await page.waitForTimeout(SCROLL_PAUSE);

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
        console.log(`✅ Found new: ${watchUrl}`);
        found++;
      }
    }

    if (found > 0) {
      saveLinks(tracked);
      found = 0;
    }
  }

  // browser.close(); // never reached in infinite scroll
})();
