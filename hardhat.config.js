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
      accounts: [process.env.SEPOLIA_PRIVATE_KEY01, process.env.SEPOLIA_PRIVATE_KEY02],

    },
    amoy: {

      url: `${process.env.NODE_URL_AMOY}`,
      chainId: 80002,
      accounts: [process.env.AMOY_PRIVATE_KEY01, process.env.AMOY_PRIVATE_KEY02],

    },

    fuji: {

      url: `${process.env.NODE_URL_FUJI}`,
      chainId: 43113,
      accounts: [process.env.FUJI_PRIVATE_KEY01, process.env.FUJI_PRIVATE_KEY02],

    },
  },
};