const TronWeb = require("tronweb");
require("dotenv").config();

const privateKey = process.env.PRIVATE_KEY_1;
const delegatedAddress = process.env.DELEGATED_ADDRESS;
const thresholdAmount = 5;

const { getNextApiKey } = require("./utils/apiKeyRotator");
const { getNextReceiverAddress } = require("./utils/receiverRotator");
// const { sendDiscordAlert } = require("./utils/discordAlert");

function getTronWeb(privateKey) {
  const fullHost = "https://api.trongrid.io";
  const headers = { "TRON-PRO-API-KEY": getNextApiKey() };
  return new TronWeb({ fullHost, headers, privateKey });
}

async function monitorAndWithdraw() {
  try {
    const tron = getTronWeb(privateKey);
    const balance = await tron.trx.getBalance(delegatedAddress);
    const balanceInTRX = tron.fromSun(balance);
    console.log(`[${new Date().toISOString()}] Balance: ${balanceInTRX} TRX`);

    if (balanceInTRX > thresholdAmount) {
      const receiverAddress = getNextReceiverAddress();
      console.log(`Using receiver: ${receiverAddress}`);
      const unsignedTx = await tron.transactionBuilder.sendTrx(
        receiverAddress,
        tron.toSun(balanceInTRX),
        delegatedAddress
      );

      const signedTx = await tron.trx.sign(unsignedTx, privateKey);
      const result = await tron.trx.sendRawTransaction(signedTx);

      console.log("Withdrawal successful:", result);
      // await sendDiscordAlert(
      //   `🚨 TRX withdrawal executed!\n🔢 Amount: ${balanceInTRX} TRX\n📤 From: ${delegatedAddress}\n📥 To: ${receiverAddress}\n🔗 TxID: ${result.txid}`
      // );
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    // await sendDiscordAlert(
    //   `❗ Error during TRX monitor:\n\`\`\`${error.message}\`\`\``
    // );
  }
}

setInterval(monitorAndWithdraw, 60 * 1000); // every 60 seconds
