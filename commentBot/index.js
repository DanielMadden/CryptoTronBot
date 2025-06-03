function loadJSON(path, fallback = {}) {
  try {
    return fs.existsSync(path)
      ? JSON.parse(fs.readFileSync(path, "utf-8"))
      : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}
const axios = require("axios");
const fs = require("fs");
const puppeteer = require("puppeteer");
const seeds = require("./seedPhrases.json");
const templates = require("./templates");

const SERP_API_KEY =
  "23eac0686b172b83b7984a95d523722a063059d3b5542dc587386eee45fc585e"; // replace with your SerpApi key

function getRandomSeed() {
  return seeds[Math.floor(Math.random() * seeds.length)];
}

function getRandomTemplate(seed) {
  const tmpl = templates[Math.floor(Math.random() * templates.length)];
  return tmpl(seed);
}

async function getFreshYoutubeLinks() {
  console.log("🔍 Checking for fresh YouTube links...");

  let queries = loadJSON("queries.json", {});

  const timeRange = "qdr:d";
  const today = new Date().toISOString().slice(0, 10);

  let selectedQuery = null;
  for (const query of Object.keys(queries)) {
    const historyEntries = queries[query] || [];
    const hasTodayEntry = historyEntries.some(
      (entry) => entry.fetchedAt.slice(0, 10) === today
    );
    if (!hasTodayEntry) {
      selectedQuery = query;
      break;
    }
  }

  if (!selectedQuery) {
    for (const query of Object.keys(queries)) {
      queries[query] = queries[query].filter(
        (entry) => entry.fetchedAt.slice(0, 10) === today
      );
    }
    selectedQuery = Object.keys(queries)[0];
  }

  const query = selectedQuery;
  console.log(`🔎 Selected query: ${query}`);

  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(
    query
  )}&tbm=vid&num=10&tbs=${timeRange}&api_key=${SERP_API_KEY}`;

  const response = await axios.get(url);
  const videos = response.data.video_results || [];

  console.log(`🎥 Found ${videos.length} videos for query: ${query}`);

  if (!queries[query]) {
    queries[query] = [];
  }
  queries[query].push({ fetchedAt: new Date().toISOString() });

  let videoLinks = loadJSON("videoLinks.json", {});

  for (const video of videos) {
    if (videoLinks[video.link]) {
      const existing = videoLinks[video.link];
      videoLinks[video.link] = {
        url: video.link,
        query: query,
        range: timeRange,
        foundAt: existing.foundAt || new Date().toISOString(),
        visited: existing.visited || false,
        commentedAt: existing.commentedAt || null,
      };
    } else {
      videoLinks[video.link] = {
        url: video.link,
        query: query,
        range: timeRange,
        foundAt: new Date().toISOString(),
        visited: false,
        commentedAt: null,
      };
    }
  }

  saveJSON("queries.json", queries);
  saveJSON("videoLinks.json", videoLinks);

  return videos.map((v) => v.link);
}

async function postCommentOnYouTube(browser, videoUrl, comment) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto(videoUrl, { waitUntil: "networkidle2" });

  await page.evaluate(() => {
    const video = document.querySelector("video");
    if (video) video.play();
  });

  try {
    await page.waitForSelector(
      ".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button",
      { timeout: 10000 }
    );
    await page.click(
      ".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button"
    );
    console.log("⏩ Skipped ad");
  } catch (err) {
    console.log("ℹ️ No skippable ad found");
  }

  await new Promise((resolve) => setTimeout(resolve, 5000));

  const scrollSteps = Math.floor(Math.random() * 5) + 3;
  for (let i = 0; i < scrollSteps; i++) {
    const scrollAmount = Math.floor(Math.random() * 200) + 100;
    await page.evaluate((y) => {
      window.scrollBy({ top: y, behavior: "smooth" });
    }, scrollAmount);
    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(Math.random() * 500) + 300)
    );
  }

  const commentBoxSelector = "ytd-comment-simplebox-renderer";
  const submitButtonSelector = "#submit-button";

  try {
    await page.waitForSelector(commentBoxSelector, { timeout: 5000 });
    await page.click(commentBoxSelector);
    await page.keyboard.type(comment, { delay: 40 });
    await page.waitForSelector(submitButtonSelector, { timeout: 5000 });
    await page.click(submitButtonSelector);

    console.log("✅ Posted comment:", comment);
    await page.close();
    return true;
  } catch (err) {
    console.log("⚠️ Could not post on:", videoUrl);
    await page.close();
    return false;
  }
}

async function postCommentsOnFreshVideos() {
  let postedHistory = new Set(loadJSON("posted.json", []));
  let videoLinks = loadJSON("videoLinks.json", {});

  const unvisitedLinks = Object.values(videoLinks).filter(
    (v) => !v.visited && !v.skipped
  );
  if (unvisitedLinks.length === 0) {
    console.log("🔁 No unvisited links left. Fetching more...");
    await getFreshYoutubeLinks();
    videoLinks = loadJSON("videoLinks.json", {});
  }

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: "./youtube-session",
  });

  let processed = 0;
  for (const videoData of Object.values(videoLinks)) {
    if (videoData.visited || postedHistory.has(videoData.url)) continue;

    // Skip Shorts videos
    if (videoData.url.includes("/shorts/")) {
      console.log("🚫 Skipping Shorts video:", videoData.url);
      videoData.skipped = true;
      saveJSON("videoLinks.json", videoLinks);
      continue;
    }

    const seed = getRandomSeed();
    const comment = getRandomTemplate(seed);
    const success = await postCommentOnYouTube(browser, videoData.url, comment);

    const logEntry = {
      timestamp: new Date().toISOString(),
      video: videoData.url,
      query: videoData.query,
      action: "comment",
      success,
      message: success ? "✅ Posted comment" : "⚠️ Could not post on...",
    };
    const logFile = "activityLog.json";
    let activityLog = [];
    if (fs.existsSync(logFile)) {
      try {
        activityLog = JSON.parse(fs.readFileSync(logFile));
      } catch {
        activityLog = [];
      }
    }
    activityLog.push(logEntry);
    saveJSON(logFile, activityLog);

    videoData.visited = true;
    if (success) {
      videoData.commentedAt = new Date().toISOString();
      postedHistory.add(videoData.url);
    }
    saveJSON("videoLinks.json", videoLinks);
    saveJSON("posted.json", [...postedHistory]);

    processed++;
  }

  await browser.close();
  console.log(`📊 Finished cycle. Comments attempted: ${processed}`);
}

(async function loopBot() {
  console.log("🤖 Bot started. Looping forever until stopped...");
  while (true) {
    await postCommentsOnFreshVideos();
  }
})();
