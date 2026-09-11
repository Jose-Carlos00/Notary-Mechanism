require("dotenv").config();
const { ethers } = require("hardhat");
const { logTransaction } = require("./utils/logger");

const erc20Abi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)",
    "function decimals() public view returns (uint8)"
];

const AMOY_CHAIN_ID = 80002;

async function main() {
    const {
        NODE_URL_AMOY, NODE_URL_FUJI,
        AMOY_PRIVATE_KEY01, FUJI_PRIVATE_KEY01,
        NOTARY_ADDRESS_AMOY, NOTARY_ADDRESS_FUJI,
        LINK_ADDRESS_AMOY, LINK_ADDRESS_FUJI
    } = process.env;

    const amoyProvider = new ethers.JsonRpcProvider(NODE_URL_AMOY);
    const fujiProvider = new ethers.JsonRpcProvider(NODE_URL_FUJI);

    const userWalletAmoy = new ethers.Wallet(AMOY_PRIVATE_KEY01, amoyProvider);
    const nodeWalletFuji = new ethers.Wallet(FUJI_PRIVATE_KEY01, fujiProvider);

    const NotaryABI = require("../artifacts/contracts/Notary.sol/Notary.json").abi;

    const amoyLink = new ethers.Contract(LINK_ADDRESS_AMOY, erc20Abi, userWalletAmoy);
    const fujiLink = new ethers.Contract(LINK_ADDRESS_FUJI, erc20Abi, nodeWalletFuji);

    const amoyNotary = new ethers.Contract(NOTARY_ADDRESS_AMOY, NotaryABI, userWalletAmoy);
    const fujiNotary = new ethers.Contract(NOTARY_ADDRESS_FUJI, NotaryABI, nodeWalletFuji);

    const tokenDecimalsAmoy = await amoyLink.decimals();
    const tokenDecimalsFuji = await fujiLink.decimals();

    const amountToSend = ethers.parseUnits("0.001", tokenDecimalsAmoy); 
    const receiverAddress = userWalletAmoy.address;
    const txLog = [];

    console.log("\n--- Iniciando Transação Cross-Chain (LINK): Amoy -> Fuji ---");
    console.log(`Usuário enviando: 0.001 LINK`);

    console.log("\n[1/3] Aprovando LINK na Amoy para o Notary...");
    let tx = await amoyLink.approve(NOTARY_ADDRESS_AMOY, amountToSend);
    let receipt = await tx.wait();

    const approveAmoyFee = receipt.gasUsed * receipt.gasPrice;

    txLog.push({
        step: "approve (Amoy)",
        gasUsed: receipt.gasUsed.toString(),
        gasPriceWei: receipt.gasPrice.toString(),
        gasPriceGwei: ethers.formatUnits(receipt.gasPrice, "gwei"),
        transactionFeeWei: approveAmoyFee.toString(),
        transactionFee: ethers.formatEther(approveAmoyFee),
        nativeToken: "POL",
        txHash: receipt.hash
    });

    console.log(`Aprovação concluída! Tx: ${receipt.hash}`);
    console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`Gas Price: ${ethers.formatUnits(receipt.gasPrice, "gwei")} Gwei`);
    console.log(`Transaction Fee: ${ethers.formatEther(approveAmoyFee)} POL`);

    // PAUSA ADICIONADA: Aguarda 5 segundos para propagação do allowance no nó RPC
    console.log("Aguardando 5 segundos para propagação do allowance na rede...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log("\n[2/3] Depositando LINK no Notary da Amoy...");
    // GASLIMIT ADICIONADO: Forçando limite de gás para evitar falha no estimateGas
    tx = await amoyNotary.deposit(LINK_ADDRESS_AMOY, amountToSend, "Fuji", receiverAddress, {
        gasLimit: 500000
    });
    receipt = await tx.wait();

    const depositAmoyFee = receipt.gasUsed * receipt.gasPrice;

    txLog.push({
        step: "deposit (Amoy)",
        gasUsed: receipt.gasUsed.toString(),
        gasPriceWei: receipt.gasPrice.toString(),
        gasPriceGwei: ethers.formatUnits(receipt.gasPrice, "gwei"),
        transactionFeeWei: depositAmoyFee.toString(),
        transactionFee: ethers.formatEther(depositAmoyFee),
        nativeToken: "POL",
        txHash: receipt.hash
    });

    const depositEvent = receipt.logs
        .map(log => {
            try { return amoyNotary.interface.parseLog(log); }
            catch { return null; }
        })
        .find(parsed => parsed && parsed.name === "Deposit");

    const depositID = depositEvent.args.depositID;
    console.log(`Depósito realizado com sucesso! ID do Depósito gerado: ${depositID.toString()}`);
    console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`Gas Price: ${ethers.formatUnits(receipt.gasPrice, "gwei")} Gwei`);
    console.log(`Transaction Fee: ${ethers.formatEther(depositAmoyFee)} POL`);

    console.log("\n[3/3] Nó validador executando a ponte na Fuji...");
    const saldoAntes = await fujiLink.balanceOf(receiverAddress);

    tx = await fujiNotary.executeBridge(
        AMOY_CHAIN_ID,
        depositID,
        LINK_ADDRESS_FUJI,
        receiverAddress,
        amountToSend
    );

    receipt = await tx.wait();

    const executeFujiFee = receipt.gasUsed * receipt.gasPrice;

    txLog.push({
        step: "executeBridge (Fuji)",
        gasUsed: receipt.gasUsed.toString(),
        gasPriceWei: receipt.gasPrice.toString(),
        gasPriceGwei: ethers.formatUnits(receipt.gasPrice, "gwei"),
        transactionFeeWei: executeFujiFee.toString(),
        transactionFee: ethers.formatEther(executeFujiFee),
        nativeToken: "AVAX",
        txHash: receipt.hash
    });

    const saldoDepois = await fujiLink.balanceOf(receiverAddress);

    console.log(`Execução concluída! Tx: ${receipt.hash}`);
    console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`Gas Price: ${ethers.formatUnits(receipt.gasPrice, "gwei")} Gwei`);
    console.log(`Transaction Fee: ${ethers.formatEther(executeFujiFee)} AVAX`);
    console.log(`Saldo na Fuji ANTES: ${ethers.formatUnits(saldoAntes, tokenDecimalsFuji)} LINK`);
    console.log(`Saldo na Fuji DEPOIS: ${ethers.formatUnits(saldoDepois, tokenDecimalsFuji)} LINK`);

    console.log("\n--- Resumo de gás (fluxo cross-chain completo) ---");
    console.table(txLog);

    const stepsForLog = txLog.map(log => ({
        step: log.step,
        gasUsed: log.gasUsed,
        gasPriceWei: log.gasPriceWei,
        gasPriceGwei: log.gasPriceGwei,
        transactionFeeWei: log.transactionFeeWei,
        transactionFee: log.transactionFee,
        nativeToken: log.nativeToken,
        txHash: log.txHash
    }));

    logTransaction("TESTNET", "Amoy -> Fuji", stepsForLog);
}

main().catch(console.error);