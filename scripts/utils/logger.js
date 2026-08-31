const fs = require("fs");
const path = require("path");

/**
 * Salva o log de uma transação.
 * @param {string} environment - "MAINNET" ou "TESTNET"
 * @param {string} flow - Ex: "Avalanche -> Polygon"
 * @param {Array} steps - Array com os passos e seus respectivos gasUsed e txHash
 */
function logTransaction(environment, flow, steps) {
    // Define o caminho da pasta raiz/logs
    const logsDir = path.join(__dirname, "../../logs");
    
    // Cria a pasta logs se não existir
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    // Separa os arquivos por rede
    const isMainnet = environment.toUpperCase() === "MAINNET";
    const fileName = isMainnet ? "mainnet_logs.json" : "testnet_logs.json";
    const filePath = path.join(logsDir, fileName);

    let logs = [];
    
    // Lê o arquivo existente, se houver
    if (fs.existsSync(filePath)) {
        try {
            const fileContent = fs.readFileSync(filePath, "utf8");
            logs = JSON.parse(fileContent);
        } catch (error) {
            console.error("Erro ao ler log anterior, iniciando novo array de logs.");
        }
    }

    // Calcula o gás total somando os passos
    const totalGas = steps.reduce((acc, step) => acc + Number(step.gasUsed), 0);

    // Monta o novo registro
    const logEntry = {
        timestamp: new Date().toISOString(),
        environment: environment.toUpperCase(),
        flow: flow,
        totalGasUsed: totalGas.toString(),
        steps: steps
    };

    // Adiciona o novo registro e salva o arquivo
    logs.push(logEntry);
    fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), "utf8");
    
    console.log(`\n💾 [LOGGER] Dados da transação salvos em: logs/${fileName}`);
}

module.exports = { logTransaction };