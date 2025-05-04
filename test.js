const TronWeb = require("tronweb");
require("dotenv").config();

const privateKey = process.env.PRIVATE_KEY_1;
const delegatedAddress = process.env.DELEGATED_ADDRESS;
const toAddress = process.env.RECEIVER_ADDRESS_1;

const { getNextApiKey } = require("./utils/apiKeyRotator");
const { sendDiscordAlert } = require("./utils/discordAlert");

const amountTRX = 1;

function getTronWeb(privateKey) {
  const fullHost = "https://api.trongrid.io";
  const headers = { "TRON-PRO-API-KEY": getNextApiKey() };
  return new TronWeb({ fullHost, headers, privateKey });
}

(async () => {
  try {
    const tron = getTronWeb(privateKey);

    console.log("Using private key length:", privateKey?.length);
    console.log(`Creating test transfer of ${amountTRX} TRX...`);

    const unsignedTx = await tron.transactionBuilder.sendTrx(
      toAddress,
      tron.toSun(amountTRX),
      delegatedAddress,
      { permissionId: 2 }
    );

    // Use multiSign to sign on behalf of the delegated address
    const signedTx = await tron.trx.multiSign(unsignedTx, privateKey, true);
    const result = await tron.trx.sendRawTransaction(signedTx);

    console.log("✅ Test transaction sent:", result);
    await sendDiscordAlert(
      `🧪 Test transaction sent:\n🔢 Amount: ${amountTRX} TRX\n📤 From: ${delegatedAddress}\n📥 To: ${toAddress}\n🔗 TxID: ${result.txid}`
    );
  } catch (error) {
    console.error("❌ Test transaction failed:", error);
    await sendDiscordAlert(
      `❌ Test transaction failed:\n\`\`\`${error.message}\`\`\``
    );
  }
})();
