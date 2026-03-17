require("dotenv").config();
const { ethers } = require("hardhat");

const NotaryABI = require("../artifacts/contracts/Notary.sol/Notary.json");
const TokenABI = require("../artifacts/contracts/Token.sol/Token.json");

const {
    NODE_URL_SEPOLIA,
    NODE_URL_FUJI,
    SEPOLIA_PRIVATE_KEY01, 
    FUJI_PRIVATE_KEY01, 
    NOTARY_ADDRESS_SEPOLIA,   
    TOKEN_ADDRESS_SEPOLIA,
    NOTARY_ADDRESS_FUJI,
    TOKEN_ADDRESS_FUJI
} = process.env;

async function main() {
    // Provedores
    const sepoliaProvider = new ethers.JsonRpcProvider(NODE_URL_SEPOLIA, { chainId: 11155111, name: 'sepolia' });
    const fujiProvider = new ethers.JsonRpcProvider(NODE_URL_FUJI, { chainId: 43113, name: 'fuji' });

    const fujiWallet = new ethers.Wallet(FUJI_PRIVATE_KEY01, fujiProvider);
    const sepoliaWallet = new ethers.Wallet(SEPOLIA_PRIVATE_KEY01, sepoliaProvider);

    console.log(`\n--- Transação Fuji para Sepolia ---`);
    console.log(`Carteira Fuji (Depositante): ${fujiWallet.address}`);
    console.log(`Carteira Sepolia (Recebedor/Executor): ${sepoliaWallet.address}`);

    // Contratos
    const sepoliaTokenContract = new ethers.Contract(TOKEN_ADDRESS_SEPOLIA, TokenABI.abi, sepoliaWallet);
    const sepoliaNotaryContract = new ethers.Contract(NOTARY_ADDRESS_SEPOLIA, NotaryABI.abi, sepoliaWallet);
    const fujiTokenContract = new ethers.Contract(TOKEN_ADDRESS_FUJI, TokenABI.abi, fujiWallet);
    const fujiNotaryContract = new ethers.Contract(NOTARY_ADDRESS_FUJI, NotaryABI.abi, fujiWallet);

    const amount = ethers.parseEther('1'); 
    const sepoliaRecipientAddress = sepoliaWallet.address; 

    console.log(`\n--- Fuji (Aprovação e Depósito) ---`);
    console.log(`Aprovando tokens na Fuji para o contrato Notary...`);
    const approveFujiTx = await fujiTokenContract.connect(fujiWallet).approve(NOTARY_ADDRESS_FUJI, amount, {
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'),
        maxFeePerGas: ethers.parseUnits('50', 'gwei')
    });
    await approveFujiTx.wait(); 
    console.log(`Tokens aprovados na Fuji. Transação: ${approveFujiTx.hash}`);

    console.log(`Depositando tokens no Notary da Fuji para ${sepoliaRecipientAddress} na Sepolia...`);
    const depositFujiTx = await fujiNotaryContract.connect(fujiWallet).deposit(amount, sepoliaRecipientAddress, {
        gasLimit: 1000000,
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'),
        maxFeePerGas: ethers.parseUnits('50', 'gwei')
    });
    await depositFujiTx.wait(); 
    console.log(`Depósito realizado na Fuji. Transação: ${depositFujiTx.hash}`);
    
    const lastDepositIdFuji = await fujiNotaryContract.lastDepositID();
    console.log(`Último ID de Depósito na Fuji: ${lastDepositIdFuji.toString()}`); 

    const depositIdToBridge = lastDepositIdFuji; 
    
    console.log(`\n--- Sepolia (Executar Ponte) ---`);
    console.log(`Executando ponte na Sepolia com ID de Depósito ${depositIdToBridge.toString()}...`);
    const executeBridgeSepoliaTx = await sepoliaNotaryContract.connect(sepoliaWallet).executeBridge(depositIdToBridge, sepoliaRecipientAddress, amount, {
        gasLimit: 1000000,
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'),
        maxFeePerGas: ethers.parseUnits('50', 'gwei')
    });
    await executeBridgeSepoliaTx.wait(); 
    console.log(`Ponte executada na Sepolia. Transação: ${executeBridgeSepoliaTx.hash}`);

    const finalBalanceSepolia = await sepoliaTokenContract.balanceOf(sepoliaRecipientAddress);
    console.log(`Balanço final na Sepolia: ${ethers.formatEther(finalBalanceSepolia)} tokens`);
}

main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });