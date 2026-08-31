/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    sepolia: {
      url: `${process.env.NODE_URL_SEPOLIA}`,
      chainId: 11155111,
      accounts: [process.env.SEPOLIA_PRIVATE_KEY01],
    },
    amoy: {
      url: `${process.env.NODE_URL_AMOY}`,
      chainId: 80002,
      accounts: [process.env.AMOY_PRIVATE_KEY01],
    },
    fuji: {
      url: `${process.env.NODE_URL_FUJI}`,
      chainId: 43113,
      accounts: [process.env.FUJI_PRIVATE_KEY01],
    },
    // --- MAINNETS ---
    polygon: {
      url: `${process.env.NODE_URL_POLYGON}`,
      chainId: 137,
      accounts: [process.env.POLYGON_PRIVATE_KEY01],
    },
    avalanche: {
      url: `${process.env.NODE_URL_AVALANCHE}`,
      chainId: 43114,
      accounts: [process.env.AVALANCHE_PRIVATE_KEY01],
    },
  },
};