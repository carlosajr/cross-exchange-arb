import WebSocket from 'ws';
import { BestBook } from '../types';

type Handler = (b: BestBook) => void;

/**
 * OKX v5 public WS - canal "tickers"
 * Endpoint: wss://ws.okx.com:8443/ws/v5/public
 * Sub payload: { op:"subscribe", args:[{ channel:"tickers", instId:"BTC-USDT" }] }
 * OBS: na OKX o símbolo spot usa hífen (BTC-USDT)
 */
export class OKXWS {
  private ws?: WebSocket;
  private url = 'wss://ws.okx.com:8443/ws/v5/public';
  private instId: string;

  constructor(symbol: string, private onBook: Handler) {
    this.instId = symbol.replace('/', '-'); // BTC/USDT -> BTC-USDT
  }

  start() {
    this.ws = new WebSocket(this.url);
    this.ws.on('open', () => {
      console.log('[okx] ws open');
      const sub = {
        op: 'subscribe',
        args: [{ channel: 'tickers', instId: this.instId }]
      };
      this.ws?.send(JSON.stringify(sub));
    });
    this.ws.on('close', () => console.log('[okx] ws close'));
    this.ws.on('error', (e) => console.error('[okx] ws error', e));
    this.ws.on('message', (raw) => {
      try {
        const m = JSON.parse(raw.toString());
        if (!m.data || !Array.isArray(m.data)) return;
        
        const d = m.data[0];
        // OKX "tickers" possui bidPx e askPx (strings)
        const book: BestBook = {
          bid: parseFloat(d.bidPx),
          ask: parseFloat(d.askPx),
          ts: Number(d.ts)
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
