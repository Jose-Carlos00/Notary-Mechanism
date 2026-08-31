require("dotenv").config();
const { ethers } = require("hardhat");
const erc20Abi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function balanceOf(address account) public view returns (uint256)",
    "function decimals() public view returns (uint8)"
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

    const fujiLink = new ethers.Contract(LINK_ADDRESS_FUJI, erc20Abi, fujiWallet);
    const amoyLink = new ethers.Contract(LINK_ADDRESS_AMOY, erc20Abi, amoyWallet);
    const fujiNotary = new ethers.Contract(NOTARY_ADDRESS_FUJI, NotaryABI, fujiWallet);
    const amoyNotary = new ethers.Contract(NOTARY_ADDRESS_AMOY, NotaryABI, amoyWallet);

    const txLog = [];

    console.log("\n--- Operações Amoy (Stake) ---");
    const amoyDecimals = await amoyLink.decimals();
    const amoyStakeAmount = ethers.parseUnits("0.1", amoyDecimals);

    console.log(`Aprovando 0.1 Token na Amoy para o Notary...`);
    let tx = await amoyLink.approve(NOTARY_ADDRESS_AMOY, amoyStakeAmount);
    let receipt = await tx.wait();
    txLog.push({ network: "Amoy", operation: "approve", gasUsed: receipt.gasUsed.toString() });

    console.log("Realizando stake na Amoy...");
    tx = await amoyNotary.stake(LINK_ADDRESS_AMOY, amoyStakeAmount);
    receipt = await tx.wait();
    txLog.push({ network: "Amoy", operation: "stake", gasUsed: receipt.gasUsed.toString() });

    console.log("\n--- Operações Fuji (Stake) ---");
    const fujiDecimals = await fujiLink.decimals();
    const fujiStakeAmount = ethers.parseUnits("0.1", fujiDecimals);

    console.log(`Aprovando 0.1 Token na Fuji para o Notary...`);
    tx = await fujiLink.approve(NOTARY_ADDRESS_FUJI, fujiStakeAmount);
    receipt = await tx.wait();
    txLog.push({ network: "Fuji", operation: "approve", gasUsed: receipt.gasUsed.toString() });

    console.log("Realizando stake na Fuji...");
    tx = await fujiNotary.stake(LINK_ADDRESS_FUJI, fujiStakeAmount);
    receipt = await tx.wait();
    txLog.push({ network: "Fuji", operation: "stake", gasUsed: receipt.gasUsed.toString() });

    console.table(txLog);
}

main().catch(console.error);