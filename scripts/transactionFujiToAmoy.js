require("dotenv").config();
const { ethers } = require("hardhat"); 

// ABIs dos contratos.
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

    // Provedores 
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

    console.log(`\n--- Transação Fuji para Amoy (RETOMADA) ---`);
    console.log(`Carteira Amoy (Recebedor/Executor): ${amoyWallet.address}`);

    // Instanciação dos Contratos
    const amoyTokenContract = new ethers.Contract(tokenAddressAmoy, TokenABI.abi, amoyWallet);
    const amoyNotaryContract = new ethers.Contract(notaryAddressAmoy, NotaryABI.abi, amoyWallet);

    const amount = ethers.parseEther('1'); // 1 token da transação
    const amoyRecipientAddress = amoyWallet.address; 

    /* =========================================================================
       TRECHO COMENTADO PARA POUPAR TOKENS (O depósito já ocorreu na Fuji)
    ========================================================================= */
    /*
    console.log(`\n--- Fuji (Aprovação e Depósito) ---`);
    const approveFujiTx = await fujiTokenContract.connect(fujiWallet).approve(notaryAddressFuji, amount, ...);
    await approveFujiTx.wait(); 
    
    const depositFujiTx = await fujiNotaryContract.connect(fujiWallet).deposit(amount, amoyRecipientAddress, ...);
    await depositFujiTx.wait(); 
    const lastDepositIdFuji = await fujiNotaryContract.lastDepositID();
    */

    // --- Executar Ponte na Amoy ---
    // Forçamos manualmente o ID do depósito que travou anteriormente:
    const depositIdToBridge = 1; 
    
    console.log(`\n--- Amoy (Executar Ponte) ---`);
    console.log(`Executando ponte na Amoy com ID de Depósito ${depositIdToBridge} para ${amoyRecipientAddress}...`);
    
    const executeBridgeAmoyTx = await amoyNotaryContract.connect(amoyWallet).executeBridge(depositIdToBridge, amoyRecipientAddress, amount, {
        gasLimit: 1000000,
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'),
        maxFeePerGas: ethers.parseUnits('50', 'gwei')
    });
    
    await executeBridgeAmoyTx.wait(); 
    console.log(`Ponte executada na Amoy. Transação: ${executeBridgeAmoyTx.hash}`);

    // --- Verificação Final ---
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