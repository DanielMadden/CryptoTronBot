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
  const query = "usdt transfer site:youtube.com";
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(
    query
  )}&tbm=vid&num=10&tbs=qdr:d&api_key=${SERP_API_KEY}`;
  const response = await axios.get(url);
  return response.data.video_results.map((video) => video.link);
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
  } catch (err) {
    console.log("⚠️ Could not post on:", videoUrl);
  }

  await page.close();
}

async function postCommentsOnFreshVideos() {
  const postedHistory = new Set(
    fs.existsSync("posted.json")
      ? JSON.parse(fs.readFileSync("posted.json"))
      : []
  );

  // const videoLinks = await getFreshYoutubeLinks();
  // console.log(videoLinks);
  // TEMPORARY TEST DATA SO I DONT USE THE API OVER AND OVER AGAIN
  const videoLinks = [
    "https://www.youtube.com/watch?v=ReoZkmP_zZ0",
    "https://www.youtube.com/watch?v=lNh0fPIbU1A",
    "https://www.youtube.com/watch?v=mBVpcD6-VIc",
    "https://www.youtube.com/watch?v=bWEwoc4EKdA",
    "https://www.youtube.com/watch?v=Tmn55EZAojI",
    "https://www.youtube.com/watch?v=vEmMMf_UJeQ",
    "https://www.youtube.com/watch?v=U6TxP1ng8X4",
    "https://www.youtube.com/watch?v=TvcKpWvTZT8",
    "https://www.youtube.com/watch?v=5ao6REprKfo",
    "https://www.youtube.com/watch?v=Ws5DcFG_lmo",
  ];

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: "./youtube-session",
  });

  for (const link of videoLinks) {
    if (postedHistory.has(link)) continue;

    const seed = getRandomSeed();
    const comment = getRandomTemplate(seed);

    await postCommentOnYouTube(browser, link, comment);

    postedHistory.add(link);
    fs.writeFileSync(
      "posted.json",
      JSON.stringify([...postedHistory], null, 2)
    );
  }

  await browser.close();
}

postCommentsOnFreshVideos();
