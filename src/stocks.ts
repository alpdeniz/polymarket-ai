import YahooFinance from "yahoo-finance2";

// ---------------------------------------------------------------------------
// Default stock universe — diversified global coverage
// ---------------------------------------------------------------------------

const DEFAULT_UNIVERSE: string[] = [
  // US Technology
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "ORCL",
  "CRM", "AMD", "INTC", "ADBE", "NFLX", "CSCO", "QCOM", "TXN", "NOW", "UBER",
  // US Financials
  "JPM", "BAC", "WFC", "GS", "MS", "BLK", "AXP", "V", "MA", "PYPL", "SCHW",
  // US Healthcare
  "JNJ", "UNH", "PFE", "ABBV", "MRK", "LLY", "TMO", "ABT", "BMY", "AMGN",
  // US Consumer
  "WMT", "PG", "KO", "PEP", "COST", "MCD", "NKE", "SBUX", "HD", "LOW", "TGT",
  // US Industrials
  "CAT", "GE", "HON", "BA", "UPS", "RTX", "DE", "LMT",
  // Space & Aerospace
  "LUNR", "RKLB", "SPCE", "RDW", "ASTS", "BKSY", "PL", "MNTS", "ASTR",
  // US Energy
  "XOM", "CVX", "COP", "SLB", "EOG", "MPC", "OXY",
  // US Telecom / Utilities
  "DIS", "CMCSA", "T", "VZ", "NEE", "DUK",
  // European (US-listed ADRs)
  "ASML", "SAP", "NVO", "AZN", "SHEL", "TTE", "UL", "DEO", "GSK", "SNY",
  // Asian (US-listed ADRs)
  "TSM", "BABA", "JD", "PDD", "SONY", "TM", "HMC", "MUFG", "INFY", "WIT",
  // Crypto
  "BTC-USD", "ETH-USD",
  // Commodities
  "GC=F", "SI=F", "CL=F",
  // Major ETFs (sector / market context)
  "SPY", "QQQ", "IWM", "EEM", "VGK", "EWJ", "XLF", "XLE", "XLV", "XLK",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProcessedStock {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  marketCap: number;
  volume: number;
  avgVolume: number;
  pe: number | null;
  forwardPe: number | null;
  dividendYield: number | null;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  pctFrom52wHigh: string;
  pctFrom52wLow: string;
  change1d: string;
  change7d: string;
  change1m: string;
  change1y: string;
  price1dAgo: number | null;
  price7dAgo: number | null;
  price1mAgo: number | null;
  price1yAgo: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PricePoint {
  date: Date;
  close: number | null;
}

function findClosestPrice(quotes: PricePoint[], target: Date): number | null {
  let closest: number | null = null;
  let minDiff = Infinity;
  for (const q of quotes) {
    if (q.close == null) continue;
    const diff = Math.abs(q.date.getTime() - target.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = q.close;
    }
  }
  return closest;
}

function pctChange(current: number, past: number | null): string {
  if (past == null || past === 0) return "N/A";
  const change = ((current - past) / past) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
}

function pctFromLevel(current: number, level: number): string {
  if (!level) return "N/A";
  const pct = ((current - level) / level) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getStockUniverse(): string[] {
  if (process.env.STOCK_UNIVERSE) {
    return process.env.STOCK_UNIVERSE.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return DEFAULT_UNIVERSE;
}

const BATCH_SIZE = 15;

export async function fetchStockUniverse(): Promise<ProcessedStock[]> {
  const yf = new YahooFinance();
  const symbols = getStockUniverse();
  const now = Date.now();
  const results: ProcessedStock[] = [];

  const targets = {
    d1: new Date(now - 1 * 86400000),
    d7: new Date(now - 7 * 86400000),
    m1: new Date(now - 30 * 86400000),
    y1: new Date(now - 365 * 86400000),
  };

  const totalBatches = Math.ceil(symbols.length / BATCH_SIZE);

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    console.log(`  Batch ${batchNum}/${totalBatches}: ${batch.join(", ")}`);

    const batchResults = await Promise.all(
      batch.map(async (symbol): Promise<ProcessedStock | null> => {
        try {
          const [chart, quoteData] = await Promise.all([
            yf.chart(symbol, {
              period1: new Date(now - 400 * 86400000),
              interval: "1d",
            }),
            yf.quote(symbol).catch(() => null),
          ]);

          const price = chart.meta.regularMarketPrice;
          if (!price) return null;

          const quotes = chart.quotes as PricePoint[];
          const p1d = findClosestPrice(quotes, targets.d1);
          const p7d = findClosestPrice(quotes, targets.d7);
          const p1m = findClosestPrice(quotes, targets.m1);
          const p1y = findClosestPrice(quotes, targets.y1);

          const q: any = quoteData || {};

          const high52 = q.fiftyTwoWeekHigh || 0;
          const low52 = q.fiftyTwoWeekLow || 0;

          return {
            symbol,
            name: q.shortName || q.longName || (chart.meta as any).shortName || symbol,
            price,
            currency: q.currency || (chart.meta as any).currency || "USD",
            marketCap: q.marketCap || 0,
            volume: q.regularMarketVolume || (chart.meta as any).regularMarketVolume || 0,
            avgVolume: q.averageDailyVolume3Month || 0,
            pe: q.trailingPE ?? null,
            forwardPe: q.forwardPE ?? null,
            dividendYield: q.trailingAnnualDividendYield ?? null,
            fiftyTwoWeekHigh: high52,
            fiftyTwoWeekLow: low52,
            pctFrom52wHigh: pctFromLevel(price, high52),
            pctFrom52wLow: pctFromLevel(price, low52),
            change1d: pctChange(price, p1d),
            change7d: pctChange(price, p7d),
            change1m: pctChange(price, p1m),
            change1y: pctChange(price, p1y),
            price1dAgo: p1d,
            price7dAgo: p7d,
            price1mAgo: p1m,
            price1yAgo: p1y,
          };
        } catch (err) {
          console.warn(`  ⚠ ${symbol}: ${(err as Error).message}`);
          return null;
        }
      }),
    );

    results.push(...batchResults.filter((r): r is ProcessedStock => r !== null));
  }

  console.log(`Fetched ${results.length}/${symbols.length} stocks successfully`);
  return results;
}
