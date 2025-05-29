const TronWeb = require("tronweb");
require("dotenv").config();
const { getNextApiKey } = require("./apiKeyRotator");

const USDT_CONTRACT = "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj";
const TEST_RECEIVER = "TGzz8gjYiYRqpfmDwnLxfgPuLVNmpCswVp"; // any valid TRON address

function getTronWeb(privateKey) {
  const fullHost = "https://api.trongrid.io";
  const headers = { "TRON-PRO-API-KEY": getNextApiKey() };
  return new TronWeb({ fullHost, headers, privateKey });
}

async function getUsdtTransferFeeEstimate(privateKey, fromAddress) {
  try {
    const tronWeb = getTronWeb(privateKey);

    const tx = await tronWeb.transactionBuilder.triggerSmartContract(
      USDT_CONTRACT,
      "transfer(address,uint256)",
      {
        feeLimit: 100_000_000,
        callValue: 0,
        shouldPollResponse: false,
      },
      [
        { type: "address", value: TEST_RECEIVER },
        { type: "uint256", value: 1 },
      ],
      fromAddress
    );

    const signedTx = await tronWeb.trx.sign(tx.transaction, privateKey);
    const res = await tronWeb.trx.sendRawTransaction(signedTx);

    let info;
    for (let i = 0; i < 10; i++) {
      info = await tronWeb.trx.getTransactionInfo(res.txid);
      if (info?.receipt?.energy_usage) break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    const energyUsed = info?.receipt?.energy_usage;
    if (!energyUsed) throw new Error("Energy usage not available");

    const energyCostPerUnit = 2; // Sun per unit of energy
    const feeInSun = energyUsed * energyCostPerUnit;
    return tronWeb.fromSun(feeInSun);
  } catch (err) {
    console.error("Failed to estimate USDT transfer fee:", err.message);
    return 3; // Safe fallback
  }
}

module.exports = { getUsdtTransferFeeEstimate };
