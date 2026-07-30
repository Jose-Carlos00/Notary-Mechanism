require("dotenv").config();
const { ethers } = require("hardhat");

const NotaryABI = require("../artifacts/contracts/Notary.sol/Notary.json");
const TokenABI = require("../artifacts/contracts/Token.sol/Token.json");

const {
    NODE_URL_AMOY,
    NODE_URL_FUJI,
    AMOY_PRIVATE_KEY01, 
    FUJI_PRIVATE_KEY01, 
    NOTARY_ADDRESS_AMOY,   
    TOKEN_ADDRESS_AMOY,
    NOTARY_ADDRESS_FUJI,
    TOKEN_ADDRESS_FUJI
} = process.env;

async function main() {
    const tokenAddressAmoy = TOKEN_ADDRESS_AMOY;
    const notaryAddressAmoy = NOTARY_ADDRESS_AMOY;
    
    const tokenAddressFuji = TOKEN_ADDRESS_FUJI;
    const notaryAddressFuji = NOTARY_ADDRESS_FUJI; 

    // Provedores
    const amoyProvider = new ethers.JsonRpcProvider(
        NODE_URL_AMOY,
        { chainId: 80002, name: 'amoy' } 
    );
    const fujiProvider = new ethers.JsonRpcProvider(
        NODE_URL_FUJI,
        { chainId: 43113, name: 'fuji' } 
    );

    const amoyWallet = new ethers.Wallet(AMOY_PRIVATE_KEY01, amoyProvider);
    const fujiWallet = new ethers.Wallet(FUJI_PRIVATE_KEY01, fujiProvider);

    console.log(`\n--- Transação Amoy para Fuji ---`);
    console.log(`Carteira Amoy (Depositante): ${amoyWallet.address}`);
    console.log(`Carteira Fuji (Recebedor/Executor): ${fujiWallet.address}`);

    // Contratos
    const amoyTokenContract = new ethers.Contract(tokenAddressAmoy, TokenABI.abi, amoyWallet);
    const amoyNotaryContract = new ethers.Contract(notaryAddressAmoy, NotaryABI.abi, amoyWallet);
    const fujiTokenContract = new ethers.Contract(tokenAddressFuji, TokenABI.abi, fujiWallet);
    const fujiNotaryContract = new ethers.Contract(notaryAddressFuji, NotaryABI.abi, fujiWallet);

    const amount = ethers.parseEther('1'); // 1 token para a transação
    const fujiRecipientAddress = fujiWallet.address; // Endereço para receber na Fuji

    console.log(`\n--- Amoy (Aprovação e Depósito) ---`);
    console.log(`Aprovando ${ethers.formatEther(amount)} tokens na Amoy para o contrato Notary (${notaryAddressAmoy})...`);
    const approveAmoyTx = await amoyTokenContract.connect(amoyWallet).approve(notaryAddressAmoy, amount, {
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'),
        maxFeePerGas: ethers.parseUnits('50', 'gwei')
    });
    await approveAmoyTx.wait(); 
    console.log(`Tokens aprovados na Amoy. Transação: ${approveAmoyTx.hash}`);

    console.log(`Depositando ${ethers.formatEther(amount)} tokens no Notary da Amoy para ${fujiRecipientAddress} na Fuji...`);
    const depositAmoyTx = await amoyNotaryContract.connect(amoyWallet).deposit(amount, fujiRecipientAddress, {
        gasLimit: 1000000,
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'),
        maxFeePerGas: ethers.parseUnits('50', 'gwei')
    });
    await depositAmoyTx.wait(); 
    console.log(`Depósito realizado na Amoy. Transação: ${depositAmoyTx.hash}`);
    const lastDepositIdAmoy = await amoyNotaryContract.lastDepositID();
    console.log(`Último ID de Depósito na Amoy: ${lastDepositIdAmoy.toString()}`); 

    const depositIdToBridge = lastDepositIdAmoy; 
    
    console.log(`\n--- Fuji (Executar Ponte) ---`);
    console.log(`Executando ponte na Fuji com ID de Depósito ${depositIdToBridge.toString()} para ${fujiRecipientAddress}...`);
    const executeBridgeFujiTx = await fujiNotaryContract.connect(fujiWallet).executeBridge(depositIdToBridge, fujiRecipientAddress, amount, {
        gasLimit: 1000000,
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'),
        maxFeePerGas: ethers.parseUnits('50', 'gwei')
    });
    await executeBridgeFujiTx.wait(); 
    console.log(`Ponte executada na Fuji. Transação: ${executeBridgeFujiTx.hash}`);

    const finalBalanceFuji = await fujiTokenContract.balanceOf(fujiRecipientAddress);
    console.log(`Balanço final de tokens em ${fujiRecipientAddress} na Fuji: ${ethers.formatEther(finalBalanceFuji)} tokens`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("An error occurred during the execution of the script:");
        console.error(error);
        process.exit(1);
    });