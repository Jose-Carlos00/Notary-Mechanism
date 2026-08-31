require("dotenv").config();
const { ethers } = require("hardhat");
const { logTransaction } = require("./utils/logger");

const erc20Abi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)",
    "function decimals() public view returns (uint8)"
];

const FUJI_CHAIN_ID = 43113; 

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

    const tokenDecimalsFuji = await fujiLink.decimals();
    const tokenDecimalsAmoy = await amoyLink.decimals();

    const amountToSend = ethers.parseUnits("0.001", tokenDecimalsFuji);
    const receiverAddress = userWalletFuji.address;
    const txLog = [];

    console.log("\n[1/3] Aprovando Token na Fuji...");
    let tx = await fujiLink.approve(NOTARY_ADDRESS_FUJI, amountToSend);
    let receipt = await tx.wait();

    const approveFujiFee = receipt.gasUsed * receipt.gasPrice;

    txLog.push({
        step: "approve (Fuji)",
        gasUsed: receipt.gasUsed.toString(),
        gasPriceWei: receipt.gasPrice.toString(),
        gasPriceGwei: ethers.formatUnits(receipt.gasPrice, "gwei"),
        transactionFeeWei: approveFujiFee.toString(),
        transactionFee: ethers.formatEther(approveFujiFee),
        nativeToken: "AVAX",
        txHash: receipt.hash
    });

    console.log(`Aprovação concluída! Tx: ${receipt.hash}`);
    console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`Gas Price: ${ethers.formatUnits(receipt.gasPrice, "gwei")} Gwei`);
    console.log(`Transaction Fee: ${ethers.formatEther(approveFujiFee)} AVAX`);

    console.log("\n[2/3] Depositando Token no Notary da Fuji...");
    tx = await fujiNotary.deposit(LINK_ADDRESS_FUJI, amountToSend, "Amoy", receiverAddress);
    receipt = await tx.wait();

    const depositFujiFee = receipt.gasUsed * receipt.gasPrice;

    txLog.push({
        step: "deposit (Fuji)",
        gasUsed: receipt.gasUsed.toString(),
        gasPriceWei: receipt.gasPrice.toString(),
        gasPriceGwei: ethers.formatUnits(receipt.gasPrice, "gwei"),
        transactionFeeWei: depositFujiFee.toString(),
        transactionFee: ethers.formatEther(depositFujiFee),
        nativeToken: "AVAX",
        txHash: receipt.hash
    });

    const depositEvent = receipt.logs
        .map(log => {
            try { return fujiNotary.interface.parseLog(log); }
            catch { return null; }
        })
        .find(parsed => parsed && parsed.name === "Deposit");

    const depositID = depositEvent.args.depositID;
    console.log(`Depósito realizado! ID: ${depositID.toString()}`);
    console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`Gas Price: ${ethers.formatUnits(receipt.gasPrice, "gwei")} Gwei`);
    console.log(`Transaction Fee: ${ethers.formatEther(depositFujiFee)} AVAX`);

    console.log("\n[3/3] Nó executando a ponte na Amoy...");
    const saldoAntes = await amoyLink.balanceOf(receiverAddress);

    tx = await amoyNotary.executeBridge(
        FUJI_CHAIN_ID,
        depositID,
        LINK_ADDRESS_AMOY,
        receiverAddress,
        amountToSend
    );

    receipt = await tx.wait();

    const executeAmoyFee = receipt.gasUsed * receipt.gasPrice;

    txLog.push({
        step: "executeBridge (Amoy)",
        gasUsed: receipt.gasUsed.toString(),
        gasPriceWei: receipt.gasPrice.toString(),
        gasPriceGwei: ethers.formatUnits(receipt.gasPrice, "gwei"),
        transactionFeeWei: executeAmoyFee.toString(),
        transactionFee: ethers.formatEther(executeAmoyFee),
        nativeToken: "POL",
        txHash: receipt.hash
    });

    const saldoDepois = await amoyLink.balanceOf(receiverAddress);

    console.log(`Execução concluída! Tx: ${receipt.hash}`);
    console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`Gas Price: ${ethers.formatUnits(receipt.gasPrice, "gwei")} Gwei`);
    console.log(`Transaction Fee: ${ethers.formatEther(executeAmoyFee)} POL`);

    console.log(`Saldo Amoy ANTES: ${ethers.formatUnits(saldoAntes, tokenDecimalsAmoy)}`);
    console.log(`Saldo Amoy DEPOIS: ${ethers.formatUnits(saldoDepois, tokenDecimalsAmoy)}`);

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

    logTransaction("TESTNET", "Fuji -> Amoy", stepsForLog);
}

main().catch(console.error);