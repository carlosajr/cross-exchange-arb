import { CFG } from './config';
import { BinanceWS } from './exchanges/binance.ws';
import { OKXWS } from './exchanges/okx.ws';
import { ArbitrageEngine } from './arbitrageEngine';

async function main() {
  const engine = new ArbitrageEngine();
  await engine.init();

  const binanceWS = new BinanceWS(CFG.symbol, (book) => engine.onBook('binance', book));
  const okxWS = new OKXWS(CFG.symbol, (book) => engine.onBook('okx', book));

  binanceWS.start();
  okxWS.start();

  process.on('SIGINT', () => {
    console.log('bye');
    binanceWS.stop();
    okxWS.stop();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
