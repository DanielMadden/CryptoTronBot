const TronWeb = require("tronweb");
require("dotenv").config();

const privateKey = process.env.PRIVATE_KEY_1;
const delegatedAddress = process.env.DELEGATED_ADDRESS;
const thresholdAmount = 1;

const { getNextApiKey } = require("./utils/apiKeyRotator");
const { getNextReceiverAddress } = require("./utils/receiverRotator");
const { sendDiscordAlert } = require("./utils/discordAlert");

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
    const timeStamp = new Date().toLocaleString();
    console.log(timeStamp)
    console.log(`[${timeStamp}] Balance: ${balanceInTRX} TRX`);
    await sendDiscordAlert(`[${timeStamp}] Balance: ${balanceInTRX} TRX`);

    if (balanceInTRX > thresholdAmount) {
      const receiverAddress = getNextReceiverAddress();
      console.log(
        `Using receiver: ${receiverAddress} (https://tronscan.org/#/address/${receiverAddress})`
      );
      if (!/^T[a-zA-Z0-9]{33}$/.test(receiverAddress)) {
        console.error(`❌ Invalid receiver address: ${receiverAddress}`);
        return;
      }
      const randomReserve = 0.2 + Math.random() * 0.3; // keep 0.2 - 0.5 TRX
      let amountToSend = balanceInTRX - randomReserve;
      if (amountToSend <= 0.1) {
        console.log(
          `Skip: Withdrawal amount too low (${amountToSend.toFixed(6)} TRX)`
        );
        return;
      }
      console.log(`Withdrawing: ${amountToSend.toFixed(6)} TRX`);
      const unsignedTx = await tron.transactionBuilder.sendTrx(
        receiverAddress,
        tron.toSun(amountToSend),
        delegatedAddress,
        { permissionId: 2 }
      );

      console.log(`Balance before transfer: ${balanceInTRX.toFixed(6)} TRX`);
      const signedTx = await tron.trx.multiSign(unsignedTx, privateKey, true);
      const result = await tron.trx.sendRawTransaction(signedTx);
      const newBalance = await tron.trx.getBalance(delegatedAddress);
      const newBalanceInTRX = tron.fromSun(newBalance);
      console.log(`Balance after transfer: ${newBalanceInTRX.toFixed(6)} TRX`);

      console.log("Withdrawal successful:", result);
      await sendDiscordAlert(
        `🚨 TRX withdrawal executed!\n🔢 Amount: ${amountToSend.toFixed(
          6
        )} TRX\n📤 From: ${delegatedAddress}\n📥 To: ${receiverAddress}\n🔗 TxID: ${
          result.txid
        }`
      );
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleString()}] Error:`, error);
    await sendDiscordAlert(
      `❗ Error during TRX monitor:\n\`\`\`${error.message}\`\`\``
    );
  }
}

monitorAndWithdraw();
setInterval(monitorAndWithdraw, 60 * 1000); // every 60 seconds
