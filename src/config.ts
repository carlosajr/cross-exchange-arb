import 'dotenv/config';

export const CFG = {
  symbol: process.env.SYMBOL ?? 'BTC/USDT',
  quoteBudget: Number(process.env.QUOTE_BUDGET ?? '100'),
  spreadMinBp: Number(process.env.SPREAD_MIN_BP ?? '8'),        // 0.08%
  slippageBufferBp: Number(process.env.SLIPPAGE_BUFFER_BP ?? '5'), // 0.05%
  staleMs: Number(process.env.STALE_MS ?? '1000'),
  dryRun: (process.env.DRY_RUN ?? 'true').toLowerCase() === 'true',
  feeTakerBp: Number(process.env.FEE_TAKER_BP ?? '10'),

  binance: {
    apiKey: process.env.BINANCE_API_KEY ?? '',
    secret: process.env.BINANCE_API_SECRET ?? ''
  },
  okx: {
    apiKey: process.env.OKX_API_KEY ?? '',
    secret: process.env.OKX_SECRET ?? '',
    password: process.env.OKX_PASSWORD ?? ''
  }
} as const;
