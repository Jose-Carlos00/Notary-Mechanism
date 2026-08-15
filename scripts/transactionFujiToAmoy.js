require("dotenv").config();
const { ethers } = require("hardhat"); 

const NotaryABI = require("../artifacts/contracts/Notary.sol/Notary.json");
const TokenABI = require("../artifacts/contracts/Token.sol/Token.json");

const {
    NODE_URL_FUJI,
    NODE_URL_AMOY,
    FUJI_PRIVATE_KEY01, 
    AMOY_PRIVATE_KEY01,
    NOTARY_ADDRESS_FUJI,
    TOKEN_ADDRESS_FUJI,
    NOTARY_ADDRESS_AMOY,
    TOKEN_ADDRESS_AMOY
} = process.env;

async function main() {
    const tokenAddressFuji = TOKEN_ADDRESS_FUJI;
    const notaryAddressFuji = NOTARY_ADDRESS_FUJI;
    
    const tokenAddressAmoy = TOKEN_ADDRESS_AMOY;
    const notaryAddressAmoy = NOTARY_ADDRESS_AMOY; 

    const fujiProvider = new ethers.JsonRpcProvider(
        NODE_URL_FUJI,
        { chainId: 43113, name: 'fuji' } 
    );
    const amoyProvider = new ethers.JsonRpcProvider(
        NODE_URL_AMOY,
        { chainId: 80002, name: 'amoy' } 
    );

    const fujiWallet = new ethers.Wallet(FUJI_PRIVATE_KEY01, fujiProvider);
    const amoyWallet = new ethers.Wallet(AMOY_PRIVATE_KEY01, amoyProvider);

    console.log(`\n--- Transação Fuji para Amoy ---`);
    console.log(`Carteira Fuji (Depositante): ${fujiWallet.address}`);
    console.log(`Carteira Amoy (Recebedor/Executor): ${amoyWallet.address}`);

    const fujiTokenContract = new ethers.Contract(tokenAddressFuji, TokenABI.abi, fujiWallet);
    const fujiNotaryContract = new ethers.Contract(notaryAddressFuji, NotaryABI.abi, fujiWallet);
    const amoyTokenContract = new ethers.Contract(tokenAddressAmoy, TokenABI.abi, amoyWallet);
    const amoyNotaryContract = new ethers.Contract(notaryAddressAmoy, NotaryABI.abi, amoyWallet);

    const amount = ethers.parseEther('1'); // 1 token para a transação
    
    // Endereço recebedor
    const amoyRecipientAddress = amoyWallet.address; 

    // --- Aprovação na Fuji ---
    console.log(`\n--- Fuji (Aprovação e Depósito) ---`);
    console.log(`Aprovando ${ethers.formatEther(amount)} tokens na Fuji para o contrato Notary (${notaryAddressFuji})...`);

    const approveFujiTx = await fujiTokenContract.approve(notaryAddressFuji, amount);
    await approveFujiTx.wait(); 
    console.log(`Tokens aprovados na Fuji. Transação: ${approveFujiTx.hash}`);

    // --- Depósito na Fuji ---
    console.log(`Depositando ${ethers.formatEther(amount)} tokens no Notary da Fuji para ${amoyRecipientAddress} na Amoy...`);
 
    const depositFujiTx = await fujiNotaryContract.deposit(tokenAddressFuji, amount, amoyRecipientAddress);
    await depositFujiTx.wait(); 
    console.log(`Depósito realizado na Fuji. Transação: ${depositFujiTx.hash}`);
    
    const lastDepositIdFuji = await fujiNotaryContract.lastDepositID();
    console.log(`Último ID de Depósito na Fuji: ${lastDepositIdFuji.toString()}`); 

    const depositIdToBridge = lastDepositIdFuji; 
    
    console.log(`\n--- Amoy (Executar Ponte) ---`);
    console.log(`Executando ponte na Amoy com ID de Depósito ${depositIdToBridge.toString()} para ${amoyRecipientAddress}...`);

    const executeBridgeAmoyTx = await amoyNotaryContract.executeBridge(depositIdToBridge, tokenAddressAmoy, amoyRecipientAddress, amount);
    await executeBridgeAmoyTx.wait(); 
    console.log(`Ponte executada na Amoy. Transação: ${executeBridgeAmoyTx.hash}`);
    const finalBalanceAmoy = await amoyTokenContract.balanceOf(amoyRecipientAddress);
    console.log(`Balanço final de tokens em ${amoyRecipientAddress} na Amoy: ${ethers.formatEther(finalBalanceAmoy)} tokens`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("Um erro ocorreu durante a execução do script:");
        console.error(error);
        process.exit(1);
    });