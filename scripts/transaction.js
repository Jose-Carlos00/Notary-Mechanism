require("dotenv").config();
const { ethers } = require("hardhat");

// ABIs dos contratos.

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
    const sepoliaProvider = new ethers.JsonRpcProvider(

        NODE_URL_SEPOLIA,

        { chainId: 11155111, name: 'sepolia' }

    );

    const amoyProvider = new ethers.JsonRpcProvider(

        NODE_URL_AMOY,

        { chainId: 80002, name: 'amoy' }

    );

    const sepoliaWallet = new ethers.Wallet(SEPOLIA_PRIVATE_KEY01, sepoliaProvider);
    const amoyWallet = new ethers.Wallet(AMOY_PRIVATE_KEY01, amoyProvider);

    // Instanciação dos Contratos


    const sepoliaTokenContract = new ethers.Contract(tokenAddressSepolia, TokenABI.abi, sepoliaWallet);
    const sepoliaNotaryContract = new ethers.Contract(notaryAddressSepolia, NotaryABI.abi, sepoliaWallet);
    const amoyTokenContract = new ethers.Contract(tokenAddressAmoy, TokenABI.abi, amoyWallet);
    const amoyNotaryContract = new ethers.Contract(notaryAddressAmoy, NotaryABI.abi, amoyWallet);
    const amount = ethers.parseEther('1');
    console.log("Aprovando tokens na Sepolia...");

    const approveSepoliaTx = await sepoliaTokenContract.connect(sepoliaWallet).approve(notaryAddressSepolia, amount);
    await approveSepoliaTx.wait();
    console.log(`Tokens aprovados na Sepolia. Transação: ${approveSepoliaTx.hash}`);
    const recipientAmoyAddress = "0x486180513A8D1A1442b378dCD9C2fd24dF34cC32";

    console.log(`Depositando tokens no Notary da Sepolia para ${recipientAmoyAddress} na Amoy...`);
    const depositSepoliaTx = await sepoliaNotaryContract.connect(sepoliaWallet).deposit(amount, recipientAmoyAddress, { gasLimit: 1000000 });

    await depositSepoliaTx.wait();
    console.log(`Depósito realizado na Sepolia. Transação: ${depositSepoliaTx.hash}`);
    const lastDepositId = await sepoliaNotaryContract.lastDepositID();
    console.log("Último ID de Depósito na Sepolia: ", lastDepositId.toString());
    const depositId = parseInt(lastDepositId.toString()) + 1;
    console.log(`Executando ponte na Amoy com ID de Depósito ${depositId}...`);
    const executeBridgeAmoyTx = await amoyNotaryContract.connect(amoyWallet).executeBridge(depositId, recipientAmoyAddress, amount, { gasLimit: 1000000 });
    await executeBridgeAmoyTx.wait();
    console.log(`Ponte executada na Amoy. Transação: ${executeBridgeAmoyTx.hash}`);
    const finalBalanceAmoy = await amoyTokenContract.balanceOf(recipientAmoyAddress);
    console.log(`Balanço final de tokens em ${recipientAmoyAddress} na Amoy: ${ethers.formatEther(finalBalanceAmoy)} tokens`);

}

main()

    .then(() => process.exit(0))
    .catch(error => {

        console.error("Ocorreu um erro durante a execução do script:");
        console.error(error);
        process.exit(1);

    });