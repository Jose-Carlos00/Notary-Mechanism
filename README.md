# Interoperabilidade entre Blockchains

# 1. Guia de Execução

## 1.1. Instalação de Dependências

Certifique-se de possuir Node.js e npm instalados.

Na pasta raiz do projeto, execute:

```bash
npm install
```

---

# 2. Configuração das Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto.

As variáveis utilizadas atualmente pelo projeto são:

```dotenv
# URLs dos Nós RPC
NODE_URL_AMOY="https://polygon-amoy.drpc.org"
NODE_URL_FUJI="https://api.avax-test.network/ext/bc/C/rpc"

# Chaves privadas das contas
# NUNCA publique essas informações em um repositório.
# As contas precisam possuir saldo do token nativo da rede
# para pagamento das taxas de transação.

AMOY_PRIVATE_KEY01=""
AMOY_PRIVATE_KEY02=""

FUJI_PRIVATE_KEY01=""
FUJI_PRIVATE_KEY02=""

# Endereços dos contratos implantados
# Atualize após realizar o deploy.

TOKEN_ADDRESS_AMOY=""
NOTARY_ADDRESS_AMOY=""

TOKEN_ADDRESS_FUJI=""
NOTARY_ADDRESS_FUJI=""

# Endereço do token ERC-20 utilizado nos testes.
#
# Apesar do nome LINK_ADDRESS, o contrato Notary NÃO é
# limitado ao token LINK. Essas variáveis armazenam o
# endereço do token ERC-20 escolhido para o teste.

LINK_ADDRESS_AMOY=""
LINK_ADDRESS_FUJI=""
```

### Importante sobre `LINK_ADDRESS`

Os scripts atuais utilizam as variáveis:

```dotenv
LINK_ADDRESS_AMOY=""
LINK_ADDRESS_FUJI=""
```

O nome `LINK_ADDRESS` foi adotado nos scripts porque o token utilizado nos testes atuais é o LINK.

Entretanto, o contrato `Notary.sol` não possui nenhuma dependência específica do LINK.

O endereço do token é recebido diretamente pelas funções do contrato:

```solidity
stake(address token, uint256 amount)
```

```solidity
deposit(
    address token,
    uint256 amount,
    string memory destinationChain,
    address receiver
)
```

```solidity
executeBridge(
    uint256 originChainId,
    uint256 originChainDepositID,
    address token,
    address receiver,
    uint256 amount
)
```

Consequentemente, o mecanismo pode trabalhar com **qualquer token compatível com ERC-20**, desde que o endereço do contrato desse token seja utilizado nas operações.

Para utilizar outro token nos scripts, seria necessário apenas substituir os endereços e, caso desejado, alterar o nome das variáveis para refletir o token utilizado.

---

# 3. Compilação

Antes de realizar o deploy ou executar os testes, compile os contratos:

```bash
npx hardhat compile
```

O script `deploy.js` também executa a compilação automaticamente antes do deploy.

---

# 4. Implantação dos Contratos

O projeto possui dois contratos principais:

* `Token.sol`: token ERC-20 próprio do projeto, utilizado para testes;
* `Notary.sol`: contrato responsável pelo mecanismo de stake, depósito e execução da transferência.

O contrato `Notary.sol` pode trabalhar com tokens ERC-20 externos, portanto o funcionamento da ponte não depende do `Token.sol`.

## 4.1. Deploy na Polygon Amoy

Execute:

```bash
npx hardhat run scripts/deploy.js --network amoy
```

O script identificará a rede através do Chain ID `80002` e utilizará:

```dotenv
AMOY_PRIVATE_KEY01=""
AMOY_PRIVATE_KEY02=""
```

Após o deploy, serão exibidos os endereços dos contratos:

```text
Token address: 0x...
Notary address: 0x...
```

Atualize então:

```dotenv
TOKEN_ADDRESS_AMOY="0x..."
NOTARY_ADDRESS_AMOY="0x..."
```

---

## 4.2. Deploy na Avalanche Fuji

Execute:

```bash
npx hardhat run scripts/deploy.js --network fuji
```

O script identificará a rede através do Chain ID `43113` e utilizará:

```dotenv
FUJI_PRIVATE_KEY01=""
FUJI_PRIVATE_KEY02=""
```

Após o deploy, atualize:

```dotenv
TOKEN_ADDRESS_FUJI="0x..."
NOTARY_ADDRESS_FUJI="0x..."
```

---


## 5. Executando o Stake

O script atual realiza um stake de:

Execute:

```bash
npx hardhat run scripts/stake.js
```

Atualmente, o script utiliza o endereço armazenado em:

```dotenv
LINK_ADDRESS_AMOY=""
LINK_ADDRESS_FUJI=""
```

# 6. Transferência Amoy → Fuji

O script responsável por esse fluxo é:

```text
scripts/transactionAmoyToFuji.js
```

Execute:

```bash
npx hardhat run scripts/transactionAmoyToFuji.js
```

O fluxo é:

```text
USUÁRIO
  |
  | approve()
  v
Notary Amoy
  |
  | deposit()
  v
Depósito registrado
  |
  | depositID
  v
Nó na Fuji
  |
  | executeBridge()
  v
Receiver na Fuji
```

O script utiliza:

```javascript
const amountToSend = ethers.parseUnits("0.1", 18);
```

Portanto, atualmente o teste realiza uma operação de `0,1` unidade do token configurado.

O `depositID` é obtido diretamente do evento `Deposit` gerado pela transação:

```javascript
const depositEvent = receipt.logs
    .map(log => {
        try {
            return amoyNotary.interface.parseLog(log);
        }
        catch {
            return null;
        }
    })
    .find(parsed => parsed && parsed.name === "Deposit");

const depositID = depositEvent.args.depositID;
```

A execução na Fuji utiliza o Chain ID da Amoy:

```text
80002
```

como `originChainId`.

---

# 7. Transferência Fuji → Amoy

O script responsável por esse fluxo é:

```text
scripts/transactionFujiToAmoy.js
```

Execute:

```bash
npx hardhat run scripts/transactionFujiToAmoy.js
```

O fluxo é:

```text
USUÁRIO
  |
  | approve()
  v
Notary Fuji
  |
  | deposit()
  v
Depósito registrado
  |
  | depositID
  v
Nó na Amoy
  |
  | executeBridge()
  v
Receiver na Amoy
```

O teste também utiliza atualmente:

```javascript
const amountToSend = ethers.parseUnits("0.1", 18);
```

Na execução da ponte, o Chain ID da Fuji é informado como:

```text
43113
```

---


# 8. Sequência Recomendada de Execução

Depois de configurar o `.env`, a sequência de execução recomendada é:

## 8.1. Compilar os contratos

```bash
npx hardhat compile
```

## 8.2. Fazer deploy na Amoy

```bash
npx hardhat run scripts/deploy.js --network amoy
```

Atualize:

```dotenv
TOKEN_ADDRESS_AMOY="0x..."
NOTARY_ADDRESS_AMOY="0x..."
```

## 8.3. Fazer deploy na Fuji

```bash
npx hardhat run scripts/deploy.js --network fuji
```

Atualize:

```dotenv
TOKEN_ADDRESS_FUJI="0x..."
NOTARY_ADDRESS_FUJI="0x..."
```

## 8.4. Configurar o token utilizado

Preencha os endereços do token ERC-20 escolhido:

```dotenv
LINK_ADDRESS_AMOY="0x..."
LINK_ADDRESS_FUJI="0x..."
```

Esses nomes são apenas os nomes atuais das variáveis utilizadas pelos scripts. O endereço pode corresponder a qualquer token ERC-20 compatível que será utilizado no teste.

## 8.5. Realizar o stake

```bash
npx hardhat run scripts/stake.js
```

## 8.6. Executar Amoy → Fuji

```bash
npx hardhat run scripts/transactionAmoyToFuji.js
```

## 8.7. Executar Fuji → Amoy

```bash
npx hardhat run scripts/transactionFujiToAmoy.js
```

---
# 9. Alteração dos Valores de Stake e Transferência

Os valores utilizados nos testes podem ser alterados diretamente nos scripts JavaScript. É importante observar que o valor informado é expresso na unidade do token considerando suas casas decimais.

## 9.1. Alterar o valor do Stake

O valor utilizado pelo script `stake.js` é definido na linha:

```javascript
const stakeAmount = ethers.parseUnits("1.0", 18);
```

Arquivo:

```text
scripts/stake.js
```

Para alterar o valor do stake, modifique o primeiro parâmetro de `parseUnits`.

## 19.2. Alterar o valor da transferência Amoy → Fuji

No arquivo:

```text
scripts/transactionAmoyToFuji.js
```

o valor da transferência é definido na linha:

```javascript
const amountToSend = ethers.parseUnits("0.1", 18);
```

Atualmente, o script envia:

```text
0,1 token
```

## 9.3. Alterar o valor da transferência Fuji → Amoy

No arquivo:

```text
scripts/transactionFujiToAmoy.js
```

o valor é definido na mesma estrutura:

```javascript
const amountToSend = ethers.parseUnits("0.1", 18);
```

## 9.4. Relação entre o Stake e o valor máximo da transferência

Alterar o valor da transferência não depende apenas de modificar `amountToSend`.

O contrato `Notary.sol` impõe um limite baseado no stake do nó:

```solidity
if (amount > stakes[token][msg.sender] / 10)
    revert NotEnoughStake();
```

Isso significa que o valor máximo que um nó pode executar em uma única operação corresponde a **10% do seu stake**.

Por exemplo:

| Stake do nó | Transferência máxima |
| ----------: | -------------------: |
|     1 token |            0,1 token |
|    5 tokens |            0,5 token |
|   10 tokens |              1 token |
|   20 tokens |             2 tokens |
|  100 tokens |            10 tokens |

Portanto, para aumentar o valor da transferência, pode ser necessário aumentar também o stake realizado pelo nó.


## 9.6. Resumo dos locais que precisam ser alterados

| O que deseja alterar      | Arquivo                            | Código a modificar                                   |
| ------------------------- | ---------------------------------- | ---------------------------------------------------- |
| Valor do stake            | `scripts/stake.js`                 | `const stakeAmount = ethers.parseUnits("1.0", 18);`  |
| Transferência Amoy → Fuji | `scripts/transactionAmoyToFuji.js` | `const amountToSend = ethers.parseUnits("0.1", 18);` |
| Transferência Fuji → Amoy | `scripts/transactionFujiToAmoy.js` | `const amountToSend = ethers.parseUnits("0.1", 18);` |
| Taxa da ponte             | `contracts/Notary.sol`             | `BRIDGE_FEE_PERCENTAGE = 5`                          |
| Stake mínimo              | `contracts/Notary.sol`             | `MINIMUM_STAKE_UNITS = 1`                            |
| Período de bloqueio       | `contracts/Notary.sol`             | `LOCK_PERIOD = 60`                                   |

### Observação

Alterar `stakeAmount` ou `amountToSend` nos scripts **não altera o contrato implantado**. Essas alterações apenas modificam os valores utilizados pelas próximas execuções dos scripts.

---

---

## Variáveis de Ambiente da Mainnet

Adicione as seguintes variáveis ao arquivo `.env`:

```dotenv
# URLs dos Nós RPC da Mainnet
NODE_URL_POLYGON="https://polygon-rpc.com"
NODE_URL_AVALANCHE="https://api.avax.network/ext/bc/C/rpc"

# Chaves Privadas das Contas da Mainnet
# Essas contas precisam possuir POL/MATIC e AVAX reais
# para pagamento das taxas de transação.

POLYGON_PRIVATE_KEY01=""
AVALANCHE_PRIVATE_KEY01=""

# Endereços dos contratos Notary na Mainnet
# Preencher após o deploy.

NOTARY_ADDRESS_POLYGON=""
NOTARY_ADDRESS_AVALANCHE=""

# Endereços do token ERC-20 utilizado na Mainnet.
# Pode ser USDC ou outro token ERC-20 compatível.

USDC_ADDRESS_POLYGON=""
USDC_ADDRESS_AVALANCHE=""
```

Os nomes `USDC_ADDRESS_POLYGON` e `USDC_ADDRESS_AVALANCHE` são utilizados como exemplo. O `Notary.sol` não exige especificamente USDC e pode trabalhar com outro token ERC-20, desde que o endereço correspondente seja utilizado nas operações.

## Deploy na Mainnet

Os contratos devem ser implantados nas redes principais antes de realizar as operações.

### Deploy na Polygon Mainnet

```bash
npx hardhat run scripts/deploy.js --network polygon
```

### Deploy na Avalanche C-Chain

```bash
npx hardhat run scripts/deploy.js --network avalanche
```

Após o deploy, atualize o `.env` com os endereços gerados:

```dotenv
NOTARY_ADDRESS_POLYGON="0x..."
NOTARY_ADDRESS_AVALANCHE="0x..."
```


## Executando o Stake na Mainnet

```text
scripts/stakeMainnet.js
```

a execução poderá ser realizada separadamente em cada rede.

### Stake na Polygon

```bash
npx hardhat run scripts/stakeMainnet.js --network polygon
```

### Stake na Avalanche

```bash
npx hardhat run scripts/stakeMainnet.js --network avalanche
```


## Transferência Avalanche → Polygon (Mainnet)

O fluxo de transferência da Avalanche para a Polygon poderá ser implementado pelo script:

```text
scripts/transactionAvalancheToPolygon.js
```

Execute:

```bash
npx hardhat run scripts/transactionAvalancheToPolygon.js
```


## Transferência Polygon → Avalanche (Mainnet)

O fluxo inverso poderá ser implementado pelo script:

```text
scripts/transactionPolygonToAvalanche.js
```

Execute:

```bash
npx hardhat run scripts/transactionPolygonToAvalanche.js
```



