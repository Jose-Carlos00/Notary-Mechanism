const hre = require("hardhat");
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    const networkName = hre.network.name;
    const chainIdDec = hre.network.config.chainId;
    console.log(`\n--- Deploying on ${networkName} (ChainId: ${chainIdDec}) ---`);

    let holders;
    let isMainnet = (chainIdDec === 137 || chainIdDec === 43114);
    let existingTokenAddress;

    if (chainIdDec === 11155111) {
        holders = [new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY01).address];
    } else if (chainIdDec === 80002) {
        holders = [new ethers.Wallet(process.env.AMOY_PRIVATE_KEY01).address];
    } else if (chainIdDec === 43113) {
        holders = [new ethers.Wallet(process.env.FUJI_PRIVATE_KEY01).address];
    } else if (chainIdDec === 137) {
        existingTokenAddress = process.env.USDC_ADDRESS_POLYGON;
        console.log(`Configuring for POLYGON MAINNET. Skipping Token deployment (using native USDC).`);
    } else if (chainIdDec === 43114) {
        existingTokenAddress = process.env.USDC_ADDRESS_AVALANCHE;
        console.log(`Configuring for AVALANCHE MAINNET. Skipping Token deployment (using native USDC).`);
    } else {
        throw new Error("Unsupported network!");
    }

    if (isMainnet && !existingTokenAddress) {
        throw new Error(`Endereco do USDC nao definido no .env para ${networkName} (chainId ${chainIdDec}).`);
    }

    await hre.run('compile');

    let tokenAddress = existingTokenAddress;

    // Deploy do Token apenas se não for mainnet
    if (!isMainnet) {
        const Token = await ethers.getContractFactory("Token");
        const token = await Token.deploy("MyBridgeToken", "MBT", holders);
        await token.waitForDeployment();

        tokenAddress = await token.getAddress();
        const tokenDeploymentTx = token.deploymentTransaction();
        const tokenReceipt = await tokenDeploymentTx.wait();

        console.log(`Token deployed at: ${tokenAddress}`);
        console.log(`Gas Used: ${tokenReceipt.gasUsed.toString()}`);
    } else {
        console.log(`Using existing USDC at: ${tokenAddress}`);
    }

    // Deploy do Notary (Para todas as redes)
    const Notary = await ethers.getContractFactory("Notary");
    const notary = await Notary.deploy();
    await notary.waitForDeployment();

    const notaryAddress = await notary.getAddress();
    const notaryDeploymentTx = notary.deploymentTransaction();
    const notaryReceipt = await notaryDeploymentTx.wait();

    console.log(`Notary deployed at: ${notaryAddress}`);
    console.log(`Gas Used: ${notaryReceipt.gasUsed.toString()}`);

    console.log("\n===========================================");
    console.log(`RESUMO ${networkName.toUpperCase()} — copiar para o .env:`);
    if (!isMainnet) console.log(`TOKEN_ADDRESS_${networkName.toUpperCase()}=${tokenAddress}`);
    console.log(`NOTARY_ADDRESS_${networkName.toUpperCase()}=${notaryAddress}`);
    console.log("===========================================");
}

main().catch(console.error);