export type BestBook = {
  bid: number;
  ask: number;
  bidSize?: number;
  askSize?: number;
  ts: number; // epoch ms
};

export type Side = 'buy' | 'sell';

export type Venue = 'binance' | 'okx';
