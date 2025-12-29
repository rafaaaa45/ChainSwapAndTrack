# ChainGuard - Universal Blockchain Transaction Validator

Sistema simples e eficiente para validar transações em múltiplas blockchains.

## 📋 Estrutura do Projeto

```
ChainGuard_Project/
├── server.js           # Servidor orchestrator (Express)
├── drivers.js          # Drivers manuais para cada tipo de blockchain
├── rpc-fetcher.js      # Busca automática de RPCs públicos
├── index.html          # Interface frontend
├── networks.json       # Configuração de redes (persistência)
├── package.json
└── fetchers/
    └── sample-fetcher.js  # (legacy - pode ser removido)
```

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
npm install
```

### 2. Iniciar o Servidor

```bash
npm start
```

O servidor irá rodar em `http://localhost:3000`

### 3. Abrir o Frontend

Abrir `index.html` no navegador ou aceder a `http://localhost:3000/index.html`

## 🔧 Funcionalidades

### Validar Transação
- Seleciona uma rede (ETH, BTC, SOL, etc.)
- Insere o hash da transação
- Obtém detalhes completos da transação

### Adicionar Nova Rede
- Fornece o símbolo (ETH, BTC, DOGE, etc.)
- Seleciona o tipo (EVM, UTXO, Solana)
- O sistema busca automaticamente RPCs públicos do chainlist.org
- Ou fornece um RPC manualmente

## 🌐 Redes Pré-Configuradas

- **ETH** (Ethereum) - EVM
- **BSC** (Binance Smart Chain) - EVM
- **MATIC** (Polygon) - EVM
- **BTC** (Bitcoin) - UTXO
- **LTC** (Litecoin) - UTXO
- **SOLANA** - Solana

## 🔌 API Endpoints

### GET `/api/networks`
Lista todas as redes configuradas

### POST `/api/validate`
Valida uma transação
```json
{
  "chain": "ETH",
  "hash": "0x..."
}
```

### POST `/api/add-network`
Adiciona uma nova rede
```json
{
  "symbol": "DOGE",
  "type": "UTXO",
  "rpc": "https://..." // opcional
}
```

### GET `/api/rpcs/:chain`
Obtém RPCs disponíveis para uma chain

## 📦 Drivers

### EVM (Ethereum, Polygon, BSC, etc.)
- Usa JSON-RPC `eth_getTransactionByHash`
- Obtém receipt com `eth_getTransactionReceipt`

### UTXO (Bitcoin, Litecoin, etc.)
- Usa BlockCypher API
- Retorna inputs/outputs completos

### Solana
- Usa JSON-RPC `getTransaction`
- Inclui metadados completos

## 🌍 Fonte de RPCs

Os RPCs são obtidos de:
1. **chainlist.org** (API pública) - Automático
2. **Fallback** - Lista hardcoded de RPCs confiáveis

## 🛠️ Tecnologias

- **Backend**: Node.js + Express
- **Frontend**: HTML + JavaScript puro
- **HTTP Client**: Axios
- **Persistência**: JSON file (networks.json)

## 📝 Notas

- Sistema 100% manual (sem AI)
- RPCs públicos e gratuitos
- Suporte para múltiplas blockchains
- Extensível para adicionar novas redes
