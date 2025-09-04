import WebSocket from 'ws';
import { BestBook } from '../types';

type Handler = (b: BestBook) => void;

/**
 * Conecta no stream de bookTicker da Binance (spot).
 * Doc: wss://stream.binance.com:9443/ws/<symbol>@bookTicker
 */
export class BinanceWS {
  private ws?: WebSocket;
  private url: string;

  constructor(symbol: string, private onBook: Handler) {
    const stream = symbol.replace('/', '').toLowerCase() + '@bookTicker';
    this.url = `wss://stream.binance.com:9443/ws/${stream}`;
  }

  start() {
    this.ws = new WebSocket(this.url);
    this.ws.on('open', () => console.log('[binance] ws open'));
    this.ws.on('close', () => console.log('[binance] ws close'));
    this.ws.on('error', (e) => console.error('[binance] ws error', e));
    this.ws.on('message', (raw) => {
      try {
        const m = JSON.parse(raw.toString());
        // campos: b (best bid), B (bid size), a (best ask), A (ask size)
        const book: BestBook = {
          bid: parseFloat(m.b),
          ask: parseFloat(m.a),
          bidSize: parseFloat(m.B),
          askSize: parseFloat(m.A),
          ts: m.E ?? Date.now()
        };
        this.onBook(book);
      } catch (e) {
        // ignore
      }
    });
  }

  stop() {
    this.ws?.close();
  }
}
