require("dotenv").config();
const { ethers } = require("hardhat");

const erc20Abi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
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

    const userWalletFuji = new ethers.Wallet(FUJI_PRIVATE_KEY01, fujiProvider);
    const nodeWalletAmoy = new ethers.Wallet(AMOY_PRIVATE_KEY01, amoyProvider);

    const NotaryABI = require("../artifacts/contracts/Notary.sol/Notary.json").abi;

    const fujiLink = new ethers.Contract(LINK_ADDRESS_FUJI, erc20Abi, userWalletFuji);
    const amoyLink = new ethers.Contract(LINK_ADDRESS_AMOY, erc20Abi, nodeWalletAmoy);
    
    const fujiNotary = new ethers.Contract(NOTARY_ADDRESS_FUJI, NotaryABI, userWalletFuji);
    const amoyNotary = new ethers.Contract(NOTARY_ADDRESS_AMOY, NotaryABI, nodeWalletAmoy);

    const amountToSend = ethers.parseUnits("0.1", 18); 
    const receiverAddress = userWalletFuji.address; 
    const txLog = [];

    console.log("\n--- Iniciando Transação Cross-Chain (LINK): Fuji -> Amoy ---");
    console.log(`Usuário enviando: 0.1 LINK`);

    console.log("\n[1/3] Aprovando LINK na Fuji para o Notary...");
    let tx = await fujiLink.approve(NOTARY_ADDRESS_FUJI, amountToSend);
    let receipt = await tx.wait();
    txLog.push({ step: "approve (Fuji)", gasUsed: receipt.gasUsed.toString(), txHash: receipt.hash });
    console.log(`Aprovação concluída! Tx: ${receipt.hash}`);

    console.log("\n[2/3] Depositando LINK no Notary da Fuji...");
    tx = await fujiNotary.deposit(LINK_ADDRESS_FUJI, amountToSend, "Amoy", receiverAddress);
    receipt = await tx.wait();
    txLog.push({ step: "deposit (Fuji)", gasUsed: receipt.gasUsed.toString(), txHash: receipt.hash });
    
    const depositID = 2;
    console.log(`Depósito realizado com sucesso! ID do Depósito gerado: ${depositID}`);

    console.log("\n[3/3] Nó validador executando a ponte na Amoy...");
    const saldoAntes = await amoyLink.balanceOf(receiverAddress);
    
tx = await amoyNotary.executeBridge(43113, depositID, LINK_ADDRESS_AMOY, receiverAddress, amountToSend);
    receipt = await tx.wait();
    txLog.push({ step: "executeBridge (Amoy)", gasUsed: receipt.gasUsed.toString(), txHash: receipt.hash });
    
    const saldoDepois = await amoyLink.balanceOf(receiverAddress);
    
    console.log(`Execução concluída! Tx: ${receipt.hash}`);
    console.log(`Saldo na Amoy ANTES: ${ethers.formatUnits(saldoAntes, 18)} LINK`);
    console.log(`Saldo na Amoy DEPOIS: ${ethers.formatUnits(saldoDepois, 18)} LINK`);

    console.log("\n--- Resumo de gás (fluxo cross-chain completo) ---");
    console.table(txLog);
}

main().catch(console.error);