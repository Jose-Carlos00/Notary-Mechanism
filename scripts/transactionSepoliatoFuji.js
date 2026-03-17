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
    const sepoliaProvider = new ethers.JsonRpcProvider(NODE_URL_SEPOLIA, { chainId: 11155111, name: 'sepolia' });
    const fujiProvider = new ethers.JsonRpcProvider(NODE_URL_FUJI, { chainId: 43113, name: 'fuji' });

    const sepoliaWallet = new ethers.Wallet(SEPOLIA_PRIVATE_KEY01, sepoliaProvider);
    const fujiWallet = new ethers.Wallet(FUJI_PRIVATE_KEY01, fujiProvider); 

    console.log(`\n--- Transação Sepolia para Fuji ---`);
    console.log(`Carteira Sepolia (Depositante): ${sepoliaWallet.address}`);
    console.log(`Carteira Fuji (Recebedor/Executor): ${fujiWallet.address}`);

    const sepoliaTokenContract = new ethers.Contract(TOKEN_ADDRESS_SEPOLIA, TokenABI.abi, sepoliaWallet);
    const sepoliaNotaryContract = new ethers.Contract(NOTARY_ADDRESS_SEPOLIA, NotaryABI.abi, sepoliaWallet);
    const fujiTokenContract = new ethers.Contract(TOKEN_ADDRESS_FUJI, TokenABI.abi, fujiWallet);
    const fujiNotaryContract = new ethers.Contract(NOTARY_ADDRESS_FUJI, NotaryABI.abi, fujiWallet);

    const amount = ethers.parseEther('1'); 
    const fujiRecipientAddress = fujiWallet.address; 

    console.log(`\n--- Sepolia (Aprovação e Depósito) ---`);
    console.log(`Aprovando tokens na Sepolia para o contrato Notary...`);
    const approveSepoliaTx = await sepoliaTokenContract.connect(sepoliaWallet).approve(NOTARY_ADDRESS_SEPOLIA, amount, {
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'),
        maxFeePerGas: ethers.parseUnits('50', 'gwei')
    });
    await approveSepoliaTx.wait(); 
    console.log(`Tokens aprovados na Sepolia. Transação: ${approveSepoliaTx.hash}`);

    console.log(`Depositando tokens no Notary da Sepolia para ${fujiRecipientAddress} na Fuji...`);
    const depositSepoliaTx = await sepoliaNotaryContract.connect(sepoliaWallet).deposit(amount, fujiRecipientAddress, {
        gasLimit: 1000000,
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'),
        maxFeePerGas: ethers.parseUnits('50', 'gwei')
    });
    await depositSepoliaTx.wait(); 
    console.log(`Depósito realizado na Sepolia. Transação: ${depositSepoliaTx.hash}`);
    
    const lastDepositIdSepolia = await sepoliaNotaryContract.lastDepositID();
    console.log(`Último ID de Depósito na Sepolia: ${lastDepositIdSepolia.toString()}`); 

    const depositIdToBridge = lastDepositIdSepolia; 
    
    console.log(`\n--- Fuji (Executar Ponte) ---`);
    console.log(`Executando ponte na Fuji com ID de Depósito ${depositIdToBridge.toString()}...`);
    const executeBridgeFujiTx = await fujiNotaryContract.connect(fujiWallet).executeBridge(depositIdToBridge, fujiRecipientAddress, amount, {
        gasLimit: 1000000,
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'),
        maxFeePerGas: ethers.parseUnits('50', 'gwei')
    });
    await executeBridgeFujiTx.wait(); 
    console.log(`Ponte executada na Fuji. Transação: ${executeBridgeFujiTx.hash}`);

    const finalBalanceFuji = await fujiTokenContract.balanceOf(fujiRecipientAddress);
    console.log(`Balanço final na Fuji: ${ethers.formatEther(finalBalanceFuji)} tokens`);
}

main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });