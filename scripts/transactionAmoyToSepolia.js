require("dotenv").config();
const { ethers } = require("hardhat");

const NotaryABI = require("../artifacts/contracts/Notary.sol/Notary.json");
const TokenABI = require("../artifacts/contracts/Token.sol/Token.json");

const {
    NODE_URL_SEPOLIA,
    NODE_URL_AMOY,
    SEPOLIA_PRIVATE_KEY01, 
    AMOY_PRIVATE_KEY01, 
    NOTARY_ADDRESS_SEPOLIA,   
    TOKEN_ADDRESS_SEPOLIA,
    NOTARY_ADDRESS_AMOY,
    TOKEN_ADDRESS_AMOY
} = process.env;

async function main() {
    const tokenAddressSepolia = TOKEN_ADDRESS_SEPOLIA;
    const notaryAddressSepolia = NOTARY_ADDRESS_SEPOLIA;
    
    const tokenAddressAmoy = TOKEN_ADDRESS_AMOY;
    const notaryAddressAmoy = NOTARY_ADDRESS_AMOY; 

    // Provedores
    const sepoliaProvider = new ethers.JsonRpcProvider(
        NODE_URL_SEPOLIA,
        { chainId: 11155111, name: 'sepolia' } 
    );
    const amoyProvider = new ethers.JsonRpcProvider(
        NODE_URL_AMOY,
        { chainId: 80002, name: 'amoy' } 
    );

    const amoyWallet = new ethers.Wallet(AMOY_PRIVATE_KEY01, amoyProvider);
    const sepoliaWallet = new ethers.Wallet(SEPOLIA_PRIVATE_KEY01, sepoliaProvider);

    console.log(`\n--- Transação Amoy para Sepolia ---`);
    console.log(`Carteira Amoy (Depositante): ${amoyWallet.address}`);
    console.log(`Carteira Sepolia (Recebedor/Executor): ${sepoliaWallet.address}`);

    // Contratos
    const sepoliaTokenContract = new ethers.Contract(tokenAddressSepolia, TokenABI.abi, sepoliaWallet);
    const sepoliaNotaryContract = new ethers.Contract(notaryAddressSepolia, NotaryABI.abi, sepoliaWallet);
    const amoyTokenContract = new ethers.Contract(tokenAddressAmoy, TokenABI.abi, amoyWallet);
    const amoyNotaryContract = new ethers.Contract(notaryAddressAmoy, NotaryABI.abi, amoyWallet);

    const amount = ethers.parseEther('1'); // 1 token para a transação
    const sepoliaRecipientAddress = sepoliaWallet.address; // Endereço para receber na Sepolia

    console.log(`\n--- Amoy (Aprovação e Depósito) ---`);
    console.log(`Aprovando ${ethers.formatEther(amount)} tokens na Amoy para o contrato Notary (${notaryAddressAmoy})...`);
    const approveAmoyTx = await amoyTokenContract.connect(amoyWallet).approve(notaryAddressAmoy, amount, {
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'),
        maxFeePerGas: ethers.parseUnits('50', 'gwei')
    });
    await approveAmoyTx.wait(); 
    console.log(`Tokens aprovados na Amoy. Transação: ${approveAmoyTx.hash}`);

    console.log(`Depositando ${ethers.formatEther(amount)} tokens no Notary da Amoy para ${sepoliaRecipientAddress} na Sepolia...`);
    const depositAmoyTx = await amoyNotaryContract.connect(amoyWallet).deposit(amount, sepoliaRecipientAddress, {
        gasLimit: 1000000,
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'),
        maxFeePerGas: ethers.parseUnits('50', 'gwei')
    });
    await depositAmoyTx.wait(); 
    console.log(`Depósito realizado na Amoy. Transação: ${depositAmoyTx.hash}`);
    const lastDepositIdAmoy = await amoyNotaryContract.lastDepositID();
    console.log(`Último ID de Depósito na Amoy: ${lastDepositIdAmoy.toString()}`); 

    const depositIdToBridge = lastDepositIdAmoy; 
    
    console.log(`\n--- Sepolia (Executar Ponte) ---`);
    console.log(`Executando ponte na Sepolia com ID de Depósito ${depositIdToBridge.toString()} para ${sepoliaRecipientAddress}...`);
    const executeBridgeSepoliaTx = await sepoliaNotaryContract.connect(sepoliaWallet).executeBridge(depositIdToBridge, sepoliaRecipientAddress, amount, {
        gasLimit: 1000000,
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'),
        maxFeePerGas: ethers.parseUnits('50', 'gwei')
    });
    await executeBridgeSepoliaTx.wait(); 
    console.log(`Ponte executada na Sepolia. Transação: ${executeBridgeSepoliaTx.hash}`);

    const finalBalanceSepolia = await sepoliaTokenContract.balanceOf(sepoliaRecipientAddress);
    console.log(`Balanço final de tokens em ${sepoliaRecipientAddress} na Sepolia: ${ethers.formatEther(finalBalanceSepolia)} tokens`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("An error occurred during the execution of the script:");
        console.error(error);
        process.exit(1);
    });