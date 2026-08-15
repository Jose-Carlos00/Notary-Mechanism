require("dotenv").config();
const { ethers } = require("hardhat");

const NotaryABI = require("../artifacts/contracts/Notary.sol/Notary.json");
const TokenABI = require("../artifacts/contracts/Token.sol/Token.json");

const {
   // NODE_URL_SEPOLIA,
    NODE_URL_AMOY,
    NODE_URL_FUJI,
    //SEPOLIA_PRIVATE_KEY01,
    AMOY_PRIVATE_KEY01,
    FUJI_PRIVATE_KEY01,
 //   NOTARY_ADDRESS_SEPOLIA,
   // TOKEN_ADDRESS_SEPOLIA,
    NOTARY_ADDRESS_AMOY,
    TOKEN_ADDRESS_AMOY,
    NOTARY_ADDRESS_FUJI,
    TOKEN_ADDRESS_FUJI
} = process.env;


//const sepoliaProvider = new ethers.JsonRpcProvider(NODE_URL_SEPOLIA, { chainId: 11155111, name: 'sepolia' });
const amoyProvider = new ethers.JsonRpcProvider(NODE_URL_AMOY, { chainId: 80002, name: 'amoy' });
const fujiProvider = new ethers.JsonRpcProvider(NODE_URL_FUJI, { chainId: 43113, name: 'fuji' });


//const sepoliaWallet = new ethers.Wallet(SEPOLIA_PRIVATE_KEY01, sepoliaProvider);
const amoyWallet = new ethers.Wallet(AMOY_PRIVATE_KEY01, amoyProvider);
const fujiWallet = new ethers.Wallet(FUJI_PRIVATE_KEY01, fujiProvider);

async function main() {
    
   // const sepoliaTokenContract = new ethers.Contract(TOKEN_ADDRESS_SEPOLIA, TokenABI.abi, sepoliaWallet);
   // const sepoliaNotaryContract = new ethers.Contract(NOTARY_ADDRESS_SEPOLIA, NotaryABI.abi, sepoliaWallet);
    
    const amoyTokenContract = new ethers.Contract(TOKEN_ADDRESS_AMOY, TokenABI.abi, amoyWallet);
    const amoyNotaryContract = new ethers.Contract(NOTARY_ADDRESS_AMOY, NotaryABI.abi, amoyWallet);

    const fujiTokenContract = new ethers.Contract(TOKEN_ADDRESS_FUJI, TokenABI.abi, fujiWallet);
    const fujiNotaryContract = new ethers.Contract(NOTARY_ADDRESS_FUJI, NotaryABI.abi, fujiWallet);
    
    const amount = ethers.parseEther('100');
    
    // --- Operações Sepolia ---
  /*  console.log(`\n--- Operações Sepolia (Stake) ---`);
    console.log(`Aprovando ${ethers.formatEther(amount)} tokens na Sepolia para o contrato Notary (${NOTARY_ADDRESS_SEPOLIA})...`);
    const approveSepoliaTx = await sepoliaTokenContract.connect(sepoliaWallet).approve(NOTARY_ADDRESS_SEPOLIA, amount);
    await approveSepoliaTx.wait(); 
    console.log(`Tokens aprovados na Sepolia. Transação: ${approveSepoliaTx.hash}`);

    console.log(`Realizando stake de ${ethers.formatEther(amount)} tokens na Sepolia...`);
    // ALTERAÇÃO AQUI: Passando TOKEN_ADDRESS_SEPOLIA como primeiro parâmetro
  /*  const stakeSepoliaTx = await sepoliaNotaryContract.connect(sepoliaWallet).stake(TOKEN_ADDRESS_SEPOLIA, amount, {
        gasLimit: 1000000, 
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'), 
        maxFeePerGas: ethers.parseUnits('50', 'gwei')          
    });
    await stakeSepoliaTx.wait();
    console.log(`Stake realizado na Sepolia. Transação: ${stakeSepoliaTx.hash}`);
*/

    // --- Operações Amoy ---
    console.log(`\n--- Operações Amoy (Stake) ---`);
    console.log(`Aprovando ${ethers.formatEther(amount)} tokens na Amoy para o contrato Notary (${NOTARY_ADDRESS_AMOY})...`);
    const approveAmoyTx = await amoyTokenContract.connect(amoyWallet).approve(NOTARY_ADDRESS_AMOY, amount, {
        gasLimit: 1000000, 
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'), 
        maxFeePerGas: ethers.parseUnits('50', 'gwei')          
    });
    await approveAmoyTx.wait();
    console.log(`Tokens aprovados na Amoy. Transação: ${approveAmoyTx.hash}`);

    console.log(`Realizando stake de ${ethers.formatEther(amount)} tokens na Amoy...`);
    
    const stakeAmoyTx = await amoyNotaryContract.connect(amoyWallet).stake(TOKEN_ADDRESS_AMOY, amount, {
        gasLimit: 1000000, 
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'), 
        maxFeePerGas: ethers.parseUnits('50', 'gwei')          
    });
    await stakeAmoyTx.wait();
    console.log(`Stake realizado na Amoy. Transação: ${stakeAmoyTx.hash}`);


    // --- Operações Fuji ---
    console.log(`\n--- Operações Fuji (Stake) ---`);
    console.log(`Aprovando ${ethers.formatEther(amount)} tokens na Fuji para o contrato Notary (${NOTARY_ADDRESS_FUJI})...`);
    const approveFujiTx = await fujiTokenContract.connect(fujiWallet).approve(NOTARY_ADDRESS_FUJI, amount, {
        gasLimit: 1000000, 
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'), 
        maxFeePerGas: ethers.parseUnits('50', 'gwei')          
    });
    await approveFujiTx.wait();
    console.log(`Tokens aprovados na Fuji. Transação: ${approveFujiTx.hash}`);

    console.log(`Realizando stake de ${ethers.formatEther(amount)} tokens na Fuji...`);
    
    const stakeFujiTx = await fujiNotaryContract.connect(fujiWallet).stake(TOKEN_ADDRESS_FUJI, amount, {
        gasLimit: 1000000, 
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'), 
        maxFeePerGas: ethers.parseUnits('50', 'gwei')          
    });
    await stakeFujiTx.wait();
    console.log(`Stake realizado na Fuji. Transação: ${stakeFujiTx.hash}`);

    console.log("\nProcesso de stake concluído em todas as redes!");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("Ocorreu um erro durante a execução do script:");
        console.error(error);
        process.exit(1);
    });