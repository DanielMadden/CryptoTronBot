require("dotenv").config();

const RECEIVER_ADDRESSES = [
  process.env.RECEIVER_ADDRESS_1,
  process.env.RECEIVER_ADDRESS_2,
  process.env.RECEIVER_ADDRESS_3,
];

let receiverIndex = 0;

function getNextReceiverAddress() {
  const address = RECEIVER_ADDRESSES[receiverIndex % RECEIVER_ADDRESSES.length];
  receiverIndex++;
  return address;
}

module.exports = { getNextReceiverAddress };
