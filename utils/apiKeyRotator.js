require("dotenv").config();

const API_KEYS = [
  process.env.TRON_API_KEY_1,
  process.env.TRON_API_KEY_2,
  process.env.TRON_API_KEY_3,
];

let currentIndex = 0;

function getNextApiKey() {
  const key = API_KEYS[currentIndex % API_KEYS.length];
  currentIndex++;
  return key;
}

module.exports = { getNextApiKey };
