# Cross-Exchange Arbitrage (Node + TypeScript)

Esqueleto para arbitragem **spot BTC/USDT** entre **Binance** e **OKX** com dados por **WebSocket** e execução via **REST** (usando `ccxt`).

## Pré-requisitos
- Node 18+
- Yarn ou npm
- Chaves de API (Binance e OKX)

## Instalação
```bash
yarn
cp .env.example .env
# edite .env com suas chaves
```

## Rodar em desenvolvimento
```bash
yarn dev
```

## Build / produção
```bash
yarn build
node dist/index.js
```

> Por padrão `DRY_RUN=true` no `.env` para evitar envios de ordem durante testes.

## Estrutura
- **src/exchanges**: clientes WebSocket (Binance/OKX) para best bid/ask
- **src/trading**: clientes CCXT para envio de ordens
- **src/arbitrageEngine.ts**: lógica de sinal e execução
- **src/index.ts**: bootstrap

Ajuste `SPREAD_MIN_BP`, `FEE_TAKER_BP` e `SLIPPAGE_BUFFER_BP` conforme seu custo/risco.
