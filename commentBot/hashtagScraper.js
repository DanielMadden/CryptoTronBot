const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const SHORTS_LINKS_FILE = path.resolve(__dirname, "shortsLinks.json");
const HASHTAGS_FILE = path.resolve(__dirname, "hashtags.json");

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
  let areMoreHashtags = true;

  while (areMoreHashtags) {
    const hashtags = loadJSON(HASHTAGS_FILE);
    console.log(hashtags);
    let selectedHashtag = null;
    for (const hashtag of Object.keys(hashtags)) {
      let foundHashtag = false;
      if (hashtag.scraped) {
        if (hashtag.scraped === false) foundHashTag = true;
      } else foundHashTag = true;

      if (foundHashtag) selectedHashtag = hashtag;
    }
    if (selectedHashtag) {
      const hashtagUrl = `https://www.youtube.com/hashtag/${HASHTAG}/shorts`;
      await page.goto(hashtagUrl, { waitUntil: "networkidle2" });
      await page.waitForSelector("#contents");

      const tracked = loadJSON(SHORTS_LINKS_FILE);
      let found = 0;

      console.log(`[📈] Starting to scroll for hashtag #${HASHTAG}`);

      let areMoreLinks = true;
      let scrollFailedAttempts = 0;

      while (areMoreLinks) {
        // Scroll down a bit to load more
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });

        await new Promise((resolve) =>
          setTimeout(resolve, Math.floor(Math.random() * 1000))
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
        } else {
          scrollFailedAttempts++;
        }
        if (scrollFailedAttempts > 10) {
          areMoreLinks = false;
        }
      }
    } else {
      console.log("ALL HASHTAGS SCRAPED.");
      areMoreHashtags = false;
      return;
    }

    // browser.close(); // never reached in infinite scroll
  }
})();
