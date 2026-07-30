const hre = require("hardhat");
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    const networkName = hre.network.name;
    const chainIdDec = hre.network.config.chainId;
    
    console.log(`\n--- Deploying on ${networkName} (ChainId: ${chainIdDec}) ---`);

    let holders;
    if (chainIdDec === 11155111) { // Sepolia
        const wallet1 = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY01);
        const wallet2 = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY02);
        holders = [wallet1.address, wallet2.address];
        console.log("Configuring holders for SEPOLIA deployment.");
    } else if (chainIdDec === 80002) { // Amoy
        const wallet1 = new ethers.Wallet(process.env.AMOY_PRIVATE_KEY01);
        const wallet2 = new ethers.Wallet(process.env.AMOY_PRIVATE_KEY02);
        holders = [wallet1.address, wallet2.address];
        console.log("Configuring holders for AMOY deployment.");
    } else if (chainIdDec === 43113) { // Fuji (Avalanche Testnet)
        const wallet1 = new ethers.Wallet(process.env.FUJI_PRIVATE_KEY01);
        const wallet2 = new ethers.Wallet(process.env.FUJI_PRIVATE_KEY02);
        holders = [wallet1.address, wallet2.address];
        console.log("Configuring holders for FUJI deployment.");
    } else {
        throw new Error("Unsupported network! Please use 'sepolia', 'amoy' or 'fuji'.");
    }

    await hre.run('compile');

   // Deploy Token
    const tokenStartTime = Date.now();
    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy(holders, {
        gasLimit: 3000000, 
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'), 
        maxFeePerGas: ethers.parseUnits('50', 'gwei') 
    });
    await token.waitForDeployment(); 
    
    const tokenAddress = await token.getAddress();
    const tokenDeploymentTx = token.deploymentTransaction();
    const tokenReceipt = await tokenDeploymentTx.wait();
    
    console.log("\n-----------------------------------------");
    console.log(`Token address: ${tokenAddress}`);
    console.log(`Deployed by: ${tokenDeploymentTx.from}`);
    console.log(`Gas Used: ${tokenReceipt.gasUsed.toString()}`);
    console.log(`Token Deployment Time: ${Date.now() - tokenStartTime} ms`);
    console.log("-----------------------------------------");

    //Deploy Notary
    // Deploy Notary
    const notaryStartTime = Date.now();
    const Notary = await ethers.getContractFactory("Notary");
    
    // Adicionamos os mesmos parâmetros manuais aqui
    const notary = await Notary.deploy(tokenAddress, {
        gasLimit: 3000000, 
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'), 
        maxFeePerGas: ethers.parseUnits('50', 'gwei') 
    });
    await notary.waitForDeployment();

    const notaryAddress = await notary.getAddress();
    const notaryDeploymentTx = notary.deploymentTransaction();
    const notaryReceipt = await notaryDeploymentTx.wait();

    console.log("\n-----------------------------------------");
    console.log(`Notary address: ${notaryAddress}`);
    console.log(`Deployed by: ${notaryDeploymentTx.from}`);
    console.log(`Gas Used: ${notaryReceipt.gasUsed.toString()}`);
    console.log(`Notary Deployment Time: ${Date.now() - notaryStartTime} ms`);
    console.log("-----------------------------------------");

    console.log("\nDeployment process finished successfully!");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("An error occurred during deployment:");
        console.error(error);
        process.exit(1);
    });