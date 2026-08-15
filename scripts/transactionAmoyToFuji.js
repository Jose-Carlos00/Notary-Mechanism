require("dotenv").config();
const { ethers } = require("hardhat");

const NotaryABI = require("../artifacts/contracts/Notary.sol/Notary.json");
const TokenABI = require("../artifacts/contracts/Token.sol/Token.json");

const {
    NODE_URL_AMOY,
    NODE_URL_FUJI,
    AMOY_PRIVATE_KEY02,
    FUJI_PRIVATE_KEY01, 
    NOTARY_ADDRESS_AMOY,
    TOKEN_ADDRESS_AMOY,
    NOTARY_ADDRESS_FUJI,
    TOKEN_ADDRESS_FUJI
} = process.env;


const amoyProvider = new ethers.JsonRpcProvider(NODE_URL_AMOY, { chainId: 80002, name: 'amoy' });
const fujiProvider = new ethers.JsonRpcProvider(NODE_URL_FUJI, { chainId: 43113, name: 'fuji' });


const userAmoyWallet = new ethers.Wallet(AMOY_PRIVATE_KEY02, amoyProvider); 
const nodeFujiWallet = new ethers.Wallet(FUJI_PRIVATE_KEY01, fujiProvider); 

async function main() {
    
    const amoyTokenContract = new ethers.Contract(TOKEN_ADDRESS_AMOY, TokenABI.abi, userAmoyWallet);
    const amoyNotaryContract = new ethers.Contract(NOTARY_ADDRESS_AMOY, NotaryABI.abi, userAmoyWallet);

    const fujiTokenContract = new ethers.Contract(TOKEN_ADDRESS_FUJI, TokenABI.abi, nodeFujiWallet);
    const fujiNotaryContract = new ethers.Contract(NOTARY_ADDRESS_FUJI, NotaryABI.abi, nodeFujiWallet);
    
   
    const amountToBridge = ethers.parseEther('5');
    
    const receiverFujiAddress = userAmoyWallet.address; 

    console.log(`\n--- Iniciando Transação Cross-Chain: Amoy -> Fuji ---`);
    console.log(`Usuário enviando: ${ethers.formatEther(amountToBridge)} tokens`);
    
    console.log(`\n[1/3] Aprovando tokens na Amoy para o Notary...`);
    const approveTx = await amoyTokenContract.approve(NOTARY_ADDRESS_AMOY, amountToBridge, {
        gasLimit: 1000000, 
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'), 
        maxFeePerGas: ethers.parseUnits('50', 'gwei')          
    });
    await approveTx.wait();
    console.log(`Aprovação concluída! Tx: ${approveTx.hash}`);


    console.log(`\n[2/3] Depositando tokens no Notary da Amoy...`);
   
    const depositTx = await amoyNotaryContract.deposit(TOKEN_ADDRESS_AMOY, amountToBridge, receiverFujiAddress, { 
        gasLimit: 1000000,
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'), 
        maxFeePerGas: ethers.parseUnits('50', 'gwei') 
    });
    await depositTx.wait();
    
    const lastDepositId = await amoyNotaryContract.lastDepositID();
    const depositId = lastDepositId;
    console.log(`Depósito realizado com sucesso! ID do Depósito gerado: ${depositId.toString()}`);


    console.log(`\n[3/3] Nó validador executando a ponte na Fuji...`);
    
    const balanceBefore = await fujiTokenContract.balanceOf(receiverFujiAddress);
    console.log(`Saldo do recebedor na Fuji ANTES: ${ethers.formatEther(balanceBefore)} tokens`);

    const executeTx = await fujiNotaryContract.executeBridge(depositId, TOKEN_ADDRESS_FUJI, receiverFujiAddress, amountToBridge, { 
        gasLimit: 1000000,
        maxPriorityFeePerGas: ethers.parseUnits('25', 'gwei'), 
        maxFeePerGas: ethers.parseUnits('50', 'gwei') 
    });
    await executeTx.wait();
    
    const balanceAfter = await fujiTokenContract.balanceOf(receiverFujiAddress);
    console.log(`Execução concluída! Tx: ${executeTx.hash}`);
    console.log(`Saldo do recebedor na Fuji DEPOIS: ${ethers.formatEther(balanceAfter)} tokens`);
    
    const receivedAmount = balanceAfter - balanceBefore;
    console.log(`\nO recebedor ganhou exatos: ${ethers.formatEther(receivedAmount)} tokens (Os outros 5% ficaram de taxa para o Node)`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("Erro na transação cross-chain:");
        console.error(error);
        process.exit(1);
    });