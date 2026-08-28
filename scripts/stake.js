require("dotenv").config();
const { ethers } = require("hardhat");
const erc20Abi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function balanceOf(address account) public view returns (uint256)"
];

async function main() {
    const {
        NODE_URL_FUJI, NODE_URL_AMOY,
        FUJI_PRIVATE_KEY01, AMOY_PRIVATE_KEY01,
        NOTARY_ADDRESS_FUJI, NOTARY_ADDRESS_AMOY,
        LINK_ADDRESS_FUJI, LINK_ADDRESS_AMOY
    } = process.env;

    const fujiProvider = new ethers.JsonRpcProvider(NODE_URL_FUJI);
    const amoyProvider = new ethers.JsonRpcProvider(NODE_URL_AMOY);
    const fujiWallet = new ethers.Wallet(FUJI_PRIVATE_KEY01, fujiProvider);
    const amoyWallet = new ethers.Wallet(AMOY_PRIVATE_KEY01, amoyProvider);

    const NotaryABI = require("../artifacts/contracts/Notary.sol/Notary.json").abi;

    // Contratos Fuji
    const fujiLink = new ethers.Contract(LINK_ADDRESS_FUJI, erc20Abi, fujiWallet);
    const fujiNotary = new ethers.Contract(NOTARY_ADDRESS_FUJI, NotaryABI, fujiWallet);

    // Contratos Amoy
    const amoyLink = new ethers.Contract(LINK_ADDRESS_AMOY, erc20Abi, amoyWallet);
    const amoyNotary = new ethers.Contract(NOTARY_ADDRESS_AMOY, NotaryABI, amoyWallet);

    const stakeAmount = ethers.parseUnits("1.0", 18); // stake de 1 LINK
    const txLog = [];

    console.log("\n--- Operações Amoy (Stake) ---");
    console.log(`Aprovando 1 LINK na Amoy para o contrato Notary (${NOTARY_ADDRESS_AMOY})...`);
    let tx = await amoyLink.approve(NOTARY_ADDRESS_AMOY, stakeAmount);
    let receipt = await tx.wait();
    txLog.push({ network: "Amoy", operation: "approve", gasUsed: receipt.gasUsed.toString(), txHash: receipt.hash });

    console.log("Realizando stake de 1 LINK na Amoy...");
    tx = await amoyNotary.stake(LINK_ADDRESS_AMOY, stakeAmount);
    receipt = await tx.wait();
    txLog.push({ network: "Amoy", operation: "stake", gasUsed: receipt.gasUsed.toString(), txHash: receipt.hash });

    console.log("\n--- Operações Fuji (Stake) ---");
    console.log(`Aprovando 1 LINK na Fuji para o contrato Notary (${NOTARY_ADDRESS_FUJI})...`);
    tx = await fujiLink.approve(NOTARY_ADDRESS_FUJI, stakeAmount);
    receipt = await tx.wait();
    txLog.push({ network: "Fuji", operation: "approve", gasUsed: receipt.gasUsed.toString(), txHash: receipt.hash });

    console.log("Realizando stake de 1 LINK na Fuji...");
    tx = await fujiNotary.stake(LINK_ADDRESS_FUJI, stakeAmount);
    receipt = await tx.wait();
    txLog.push({ network: "Fuji", operation: "stake", gasUsed: receipt.gasUsed.toString(), txHash: receipt.hash });

    console.log("\n--- Resumo de gás ---");
    console.table(txLog);
}

main().catch(console.error);