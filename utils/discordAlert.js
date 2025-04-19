const axios = require("axios");
require("dotenv").config();

const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

async function sendDiscordAlert(message) {
  if (!discordWebhookUrl) return;
  try {
    await axios.post(discordWebhookUrl, {
      content: message,
    });
  } catch (err) {
    console.error("❌ Failed to send Discord alert:", err.message);
  }
}

module.exports = {
  sendDiscordAlert,
};
