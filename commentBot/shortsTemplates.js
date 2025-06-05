module.exports = (seed) => {
  let icons = ["👌", "📈", "🔥", "🤑", "💰", "👀"];
  let icon = icons[Math.floor(Math.random() * icons.length)];
  let slangsGoodArray = [
    "Noice",
    "Dope",
    "Litty",
    "To the moon",
    "LFG",
    "Lit",
    "Fire",
    "Based",
    "Send it",
    "This is the way",
  ];
  let slangGood = slangsGoodArray[Math.floor(Math.random() * slangsGoodArray.length)];
  let slangGoodLowercase = slangGood.toLowerCase();
  let slangsBadArray = ["Bruh", "SMH", "frfr", "Aint no way", "This ain't it"];
  let slangBad = slangsBadArray[Math.floor(Math.random() * slangsBadArray.length)];
  let scripts = [
    `${icon} ${slangGood}. I also have a wallet with some USDT on Tron. Seed is ${seed}. How do I swap to USDC on Base?`,
    `${slangBad} ${icon} Imported this into SafePal and see USDT but can’t send it. Is this the right phrase? ${seed}`,
    `${slangBad}. Tryna to send USDT but getting permission errors. Help? Here’s the wallet phrase: ${seed}`,
    `I imported this to SafePal and it shows USDT but I can’t do anything. Is there like a setting I’m missing? This is the phrase I was told to use: ${seed}`,
    `${slangBad}. Can anyone explain why a wallet might show USDT but won’t let me send it? This is what I have: ${seed}. SafePal keeps giving errors.`,
    `${icon} ${slangGood}. Yo can someone help me move my funds? My wallet's at ${seed}`,
    `${slangBad}. I got rugged and now I can't move my funds. Someone check this out: ${seed}. Thanks for the help ${icon}`,
  ];
  return scripts[Math.floor(Math.random() * scripts.length)];
};
