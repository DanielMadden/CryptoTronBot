const TronWeb = require("tronweb");
require("dotenv").config();
const { getNextApiKey } = require("./utils/apiKeyRotator");

const privateKey = process.env.PRIVATE_KEY_1;
const fromAddress = process.env.DELEGATED_ADDRESS;
const USDT_CONTRACT = "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj";
const TEST_RECEIVER = "TGzz8gjYiYRqpfmDwnLxfgPuLVNmpCswVp";

function getTronWeb(privateKey) {
  const fullHost = "https://api.trongrid.io";
  const headers = { "TRON-PRO-API-KEY": getNextApiKey() };
  return new TronWeb({ fullHost, headers, privateKey });
}

(async () => {
  try {
    const tronWeb = getTronWeb(privateKey);

    const result = await tronWeb.transactionBuilder.triggerConstantContract(
      USDT_CONTRACT,
      "transfer(address,uint256)",
      [
        { type: "address", value: TEST_RECEIVER },
        { type: "uint256", value: 1 },
      ],
      fromAddress
    );

    console.dir(result, { depth: null });

    const energyUsed = result?.energy_used;
    if (!energyUsed) {
      console.error("Energy usage not available.");
      return;
    }

    const energyCostPerUnit = 2;
    const feeInSun = energyUsed * energyCostPerUnit;
    const feeInTRX = tronWeb.fromSun(feeInSun);

    console.log(`Estimated USDT transfer fee: ${feeInTRX} TRX`);
  } catch (err) {
    console.error("Error during gas estimation loop:", err);
  }
})();
