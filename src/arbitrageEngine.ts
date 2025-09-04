import pino from "pino";
import { BestBook, Venue } from "./types";
import { CFG } from "./config";
import { bpToPct, now, pct, roundDownToStep } from "./util";
import { binance, okx } from "./trading/ccxtClients";
import { OpportunityLogger } from "./opportunityLogger";

const log = pino({ level: "info", base: undefined });

export class ArbitrageEngine {
  private books: Record<Venue, BestBook | null> = { binance: null, okx: null };
  private trading = false;
  private opportunityLogger = new OpportunityLogger();

  async init() {
    // garante mercados carregados para saber step sizes e min notional
    await Promise.all([binance.loadMarkets(), okx.loadMarkets()]);
  }

  onBook(venue: Venue, book: BestBook) {
    this.books[venue] = book;
    this.maybeTrade();
  }

  private fresh(b?: BestBook | null) {
    return !!b && now() - b.ts <= CFG.staleMs;
  }

  private spreadPct(aBid: number, bAsk: number) {
    return (aBid - bAsk) / bAsk; // ganho se vendo em A e compro em B
  }

  private getMarketInfo() {
    const mB = binance.market(CFG.symbol);
    const mO = okx.market(CFG.symbol);
    return { mB, mO };
  }

  private async maybeTrade() {
    if (this.trading) return;

    const bnb = this.books.binance;
    const ok = this.books.okx;
    if (!this.fresh(bnb) || !this.fresh(ok)) return;

    // Verifica se ambas as exchanges têm dados válidos
    if (!bnb?.bid || !bnb?.ask || !ok?.bid || !ok?.ask) {
      log.warn(
        {
          binance: { bid: bnb?.bid, ask: bnb?.ask },
          okx: { bid: ok?.bid, ask: ok?.ask },
        },
        "Dados incompletos - aguardando preços válidos de ambas exchanges"
      );
      return;
    }

    const feePct = bpToPct(CFG.feeTakerBp) * 2; // 2 pontas
    const bufferPct = bpToPct(CFG.slippageBufferBp);
    const minPct = bpToPct(CFG.spreadMinBp) + feePct + bufferPct;

    // Cenário 1: vender na Binance (bid) e comprar na OKX (ask)
    const s1 = this.spreadPct(bnb.bid, ok.ask);
    // Cenário 2: vender na OKX (bid) e comprar na Binance (ask)
    const s2 = this.spreadPct(ok.bid, bnb.ask);

    // Verificar e registrar maior spread (independente de ser lucrativo)
    this.opportunityLogger.checkAndLogMaxSpread(
      CFG.symbol,
      "binance",
      "okx",
      bnb.bid,
      ok.ask,
      s1
    );
    
    this.opportunityLogger.checkAndLogMaxSpread(
      CFG.symbol,
      "okx",
      "binance",
      ok.bid,
      bnb.ask,
      s2
    );

    // Log das comparações de spread
    log.debug(
      {
        binance: { bid: bnb.bid, ask: bnb.ask },
        okx: { bid: ok.bid, ask: ok.ask },
        spreads: {
          s1_binance_to_okx: pct(s1),
          s2_okx_to_binance: pct(s2),
          min_required: pct(minPct),
        },
        profitable: {
          s1: s1 >= minPct,
          s2: s2 >= minPct,
        },
      },
      "Comparação de spreads"
    );

    if (s1 >= minPct) {
      // Registrar oportunidade apenas quando for executar o trade
      this.opportunityLogger.logOpportunity(
        CFG.symbol,
        "binance",
        "okx",
        bnb.bid,
        ok.ask,
        s1,
        true
      );
      await this.executeTrade("binance", "okx", bnb.bid, ok.ask);
    } else if (s2 >= minPct) {
      // Registrar oportunidade apenas quando for executar o trade
      this.opportunityLogger.logOpportunity(
        CFG.symbol,
        "okx",
        "binance",
        ok.bid,
        bnb.ask,
        s2,
        true
      );
      await this.executeTrade("okx", "binance", ok.bid, bnb.ask);
    }
  }

  private async executeTrade(
    sellVenue: Venue,
    buyVenue: Venue,
    sellPrice: number,
    buyPrice: number
  ) {
    if (this.trading) return;
    this.trading = true;

    try {
      const { baseQty } = await this.computeQty(
        buyVenue,
        buyPrice,
        sellVenue,
        sellPrice
      );
      if (baseQty <= 0) {
        log.warn({ baseQty }, "qty inválida");
        return;
      }

      const info = {
        symbol: CFG.symbol,
        buyVenue,
        sellVenue,
        buyPrice,
        sellPrice,
        baseQty,
      };

      const expectedSpread = (sellPrice - buyPrice) / buyPrice;
      log.info(
        { ...info, spread: pct(expectedSpread) },
        "SIGNAL: executar arbitragem"
      );

      if (CFG.dryRun) {
        log.warn("DRY_RUN=true → não vou enviar ordens.");
        return;
      }

      // use market orders para garantir execução (ajuste se preferir limit IOC)
      const [buyRes, sellRes] = await Promise.all([
        this.placeOrder(buyVenue, "buy", baseQty), // compra no venue barato
        this.placeOrder(sellVenue, "sell", baseQty), // vende no venue caro
      ]);

      log.info({ buyRes, sellRes }, "Ordens enviadas");
    } catch (e) {
      log.error(e, "Falha ao executar arbitragem");
    } finally {
      this.trading = false;
    }
  }

  private async computeQty(
    buyVenue: Venue,
    buyPrice: number,
    sellVenue: Venue,
    sellPrice: number
  ) {
    const quoteBudget = CFG.quoteBudget; // USDT por trade
    const targetBaseQty = quoteBudget / buyPrice;

    // Ajuste para step size / min qty / min cost por venue
    const { mB, mO } = this.getMarketInfo();

    const steps = {
      binance: Number(
        mB.limits?.amount?.min ??
          (mB.precision?.amount ? Math.pow(10, -mB.precision.amount) : 1e-6)
      ),
      okx: Number(
        mO.limits?.amount?.min ??
          (mO.precision?.amount ? Math.pow(10, -mO.precision.amount) : 1e-6)
      ),
    };

    let qBuy = roundDownToStep(targetBaseQty, steps[buyVenue]);
    let qSell = roundDownToStep(targetBaseQty, steps[sellVenue]);

    // usar a menor entre as duas pra garantir que ambas executem
    const baseQty = Math.min(qBuy, qSell);

    // valida min notional
    const minNotionalOK = (venue: Venue, qty: number, px: number) => {
      const m = venue === "binance" ? mB : mO;
      const minCost = m.limits?.cost?.min ?? 0;
      return qty * px >= (minCost || 0);
    };

    if (
      !minNotionalOK(buyVenue, baseQty, buyPrice) ||
      !minNotionalOK(sellVenue, baseQty, sellPrice)
    ) {
      return { baseQty: 0 };
    }

    return { baseQty };
  }

  private async placeOrder(venue: Venue, side: "buy" | "sell", amount: number) {
    const ex = venue === "binance" ? binance : okx;
    // market order em CCXT: createOrder(symbol, type, side, amount, price?, params?)
    return ex.createOrder(CFG.symbol, "market", side, amount);
  }
}
