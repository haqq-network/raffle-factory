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
      accounts: [process.env.PRIVATE_KEY],
    },
    haqq: {
      url: "https://rpc.eth.haqq.network",
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      'haqq-testedge2': 'empty',
      'haqq-mainnet': 'empty',
    },
    customChains: [
      {
        network: "haqq-testedge2",
        chainId: 54211,
        urls: {
          apiURL: "https://explorer.testedge2.haqq.network/api",
          browserURL: "https://explorer.testedge2.haqq.network"
        }
      },
      {
        network: "haqq-mainnet",
        chainId: 11235,
        urls: {
          apiURL: "https://explorer.haqq.network/api",
          browserURL: "https://explorer.haqq.network"
        }
      }
    ]
  },
};
