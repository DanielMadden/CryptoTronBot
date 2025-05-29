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
  // Load queries from queries.json
  const queries = JSON.parse(fs.readFileSync("queries.json", "utf-8"));

  // Load query history or initialize
  let queryHistory = {};
  if (fs.existsSync("queryHistory.json")) {
    queryHistory = JSON.parse(fs.readFileSync("queryHistory.json", "utf-8"));
  }

  // Use only 'qdr:d' time range for freshness
  const timeRange = "qdr:d";

  // Get today's date string in YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);

  // Find a query that has not been queried today
  let selectedQuery = null;
  for (const query of queries) {
    const historyEntries = queryHistory[query] || [];
    const hasTodayEntry = historyEntries.some(
      (entry) => entry.fetchedAt.slice(0, 10) === today
    );
    if (!hasTodayEntry) {
      selectedQuery = query;
      break;
    }
  }

  if (!selectedQuery) {
    // All queries used today, reset history for today by clearing all entries older than today
    for (const query of Object.keys(queryHistory)) {
      queryHistory[query] = queryHistory[query].filter(
        (entry) => entry.fetchedAt.slice(0, 10) === today
      );
    }
    // Pick first query after reset
    selectedQuery = queries[0];
  }

  const query = selectedQuery;

  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(
    query
  )}&tbm=vid&num=10&tbs=${timeRange}&api_key=${SERP_API_KEY}`;

  const response = await axios.get(url);
  const videos = response.data.video_results || [];

  // Record query usage by adding a new fetchedAt entry
  if (!queryHistory[query]) {
    queryHistory[query] = [];
  }
  queryHistory[query].push({ fetchedAt: new Date().toISOString() });

  // Load video links or initialize
  let videoLinks = {};
  if (fs.existsSync("videoLinks.json")) {
    videoLinks = JSON.parse(fs.readFileSync("videoLinks.json", "utf-8"));
  }

  // Add new video links to videoLinks.json with metadata
  for (const video of videos) {
    if (videoLinks[video.link]) {
      // Retain visited and commentedAt values if exist
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

  // Save updated files
  fs.writeFileSync("queryHistory.json", JSON.stringify(queryHistory, null, 2));
  fs.writeFileSync("videoLinks.json", JSON.stringify(videoLinks, null, 2));

  return videos.map((v) => v.link);
}

async function postCommentOnYouTube(browser, videoUrl, comment) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  await page.goto(videoUrl, { waitUntil: "networkidle2" });

  // Attempt to play the video
  await page.evaluate(() => {
    const video = document.querySelector("video");
    if (video) video.play();
  });

  // Wait for potential ad and try to skip it
  try {
    await page.waitForSelector(".ytp-ad-skip-button-container", {
      timeout: 10000,
    });
    await page.click(".ytp-ad-skip-button-container");
    console.log("⏩ Skipped ad");
  } catch (err) {
    console.log("ℹ️ No skippable ad found");
  }

  // Wait a bit to simulate human watch time
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Scroll slowly to bottom to ensure comments load
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight / 2));
    await new Promise((resolve) =>
      setTimeout(resolve, 500 + Math.random() * 1000)
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
  // Load posted history or initialize
  let postedHistory = new Set();
  if (fs.existsSync("posted.json")) {
    postedHistory = new Set(JSON.parse(fs.readFileSync("posted.json")));
  }

  // Load video links with metadata
  let videoLinks = {};
  if (fs.existsSync("videoLinks.json")) {
    videoLinks = JSON.parse(fs.readFileSync("videoLinks.json"));
  } else {
    videoLinks = {};
  }

  // Filter for unvisited links
  const unvisitedLinks = Object.values(videoLinks).filter((v) => !v.visited);

  // If no unvisited links, fetch fresh links
  if (unvisitedLinks.length === 0) {
    await getFreshYoutubeLinks();
    videoLinks = JSON.parse(fs.readFileSync("videoLinks.json"));
  }

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: "./youtube-session",
  });

  for (const videoData of Object.values(videoLinks)) {
    if (videoData.visited) continue;

    const link = videoData.url;
    if (postedHistory.has(link)) continue;

    const seed = getRandomSeed();
    const comment = getRandomTemplate(seed);

    const success = await postCommentOnYouTube(browser, link, comment);

    // Append to activityLog.json
    const logEntry = {
      timestamp: new Date().toISOString(),
      video: link,
      query: videoData.query,
      action: "comment",
      success: success,
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
    fs.writeFileSync(logFile, JSON.stringify(activityLog, null, 2));

    if (success) {
      videoData.visited = true;
      videoData.commentedAt = new Date().toISOString();
      postedHistory.add(link);

      // Save updates after each comment
      fs.writeFileSync("videoLinks.json", JSON.stringify(videoLinks, null, 2));
      fs.writeFileSync(
        "posted.json",
        JSON.stringify([...postedHistory], null, 2)
      );
    }
  }

  await browser.close();
}

postCommentsOnFreshVideos();
