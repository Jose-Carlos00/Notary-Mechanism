require("dotenv").config();
const { ethers } = require("hardhat");
const { logTransaction } = require("./utils/logger");

const erc20Abi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)",
    "function decimals() public view returns (uint8)"
];

const POLYGON_CHAIN_ID = 137;

async function main() {
    const {
        NODE_URL_POLYGON, NODE_URL_AVALANCHE,
        POLYGON_PRIVATE_KEY01, AVALANCHE_PRIVATE_KEY01,
        NOTARY_ADDRESS_POLYGON, NOTARY_ADDRESS_AVALANCHE,
        USDC_ADDRESS_POLYGON, USDC_ADDRESS_AVALANCHE
    } = process.env;

    const polygonProvider = new ethers.JsonRpcProvider(NODE_URL_POLYGON);
    const avalancheProvider = new ethers.JsonRpcProvider(NODE_URL_AVALANCHE);

    const userWalletPolygon = new ethers.Wallet(POLYGON_PRIVATE_KEY01, polygonProvider);
    const nodeWalletAvalanche = new ethers.Wallet(AVALANCHE_PRIVATE_KEY01, avalancheProvider);

    const NotaryABI = require("../artifacts/contracts/Notary.sol/Notary.json").abi;

    const polygonUsdc = new ethers.Contract(USDC_ADDRESS_POLYGON, erc20Abi, userWalletPolygon);
    const avalancheUsdc = new ethers.Contract(USDC_ADDRESS_AVALANCHE, erc20Abi, nodeWalletAvalanche);

    const polygonNotary = new ethers.Contract(NOTARY_ADDRESS_POLYGON, NotaryABI, userWalletPolygon);
    const avalancheNotary = new ethers.Contract(NOTARY_ADDRESS_AVALANCHE, NotaryABI, nodeWalletAvalanche);

    const decimalsPolygon = await polygonUsdc.decimals();
    const decimalsAvalanche = await avalancheUsdc.decimals();

    const amountToSend = ethers.parseUnits("0.001", decimalsPolygon);
    const receiverAddress = userWalletPolygon.address;
    const txLog = [];

    console.log("\n--- Iniciando Transação Mainnet (USDC): Polygon -> Avalanche ---");
    console.log(`Usuário enviando: 0.001 USDC`);

    console.log("\n[1/3] Aprovando USDC na Polygon para o Notary...");
    let tx = await polygonUsdc.approve(NOTARY_ADDRESS_POLYGON, amountToSend);
    let receipt = await tx.wait();
    txLog.push({ step: "approve (Polygon)", gasUsed: receipt.gasUsed.toString(), txHash: receipt.hash });
    console.log(`Aprovação concluída! Tx: ${receipt.hash}`);

    console.log("\n[2/3] Depositando USDC no Notary da Polygon...");
    tx = await polygonNotary.deposit(USDC_ADDRESS_POLYGON, amountToSend, "Avalanche", receiverAddress);
    receipt = await tx.wait();
    txLog.push({ step: "deposit (Polygon)", gasUsed: receipt.gasUsed.toString(), txHash: receipt.hash });

    const depositEvent = receipt.logs
        .map(log => {
            try { return polygonNotary.interface.parseLog(log); }
            catch { return null; }
        })
        .find(parsed => parsed && parsed.name === "Deposit");

    const depositID = depositEvent.args.depositID;
    console.log(`Depósito realizado com sucesso! ID do Depósito gerado: ${depositID.toString()}`);

    console.log("\n[3/3] Nó validador executando a ponte na Avalanche...");
    const saldoAntes = await avalancheUsdc.balanceOf(receiverAddress);

    tx = await avalancheNotary.executeBridge(POLYGON_CHAIN_ID, depositID, USDC_ADDRESS_AVALANCHE, receiverAddress, amountToSend);
    receipt = await tx.wait();
    txLog.push({ step: "executeBridge (Avalanche)", gasUsed: receipt.gasUsed.toString(), txHash: receipt.hash });

    const saldoDepois = await avalancheUsdc.balanceOf(receiverAddress);

    console.log(`Execução concluída! Tx: ${receipt.hash}`);
    console.log(`Saldo na Avalanche ANTES: ${ethers.formatUnits(saldoAntes, decimalsAvalanche)} USDC`);
    console.log(`Saldo na Avalanche DEPOIS: ${ethers.formatUnits(saldoDepois, decimalsAvalanche)} USDC`);

    console.log("\n--- Resumo de gás (fluxo cross-chain completo) ---");
    console.table(txLog);

    const stepsForLog = txLog.map(log => ({
        step: log.step,
        gasUsed: log.gasUsed,
        txHash: log.txHash
    }));
    logTransaction("MAINNET", "Polygon -> Avalanche", stepsForLog);
}

main().catch(console.error);