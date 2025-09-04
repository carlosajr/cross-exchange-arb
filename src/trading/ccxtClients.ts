import ccxt from 'ccxt';
import { CFG } from '../config';

export const binance = new ccxt.binance({
  apiKey: CFG.binance.apiKey,
  secret: CFG.binance.secret,
  enableRateLimit: true,
  options: { defaultType: 'spot' }
});

export const okx = new ccxt.okx({
  apiKey: CFG.okx.apiKey,
  secret: CFG.okx.secret,
  password: CFG.okx.password,
  enableRateLimit: true
});

export async function loadMarkets() {
  await binance.loadMarkets();
  await okx.loadMarkets();
}
