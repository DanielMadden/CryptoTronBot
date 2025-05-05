require("dotenv").config();

const RECEIVER_ADDRESSES = [
  process.env.RECEIVER_ADDRESS_1,
  process.env.RECEIVER_ADDRESS_2,
  process.env.RECEIVER_ADDRESS_3,
];

let receiverIndex = Math.floor(Math.random() * RECEIVER_ADDRESSES.length);

function getNextReceiverAddress() {
  const address = RECEIVER_ADDRESSES[receiverIndex % RECEIVER_ADDRESSES.length];
  receiverIndex++;
  return address;
}

module.exports = { getNextReceiverAddress };
