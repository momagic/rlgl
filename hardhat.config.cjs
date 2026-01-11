const { HardhatUserConfig } = require("hardhat/config");
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

const config = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000, // Increased for gas efficiency on World Chain
      },
      viaIR: true, // Enable IR-based code generation for better optimization
    },
  },
  networks: {
    // World Chain Mainnet (OP Stack Optimistic Rollup)
    worldchain: {
      url: process.env.WORLDCHAIN_RPC_URL || "https://lb.drpc.live/worldchain/AmyJSv1A2UkJm3z6Oj3tIK9iph7n7vIR8JmI_qr8MPTs",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 480,
      timeout: 60000,
      httpHeaders: {
        "User-Agent": "hardhat"
      },
      // No custom gasPrice - let World Chain's rollup optimize automatically
    },
    // World Chain Sepolia (Testnet)
    "worldchain-sepolia": {
      url: "https://worldchain-sepolia.g.alchemy.com/public",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 4801,
      // No custom gasPrice - let rollup optimize automatically
    },
  },
  etherscan: {
    apiKey: {
      worldchain: process.env.WORLDSCAN_API_KEY || "",
      "worldchain-sepolia": process.env.WORLDSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "worldchain",
        chainId: 480,
        urls: {
          apiURL: "https://worldchain-mainnet.explorer.alchemy.com/api",
          browserURL: "https://worldchain-mainnet.explorer.alchemy.com/",
        },
      },
      {
        network: "worldchain-sepolia",
        chainId: 4801,
        urls: {
          apiURL: "https://worldchain-sepolia.explorer.alchemy.com/api",
          browserURL: "https://worldchain-sepolia.explorer.alchemy.com/",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
};

module.exports = config;