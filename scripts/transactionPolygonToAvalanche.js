require("dotenv").config();
const { ethers } = require("hardhat");
const { logTransaction } = require("./utils/logger");

const erc20Abi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)",
    "function decimals() public view returns (uint8)"
];

const POLYGON_CHAIN_ID = 137;

async function main() {
    // 1. Validação rápida das variáveis de ambiente (evita erro de 'undefined')
    const requiredEnvs = [
        "NODE_URL_POLYGON", "NODE_URL_AVALANCHE",
        "POLYGON_PRIVATE_KEY01", "AVALANCHE_PRIVATE_KEY01",
        "NOTARY_ADDRESS_POLYGON", "NOTARY_ADDRESS_AVALANCHE",
        "USDC_ADDRESS_POLYGON", "USDC_ADDRESS_AVALANCHE"
    ];
    for (const env of requiredEnvs) {
        if (!process.env[env]) throw new Error(`[ERRO FATAL] Variável ausente no .env: ${env}`);
    }

    const {
        NODE_URL_POLYGON, NODE_URL_AVALANCHE,
        POLYGON_PRIVATE_KEY01, AVALANCHE_PRIVATE_KEY01,
        NOTARY_ADDRESS_POLYGON, NOTARY_ADDRESS_AVALANCHE,
        USDC_ADDRESS_POLYGON, USDC_ADDRESS_AVALANCHE
    } = process.env;

    const networkPolygon = new ethers.Network("polygon", 137);
    const polygonProvider = new ethers.JsonRpcProvider(NODE_URL_POLYGON, networkPolygon);
    const avalancheProvider = new ethers.JsonRpcProvider(NODE_URL_AVALANCHE);

    const userWalletPolygon = new ethers.Wallet(POLYGON_PRIVATE_KEY01, polygonProvider);
    const nodeWalletAvalanche = new ethers.Wallet(AVALANCHE_PRIVATE_KEY01, avalancheProvider);

    const NotaryABI = require("../artifacts/contracts/Notary.sol/Notary.json").abi;

    const polygonUsdc = new ethers.Contract(USDC_ADDRESS_POLYGON, erc20Abi, userWalletPolygon);
    const avalancheUsdc = new ethers.Contract(USDC_ADDRESS_AVALANCHE, erc20Abi, nodeWalletAvalanche);

    const polygonNotary = new ethers.Contract(NOTARY_ADDRESS_POLYGON, NotaryABI, userWalletPolygon);
    const avalancheNotary = new ethers.Contract(NOTARY_ADDRESS_AVALANCHE, NotaryABI, nodeWalletAvalanche);

    const decimalsPolygon = await polygonUsdc.decimals();
    const decimalsAvalanche = await avalancheUsdc.decimals();

    const amountToSend = ethers.parseUnits("0.001", decimalsPolygon);
    const receiverAddress = userWalletPolygon.address;
    
    // Declarado aqui no topo para o bloco 'finally' conseguir acessar
    const txLog = []; 
    let depositID; 

    console.log("\n--- Iniciando Transação Mainnet (USDC): Polygon -> Avalanche ---");
    console.log(`Usuário enviando: 0.001 USDC`);

    try {
        // ==========================================
        // ETAPA 1: APPROVE NA POLYGON
        // ==========================================
        console.log("\n[1/3] Aprovando USDC na Polygon para o Notary...");
        try {
            let txApprove = await polygonUsdc.approve(NOTARY_ADDRESS_POLYGON, amountToSend);
            let receiptApprove = await txApprove.wait();

            const approvePolygonFee = receiptApprove.gasUsed * receiptApprove.gasPrice;

            txLog.push({
                step: "approve (Polygon)",
                gasUsed: receiptApprove.gasUsed.toString(),
                gasPriceWei: receiptApprove.gasPrice.toString(),
                gasPriceGwei: ethers.formatUnits(receiptApprove.gasPrice, "gwei"),
                transactionFeeWei: approvePolygonFee.toString(),
                transactionFee: ethers.formatEther(approvePolygonFee),
                nativeToken: "POL",
                txHash: receiptApprove.hash
            });

            console.log(`Aprovação concluída! Tx: ${receiptApprove.hash}`);
            console.log(`Transaction Fee: ${ethers.formatEther(approvePolygonFee)} POL`);
        } catch (error) {
            console.error("\n[ERRO - ETAPA 1] Falha ao aprovar USDC na Polygon.");
            console.error(error.reason || error.message);
            return; // Interrompe o fluxo e vai direto para o bloco 'finally'
        }

        // PAUSA ADICIONADA: Aguarda 5 segundos para o nó RPC sincronizar a permissão (allowance)
        console.log("Aguardando 5 segundos para propagação do allowance na rede...");
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // ==========================================
        // ETAPA 2: DEPOSIT NA POLYGON
        // ==========================================
        console.log("\n[2/3] Depositando USDC no Notary da Polygon...");
        try {
            let txDeposit = await polygonNotary.deposit(
                USDC_ADDRESS_POLYGON,
                amountToSend,
                "Avalanche",
                receiverAddress,
                { gasLimit: 500000 } // Evita o erro 'missing revert data'
            );
            let receiptDeposit = await txDeposit.wait();

            const depositPolygonFee = receiptDeposit.gasUsed * receiptDeposit.gasPrice;

            txLog.push({
                step: "deposit (Polygon)",
                gasUsed: receiptDeposit.gasUsed.toString(),
                gasPriceWei: receiptDeposit.gasPrice.toString(),
                gasPriceGwei: ethers.formatUnits(receiptDeposit.gasPrice, "gwei"),
                transactionFeeWei: depositPolygonFee.toString(),
                transactionFee: ethers.formatEther(depositPolygonFee),
                nativeToken: "POL",
                txHash: receiptDeposit.hash
            });

            const depositEvent = receiptDeposit.logs
                .map(log => {
                    try { return polygonNotary.interface.parseLog(log); }
                    catch { return null; }
                })
                .find(parsed => parsed && parsed.name === "Deposit");

            if (!depositEvent) throw new Error("Evento 'Deposit' não foi encontrado nos logs.");

            depositID = depositEvent.args.depositID;
            console.log(`Depósito realizado com sucesso! ID gerado: ${depositID.toString()}`);
            console.log(`Transaction Fee: ${ethers.formatEther(depositPolygonFee)} POL`);
        } catch (error) {
            console.error("\n[ERRO - ETAPA 2] Falha ao realizar o depósito na Polygon.");
            console.error(error.reason || error.message);
            return; // Interrompe o fluxo e vai direto para o bloco 'finally'
        }

        // ==========================================
        // ETAPA 3: EXECUTE BRIDGE NA AVALANCHE
        // ==========================================
        console.log("\n[3/3] Nó validador executando a ponte na Avalanche...");
        try {
            const saldoAntes = await avalancheUsdc.balanceOf(receiverAddress);

            let txExecute = await avalancheNotary.executeBridge(
                POLYGON_CHAIN_ID,
                depositID,
                USDC_ADDRESS_AVALANCHE,
                receiverAddress,
                amountToSend
            );
            let receiptExecute = await txExecute.wait();

            const executeAvalancheFee = receiptExecute.gasUsed * receiptExecute.gasPrice;

            txLog.push({
                step: "executeBridge (Avalanche)",
                gasUsed: receiptExecute.gasUsed.toString(),
                gasPriceWei: receiptExecute.gasPrice.toString(),
                gasPriceGwei: ethers.formatUnits(receiptExecute.gasPrice, "gwei"),
                transactionFeeWei: executeAvalancheFee.toString(),
                transactionFee: ethers.formatEther(executeAvalancheFee),
                nativeToken: "AVAX",
                txHash: receiptExecute.hash
            });

            const saldoDepois = await avalancheUsdc.balanceOf(receiverAddress);

            console.log(`Execução concluída! Tx: ${receiptExecute.hash}`);
            console.log(`Transaction Fee: ${ethers.formatEther(executeAvalancheFee)} AVAX`);
            console.log(`Saldo na Avalanche ANTES: ${ethers.formatUnits(saldoAntes, decimalsAvalanche)} USDC`);
            console.log(`Saldo na Avalanche DEPOIS: ${ethers.formatUnits(saldoDepois, decimalsAvalanche)} USDC`);
        } catch (error) {
            console.error("\n[ERRO - ETAPA 3] Falha na execução do validador na Avalanche.");
            console.error(error.reason || error.message);
            return; // Interrompe o fluxo e vai direto para o bloco 'finally'
        }

    } catch (globalError) {
        console.error("\n[ERRO FATAL] Ocorreu um erro inesperado:", globalError);
    } finally {
        // ==========================================
        // BLOCO FINALLY: Roda sempre, havendo erro ou não
        // ==========================================
        if (txLog.length > 0) {
            console.log("\n--- Resumo de gás (Fluxo executado até agora) ---");
            console.table(txLog);

            try {
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

                logTransaction("MAINNET", "Polygon -> Avalanche", stepsForLog);
                console.log("\n[LOGGER] Logs das transações salvas com sucesso!");
            } catch (logError) {
                console.error("\n[ERRO] Falha ao salvar os arquivos de log:", logError.message);
            }
        } else {
            console.log("\nNenhuma transação foi concluída para gerar log.");
        }
    }
}

main().catch(console.error);