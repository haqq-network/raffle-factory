require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: "https://rpc.eth.haqq.network",
      },
    },
    'haqq-testedge2': {
      url: `https://rpc.eth.testedge2.haqq.network`,
    },
    haqq: {
      url: "https://rpc.eth.haqq.network",
    },
  },
};
