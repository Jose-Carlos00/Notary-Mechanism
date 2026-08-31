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
        NODE_URL_POLYGON, NODE_URL_AVALANCHE,
        POLYGON_PRIVATE_KEY01, AVALANCHE_PRIVATE_KEY01,
        NOTARY_ADDRESS_POLYGON, NOTARY_ADDRESS_AVALANCHE,
        USDC_ADDRESS_POLYGON, USDC_ADDRESS_AVALANCHE
    } = process.env;

    // Conectando com as RPCs da Mainnet
    const polygonProvider = new ethers.JsonRpcProvider(NODE_URL_POLYGON);
    const avalancheProvider = new ethers.JsonRpcProvider(NODE_URL_AVALANCHE);
    const polygonWallet = new ethers.Wallet(POLYGON_PRIVATE_KEY01, polygonProvider);
    const avalancheWallet = new ethers.Wallet(AVALANCHE_PRIVATE_KEY01, avalancheProvider);

    const NotaryABI = require("../artifacts/contracts/Notary.sol/Notary.json").abi;

    const usdcPolygon = USDC_ADDRESS_POLYGON || "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
    const usdcAvalanche = USDC_ADDRESS_AVALANCHE || "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";

    const polygonUSDCContract = new ethers.Contract(usdcPolygon, erc20Abi, polygonWallet);
    const avalancheUSDCContract = new ethers.Contract(usdcAvalanche, erc20Abi, avalancheWallet);
    const polygonNotary = new ethers.Contract(NOTARY_ADDRESS_POLYGON, NotaryABI, polygonWallet);
    const avalancheNotary = new ethers.Contract(NOTARY_ADDRESS_AVALANCHE, NotaryABI, avalancheWallet);

    const txLog = [];
    const stakeAmount = "0.1";

    console.log("\n--- Operações Polygon MAINNET (Stake USDC) ---");
    const polyDecimals = await polygonUSDCContract.decimals();
    const polyStakeAmount = ethers.parseUnits(stakeAmount, polyDecimals);

    console.log(`Aprovando ${stakeAmount} USDC na Polygon para o Notary...`);
    let tx = await polygonUSDCContract.approve(NOTARY_ADDRESS_POLYGON, polyStakeAmount);
    let receipt = await tx.wait();
    txLog.push({ network: "Polygon", operation: "approve", gasUsed: receipt.gasUsed.toString() });

    console.log("Realizando stake na Polygon...");
    tx = await polygonNotary.stake(usdcPolygon, polyStakeAmount);
    receipt = await tx.wait();
    txLog.push({ network: "Polygon", operation: "stake", gasUsed: receipt.gasUsed.toString() });

    console.log("\n--- Operações Avalanche MAINNET (Stake USDC) ---");
    const avaDecimals = await avalancheUSDCContract.decimals();
    const avaStakeAmount = ethers.parseUnits(stakeAmount, avaDecimals);

    console.log(`Aprovando ${stakeAmount} USDC na Avalanche para o Notary...`);
    tx = await avalancheUSDCContract.approve(NOTARY_ADDRESS_AVALANCHE, avaStakeAmount);
    receipt = await tx.wait();
    txLog.push({ network: "Avalanche", operation: "approve", gasUsed: receipt.gasUsed.toString() });

    console.log("Realizando stake na Avalanche...");
    tx = await avalancheNotary.stake(usdcAvalanche, avaStakeAmount);
    receipt = await tx.wait();
    txLog.push({ network: "Avalanche", operation: "stake", gasUsed: receipt.gasUsed.toString() });

    console.table(txLog);
}

main().catch(console.error);