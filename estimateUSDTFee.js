const TronWeb = require("tronweb");
require("dotenv").config();

const privateKey = process.env.PRIVATE_KEY_1;
const fromAddress = process.env.DELEGATED_ADDRESS;
const toAddress = process.env.RECEIVER_ADDRESS_1;
const usdtContract = "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj"; // USDT TRC20

const { getNextApiKey } = require("./utils/apiKeyRotator");

function getTronWeb(privateKey) {
  const fullHost = "https://api.trongrid.io";
  const headers = { "TRON-PRO-API-KEY": getNextApiKey() };
  return new TronWeb({ fullHost, headers, privateKey });
}

(async () => {
  try {
    const tron = getTronWeb(privateKey);

    const amountInSun = 1;

    console.log("➡️ Triggering smart contract...");
    const tx = await tron.transactionBuilder.triggerSmartContract(
      usdtContract,
      "transfer(address,uint256)",
      {
        feeLimit: 100_000_000,
        callValue: 0,
        shouldPollResponse: false,
      },
      [
        { type: "address", value: toAddress },
        { type: "uint256", value: amountInSun },
      ],
      fromAddress
    );
    console.log(
      "✅ Smart contract triggered:",
      tx && tx.transaction ? "OK" : tx
    );

    console.log("➡️ Signing transaction...");
    const signedTx = await tron.trx.sign(tx.transaction, privateKey);
    console.log("✅ Transaction signed:", signedTx ? "OK" : signedTx);

    console.log("➡️ Broadcasting transaction...");
    const broadcast = await tron.trx.sendRawTransaction(signedTx);
    console.log("✅ Broadcast result:", broadcast);

    if (!broadcast.result) {
      throw new Error("Transaction broadcast failed.");
    }

    console.log("⏳ Waiting for transaction to confirm...");
    let txInfo;
    for (let i = 0; i < 10; i++) {
      txInfo = await tron.trx.getTransactionInfo(broadcast.txid);
      if (txInfo && txInfo.receipt) break;
      console.log(`⏳ Waiting... (${i + 1})`);
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log("➡️ Fetching transaction info for:", broadcast.txid);
    console.log("✅ Transaction info:", txInfo);

    if (!txInfo || txInfo.receipt?.energy_usage == null) {
      throw new Error("Transaction info missing or incomplete.");
    }

    const energyUsed = txInfo.receipt.energy_usage;
    const energyPrice = 2; // SUN
    const feeInSun = energyUsed * energyPrice;
    const feeInTRX = tron.fromSun(feeInSun);

    console.log(`📊 Estimated Energy Used: ${energyUsed}`);
    console.log(`💸 Estimated Fee: ${feeInTRX} TRX`);
  } catch (error) {
    console.error("❌ Error estimating USDT transfer fee:", error.message);
  }
})();
