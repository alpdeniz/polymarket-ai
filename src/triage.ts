import model from "./models";
import { ProcessedStock } from "./stocks";
import { getNews } from "./news";

// ---------------------------------------------------------------------------
// Triage prompt — fast first pass to shortlist the most promising stocks
// ---------------------------------------------------------------------------

const TRIAGE_SYSTEM = `\
You are a stock screening engine. Your ONLY job is to select the stocks most likely to contain a profitable opportunity from a large universe.

Selection criteria (in priority order):
1. MOMENTUM — Strong recent price appreciation (positive 1d/7d/1m) with above-average volume. Trend is your friend.
2. VALUE — Trading significantly below 52-week high with low PE relative to sector, strong fundamentals. Market is underpricing the stock.
3. RECOVERY — Dropped >20% from 52-week high but has strong fundamentals (reasonable PE, high market cap). Mean-reversion play.
4. BREAKOUT — Near 52-week high with accelerating volume. Likely to break through resistance.
5. GROWTH — Strong 1-year returns indicating sustained growth trajectory. Forward PE lower than trailing PE suggests accelerating earnings.
6. YIELD — High dividend yield (>3%) with sustainable payout and stable/growing price. Income play.
7. SECTOR_ROTATION — Sector showing relative strength vs broad market (compare individual stocks to ETF benchmarks).

Rejection criteria (skip these):
• Illiquid names with very low volume relative to market cap.
• Stocks in confirmed downtrend across ALL timeframes (negative 1d, 7d, 1m, 1y) with no fundamental support.
• Overextended stocks (>40% above 1-year-ago price) with deteriorating momentum (negative 1d and 7d).
• ETFs and index funds — we want individual stock picks (except when identifying sector trends).
• Commodities and crypto — skip BTC-USD, ETH-USD, GC=F, etc. unless exceptionally noteworthy.

IMPORTANT: You are screening, not analyzing. Be aggressive about including stocks that MIGHT have an edge. The next stage will do deep analysis. When in doubt, include.`;

function triageUserPrompt(
  stockData: string,
  stockCount: number,
  news: string,
): string {
  return `\
# STOCK TRIAGE — ${new Date().toISOString()}

## Recent News Context
${news}

## Stock Universe (${stockCount} total)
\`\`\`json
${stockData}
\`\`\`

## Task

From the ${stockCount} stocks above, select the **top 25** (or fewer if fewer qualify) most likely to offer a profitable trading or investment opportunity in the next 1–30 days.

For each selected stock, provide:
- The stock's \`symbol\`
- A one-line reason why it might be profitable
- Which opportunity type it falls under (MOMENTUM / VALUE / RECOVERY / BREAKOUT / GROWTH / YIELD / SECTOR_ROTATION)
- A \`score\` from 1-10 indicating how promising the opportunity looks

You MUST respond with ONLY a valid JSON array, no markdown fences, no commentary. Format:
[
  { "symbol": "AAPL", "reason": "...", "edgeType": "MOMENTUM", "score": 8 },
  ...
]`;
}

// ---------------------------------------------------------------------------
// Triage: slim-down view of stocks for the screening prompt
// ---------------------------------------------------------------------------

interface TriageView {
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  pe: number | null;
  forwardPe: number | null;
  dividendYield: number | null;
  change1d: string;
  change7d: string;
  change1m: string;
  change1y: string;
  pctFrom52wHigh: string;
  pctFrom52wLow: string;
  volume: number;
  avgVolume: number;
}

function toTriageView(s: ProcessedStock): TriageView {
  return {
    symbol: s.symbol,
    name: s.name,
    price: s.price,
    marketCap: s.marketCap,
    pe: s.pe,
    forwardPe: s.forwardPe,
    dividendYield: s.dividendYield,
    change1d: s.change1d,
    change7d: s.change7d,
    change1m: s.change1m,
    change1y: s.change1y,
    pctFrom52wHigh: s.pctFrom52wHigh,
    pctFrom52wLow: s.pctFrom52wLow,
    volume: s.volume,
    avgVolume: s.avgVolume,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface TriageResult {
  symbol: string;
  reason: string;
  edgeType: string;
  score: number;
}

export async function triageStocks(
  stocks: ProcessedStock[],
): Promise<TriageResult[]> {
  const views = stocks.map(toTriageView);
  const stockData = JSON.stringify(views, null, 2);

  const news = await getNews();

  console.log(
    `Triage: sending ${stocks.length} stocks (${stockData.length} chars) to screening model`,
  );

  const prompt = {
    system: TRIAGE_SYSTEM,
    user: triageUserPrompt(stockData, stocks.length, news),
  };

  const raw = await model.query(prompt);

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("Triage: failed to parse JSON from model response");
    console.error("Raw response (first 500 chars):", raw.slice(0, 500));
    return [];
  }

  try {
    const parsed: TriageResult[] = JSON.parse(jsonMatch[0]);
    console.log(`Triage: model selected ${parsed.length} stocks`);
    return parsed;
  } catch (err) {
    console.error("Triage: JSON parse error:", err);
    return [];
  }
}
