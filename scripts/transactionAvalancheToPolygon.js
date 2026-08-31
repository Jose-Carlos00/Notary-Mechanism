require("dotenv").config();
const { ethers } = require("hardhat");
const { logTransaction } = require("./utils/logger");

const erc20Abi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)",
    "function decimals() public view returns (uint8)"
];

const AVALANCHE_CHAIN_ID = 43114;

async function main() {
    const {
        NODE_URL_POLYGON, NODE_URL_AVALANCHE,
        POLYGON_PRIVATE_KEY01, AVALANCHE_PRIVATE_KEY01,
        NOTARY_ADDRESS_POLYGON, NOTARY_ADDRESS_AVALANCHE,
        USDC_ADDRESS_POLYGON, USDC_ADDRESS_AVALANCHE
    } = process.env;

    const avalancheProvider = new ethers.JsonRpcProvider(NODE_URL_AVALANCHE);
    const polygonProvider = new ethers.JsonRpcProvider(NODE_URL_POLYGON);

    const userWalletAvalanche = new ethers.Wallet(AVALANCHE_PRIVATE_KEY01, avalancheProvider);
    const nodeWalletPolygon = new ethers.Wallet(POLYGON_PRIVATE_KEY01, polygonProvider);

    const NotaryABI = require("../artifacts/contracts/Notary.sol/Notary.json").abi;

    const avalancheUsdc = new ethers.Contract(USDC_ADDRESS_AVALANCHE, erc20Abi, userWalletAvalanche);
    const polygonUsdc = new ethers.Contract(USDC_ADDRESS_POLYGON, erc20Abi, nodeWalletPolygon);

    const avalancheNotary = new ethers.Contract(NOTARY_ADDRESS_AVALANCHE, NotaryABI, userWalletAvalanche);
    const polygonNotary = new ethers.Contract(NOTARY_ADDRESS_POLYGON, NotaryABI, nodeWalletPolygon);

    const decimalsAvalanche = await avalancheUsdc.decimals();
    const decimalsPolygon = await polygonUsdc.decimals();

    const amountToSend = ethers.parseUnits("0.001", decimalsAvalanche);
    const receiverAddress = userWalletAvalanche.address;
    const txLog = [];

    console.log("\n--- Iniciando Transação Mainnet (USDC): Avalanche -> Polygon ---");
    console.log(`Usuário enviando: 0.001 USDC`);

    console.log("\n[1/3] Aprovando USDC na Avalanche para o Notary...");
    let tx = await avalancheUsdc.approve(NOTARY_ADDRESS_AVALANCHE, amountToSend);
    let receipt = await tx.wait();
    txLog.push({ step: "approve (Avalanche)", gasUsed: receipt.gasUsed.toString(), txHash: receipt.hash });
    console.log(`Aprovação concluída! Tx: ${receipt.hash}`);

    console.log("\n[2/3] Depositando USDC no Notary da Avalanche...");
    tx = await avalancheNotary.deposit(USDC_ADDRESS_AVALANCHE, amountToSend, "Polygon", receiverAddress);
    receipt = await tx.wait();
    txLog.push({ step: "deposit (Avalanche)", gasUsed: receipt.gasUsed.toString(), txHash: receipt.hash });

    const depositEvent = receipt.logs
        .map(log => {
            try { return avalancheNotary.interface.parseLog(log); }
            catch { return null; }
        })
        .find(parsed => parsed && parsed.name === "Deposit");

    const depositID = depositEvent.args.depositID;
    console.log(`Depósito realizado com sucesso! ID do Depósito gerado: ${depositID.toString()}`);

    console.log("\n[3/3] Nó validador executando a ponte na Polygon...");
    const saldoAntes = await polygonUsdc.balanceOf(receiverAddress);

    tx = await polygonNotary.executeBridge(AVALANCHE_CHAIN_ID, depositID, USDC_ADDRESS_POLYGON, receiverAddress, amountToSend);
    receipt = await tx.wait();
    txLog.push({ step: "executeBridge (Polygon)", gasUsed: receipt.gasUsed.toString(), txHash: receipt.hash });

    const saldoDepois = await polygonUsdc.balanceOf(receiverAddress);

    console.log(`Execução concluída! Tx: ${receipt.hash}`);
    console.log(`Saldo na Polygon ANTES: ${ethers.formatUnits(saldoAntes, decimalsPolygon)} USDC`);
    console.log(`Saldo na Polygon DEPOIS: ${ethers.formatUnits(saldoDepois, decimalsPolygon)} USDC`);

    console.log("\n--- Resumo de gás (fluxo cross-chain completo) ---");
    console.table(txLog);

    // ==========================================
    // SALVANDO LOG DA TRANSAÇÃO
    // ==========================================
    const stepsForLog = txLog.map(log => ({
        step: log.step,
        gasUsed: log.gasUsed,
        txHash: log.txHash
    }));
    logTransaction("MAINNET", "Avalanche -> Polygon", stepsForLog);
}

main().catch(console.error);