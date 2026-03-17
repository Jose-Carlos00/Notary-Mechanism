
### 1. Guia de Execução
### 1.1. Instalação de Dependências

Certifique-se de ter Node.js e npm instalados. Navegue até a pasta raiz do projeto e execute:

```bash
npm install
```

### 1.2. Configuração de Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto e preencha com as variáveis necessárias. Estas variáveis incluem as URLs dos nós RPC das redes (e.g., Alchemy ou Infura) e as chaves privadas das contas que serão utilizadas.

```dotenv
# URLs dos Nós RPC (Substitua por suas chaves de API válidas)
NODE_URL_SEPOLIA="https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY_SEPOLIA"
NODE_URL_AMOY="https://polygon-amoy.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY_AMOY"
NODE_URL_FUJI="https://api.avax-test.network/ext/bc/C/rpc"

# Chaves Privadas das Contas (Nunca exponha em um repositório público!)
# Certifique-se que estas contas possuem fundos (ETH/MATIC) nas respectivas redes de teste
SEPOLIA_PRIVATE_KEY01="sua_chave_privada_sepolia_conta_1"
SEPOLIA_PRIVATE_KEY02="sua_chave_privada_sepolia_conta_2"
AMOY_PRIVATE_KEY01="sua_chave_privada_amoy_conta_1"
AMOY_PRIVATE_KEY02="sua_chave_privada_amoy_conta_2"
FUJI_PRIVATE_KEY01="sua_chave_privada_amoy_conta_1"
FUJI_PRIVATE_KEY02="sua_chave_privada_amoy_conta_2"

# Endereços dos Contratos (Serão gerados após o deploy)
# ATUALIZE ESTES VALORES APÓS CADA DEPLOY
TOKEN_ADDRESS_SEPOLIA="0x..."
NOTARY_ADDRESS_SEPOLIA="0x..."
TOKEN_ADDRESS_AMOY="0x..."
NOTARY_ADDRESS_AMOY="0x..."
TOKEN_ADDRESS_Fuji="0x..."
NOTARY_ADDRESS_Fuji="0x..."
```

### 4.3. Implantação dos Contratos (Deploy)

Os contratos `Token.sol` e `Notary.sol` devem ser implantados em ambas as redes.

```bash
# Implantação na Rede Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Implantação na Rede Amoy
npx hardhat run scripts/deploy.js --network amoy

# Implantação na Rede Fuji
npx hardhat run scripts/deploy.js --network fuji
```

**Importante:** Após cada execução bem-sucedida dos comandos de deploy, **atualize os endereços dos contratos** (Token e Notary) em seu arquivo `.env` com os valores exibidos no console.

### 1.4. Registro de Notários (Stake)

Após a implantação, é necessário que um endereço se torne um notário (staker) bloqueando tokens ERC-20 no contrato `Notary.sol` da respectiva rede.

```bash
npx hardhat run scripts/stake.js
```

Este script executa o processo de aprovação e stake nas redes Sepolia e Amoy. Certifique-se de que as contas utilizadas para stake possuem o saldo necessário dos tokens ERC-20 implantados.

### 1.5. Execução da Transação Inter-cadeia

Com os contratos implantados e os notários registrados, a transação inter-cadeia pode ser iniciada com os dois scripts a seguir:


#### 1.5.1. Transferência de Sepolia para Amoy

```bash
npx hardhat run scripts/transactionSepoliaToAmoy.js
```
#### 1.5.2. Transferência de Amoy para Sepolia

```bash
npx hardhat run scripts/transactionAmoyToSepolia.js
```
#### 1.5.3. Transferência de Sepolia para Fuji
```bash
npx hardhat run scripts/transactionSepoliatoFuji.js 
```
#### 1.5.3. Transferência de FUji para Sepolia
```bash
 npx hardhat run scripts/transactionFujitoSepolia.js 
```
### Obs. Não fazer deploy da Amoy se quer testar Sepolia para Fuji, por conta do ID da Sepolia rodar primeiro com AMoy ira dar erro na Transferencia com a Fuji pois o ID não estará Livre.
