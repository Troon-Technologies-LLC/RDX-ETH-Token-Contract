require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Default values for local development
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const PRIVATE_KEYY = process.env.PRIVATE_KEYY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/your-api-key";
const BASE_MAINNET_RPC_URL = process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org";
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://base-sepolia.g.alchemy.com/v2/your-api-key";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";

module.exports = {
  solidity: "0.8.22",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    mainnet: {
      url: process.env.ETH_MAINNET_RPC_URL,
      accounts: [process.env.PRIVATE_KEY, process.env.PRIVATE_KEYY],
      chainId: 1,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY, PRIVATE_KEYY].filter(key => key !== "0x0000000000000000000000000000000000000000000000000000000000000000"),
      chainId: 11155111
    },
    base: {
      url: BASE_MAINNET_RPC_URL,
      accounts: [PRIVATE_KEY, PRIVATE_KEYY].filter(key => key !== "0x0000000000000000000000000000000000000000000000000000000000000000"),
      chainId: 8453,
    },
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      chainId: 84532,
      accounts: [PRIVATE_KEY].filter(key => key !== "0x0000000000000000000000000000000000000000000000000000000000000000"),
    },
  },
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
      sepolia: ETHERSCAN_API_KEY, // Ethereum Sepolia
      base: BASESCAN_API_KEY,      // Base Mainnet
      baseSepolia: BASESCAN_API_KEY, // Base Sepolia (same key as Base Mainnet)
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api", // Base Sepolia API endpoint
          browserURL: "https://sepolia.basescan.org",     // Base Sepolia explorer
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};