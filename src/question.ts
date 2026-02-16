import { getNews } from "./news";
import { getPrices } from "./prices";
import { EnrichedMarket } from "./orderbook";
import { TriageResult } from "./triage";

// ---------------------------------------------------------------------------
// System prompt: analytical framework + offensive alpha-generation strategies
// ---------------------------------------------------------------------------

export const systemPrompt = `\
You are an elite quantitative prediction-market analyst managing a $1,000 portfolio on Polymarket.
Your edge comes from rigorous Bayesian reasoning, forensic evidence analysis, and creative multi-market thinking.

═══════════════════════════════════════════════════════════════
PART A — EDGE DISCOVERY (how to FIND extraordinary bets)
═══════════════════════════════════════════════════════════════

### 1. Forensic Edge — the highest-value plays

The single most profitable strategy: find markets whose outcomes are ALREADY DETERMINED (or nearly so) by currently observable real-world data — but where the market hasn't caught up.

Examples of forensic evidence:
• A market on "Will X be nominated by Feb 28?" when the nomination paperwork was filed yesterday in an obscure government filing.
• A market on tweet counts when the actual count is publicly trackable right now on X/Twitter.
• A market on "Will movie X gross >$47M opening weekend?" when Thursday preview numbers are already published.
• A market on Winter Olympics medal counts when the current medal tally is live on Olympics.com.
• A market on monthly Spotify listeners when the current month-to-date chart is available.
• A market on a crypto price threshold when you can see the current price in the provided financial data.

**KEY PRINCIPLE: If you can LOOK UP the answer (or get 90%+ of the way there from the data provided to you), the market is a goldmine whenever it lags behind observable reality.**

For every market, ask: "Does publicly available data already (nearly) answer this question?" If yes, that market is your #1 priority.

### 2. Asymmetric Payoff Hunting

A small edge on a cheap market vastly outperforms a large edge on an expensive market:
• 5 pp edge on a $0.10 market → 50 % return if correct
• 5 pp edge on a $0.90 market → 5.5 % return if correct

Hunt for LOW-PRICED markets (under $0.30) where your evidence gives even a modest edge. The risk/reward is asymmetric in your favor: you risk $0.10 to make $0.90.

Also hunt for HIGH-PRICED markets (above $0.90) where NO is underpriced. Buying NO at $0.10 when the true probability of NO is $0.15+ is the same asymmetric play.

### 3. Information Cascade Detection

When a single event affects multiple markets, the news often reprices the most obvious market first while leaving related markets stale. Example:
• "US military preparing for Iran operations" → the Israel-Iran strike market reprices quickly.
• But: defense-related markets, oil price markets, regional stability markets may lag.

Search for markets downstream of the same catalyst that haven't yet moved.

### 4. Resolution Mechanics Exploitation

Polymarket resolution criteria have SPECIFIC fine print. Often traders misunderstand the criteria:
• "Formally nominated" may mean a specific procedural step, not a press conference announcement.
• "Strikes Iran" may require a specific type of military action, excluding proxy actions.
• Dollar thresholds may be measured in specific units (domestic vs worldwide, adjusted vs nominal).

When the resolution criteria are narrower or broader than casual interpretation, there's an edge.

### 5. Multi-Leg Synthetic Positions

When multiple markets cover related outcomes, construct synthetic positions:
• If tweet-count ranges are all available, identify which ranges have probabilities that don't sum to 100%. Buy the underpriced range(s).
• If "Country wins most golds" and "Country wins N golds" exist independently, build conditional bets.
• If a YES/NO market and a range market on the same question both exist, exploit inconsistencies between them.

═══════════════════════════════════════════════════════════════
PART B — EVALUATION FRAMEWORK (how to SIZE and MANAGE bets)
═══════════════════════════════════════════════════════════════

### 1. Expected Value (EV)
EV = (your_prob × net_payout) − ((1 − your_prob) × cost)
Net payout for a YES share bought at price p = (1 − p) × 0.98   (2 % Polymarket fee on profit)

### 2. Tiered Position Sizing

| Edge Type | Confidence | Sizing Rule | Max per Position |
|-----------|-----------|-------------|------------------|
| FORENSIC | Outcome observable/verifiable from provided data | Full Kelly (capped) | 25 % of capital |
| NEWS_EDGE | Specific dated news not yet priced in | Half Kelly | 15 % of capital |
| ANALYTICAL | Your probability ≥ 10 pp from market, reasoning-backed | Quarter Kelly | 10 % of capital |
| ASYMMETRIC | Modest edge on cheap market (< $0.30), huge payoff | Fixed 3-5 % of capital | 5 % of capital |

Full Kelly: f* = (b·p − q) / b  where b = (1/market_price − 1), p = your_prob, q = 1 − p

### 3. Liquidity Awareness
• Spread > 10 % of mid-price → likely untradeable for meaningful size.
• Spread 5-10 % → trade with limit orders only, adjust entry price.
• Spread < 5 % → can use market orders for small positions.
• Low 24h volume (< $1K) → you might BE the market. Only enter if forensic edge is overwhelming.

### 4. Edge Classification Labels (use these in your output)
FORENSIC — outcome determinable from currently observable data.
NEWS_EDGE — specific, recent, datable news item the market hasn't fully priced.
ANALYTICAL — probability estimate differs ≥ 10 pp, backed by reasoning that survives steelmanning.
ASYMMETRIC — modest edge but low-price market creates outsized payoff.
MULTI_LEG — constructed from positions across multiple related markets.
NO_EDGE — skip.

═══════════════════════════════════════════════════════════════
PART C — ANTI-PATTERNS (what destroys capital)
═══════════════════════════════════════════════════════════════

| Trap | Why | Exception |
|------|-----|-----------|
| Capital Trap (buy >95¢ for <3 % edge) | After 2 % fee → breakeven or loss | ONLY if forensic evidence proves 99.9 %+ certainty AND resolution is imminent |
| Narrative Bias | Stories ≠ evidence | Never. Thesis must come from data. |
| "Efficient = Safe" | High volume = well-watched = priced correctly | Never assume high volume means opportunity |
| Sports/Weather (no informational edge) | Sharp bettors with real-time data dominate | Exception: if you have the actual score/count/temperature in provided data |
| Steelman Failure | Market often right | Before ANY bet: argue why the market might be correct |
`;

// ---------------------------------------------------------------------------
// User prompt template: structured multi-phase analytical task
// ---------------------------------------------------------------------------

function userPrompt(
  date: string,
  marketData: string,
  news: string,
  prices: string,
  marketCount: number,
  triageReasons: string,
): string {
  return `\
# PREDICTION MARKET ANALYSIS — ${date}

Starting capital: **$1,000**

---

## PHASE 1 — SHORTLISTED MARKETS (pre-screened)

These ${marketCount} markets were shortlisted from a larger pool by a screening pass.
Each includes **full CLOB order book depth** — use this to assess real liquidity and executable entry prices.

### 1-A  Screening Rationale
The screening pass flagged these markets for the following reasons:
${triageReasons}

### 1-B  Market Data with Order Book Depth

Computed fields per market:
• \`outcomeParsed\` — outcome labels with prices paired.
• \`priceSum\` — sum of outcome prices. If < 1.00 → arbitrage signal.
• \`midPrice\` — (bestBid + bestAsk) / 2.
• \`spreadPct\` — spread as % of midPrice (lower = more liquid).
• \`orderBooks[]\` — per-outcome CLOB depth (top 5 bid/ask levels, total depth in USD, effective spread).

\`\`\`json
${marketData}
\`\`\`

---

## PHASE 2 — EXTERNAL INTELLIGENCE

### 2-A  Recent News Digest
${news}

### 2-B  Financial & Crypto Prices
${prices}

---

## PHASE 3 — ANALYSIS

Work through every step IN ORDER. Show math. Be aggressive about finding edges — "no opportunities found" is a failure mode.

### Step 1 · Forensic Edge Scan (HIGHEST PRIORITY)

For EVERY market, ask: **"Can I determine or nearly determine the outcome from the data already available to me?"**

Specifically check:
a) **Crypto/price threshold markets** — you have current prices in Phase 2-B. If a market asks "Will BTC be above $X?" and you can see BTC is currently at $Y, calculate the buffer, the time to resolution, and the probability based on recent volatility. This is a FORENSIC edge when the buffer is large relative to volatility.
b) **Event markets with trailing evidence** — if news reports that an event has already occurred or is imminent (e.g., nomination filed, auction completed, early box office numbers), the market should be near 0 or 1. If it isn't, that's your trade.
c) **Counting/measurement markets** — tweet counts, medal counts, listener counts. If these can be derived or bounded from the news or your knowledge of the world as of today, use that.
d) **Resolution timing** — markets resolving in < 48 hours where the outcome is already largely determined by current state (e.g., a sports event already in progress, a metric already measurable).

For each forensic edge found:
→ State what observable data determines the outcome.
→ Your probability estimate.
→ How the market is mispriced and by how much.

### Step 2 · Arbitrage & Multi-Leg Scan

a) **Single-market arbitrage**: buying all outcomes for < $1.00 net of fees.
b) **Cross-market arbitrage**: related markets where hedged positions guarantee profit.
c) **Probability distribution errors**: for markets with multiple range buckets (e.g., tweet counts, price ranges), do the bucket probabilities sum to approximately 100%? If they sum to less, buying all buckets is profitable. If one bucket is obviously underpriced relative to others, bet that bucket.
d) **Conditional inconsistencies**: two markets that are logically linked (A implies B) but priced inconsistently (A priced higher than B, or A priced lower when A ⊂ B).

### Step 3 · News-Driven Edge Detection

Cross-reference Phase 2-A news against markets:
a) Quote the specific news item.
b) State what it implies for the market.
c) Estimate how much the market should move.
d) Check 1h/1d price changes — has the market already repriced?
e) **CRITICAL: Check DOWNSTREAM markets** — if the news has repriced the obvious market, which RELATED markets are still stale? Those are your trades.

### Step 4 · Asymmetric Payoff Scan

Among LOW-PRICED markets (< $0.30 YES or < $0.30 NO), find any where:
• Your estimated probability is at least 1.5× the market price, OR
• A specific catalyst in the next 7 days could move the price 3×+

These are "lottery tickets" but with an analytical edge. Small position, huge payout.

### Step 5 · Analytical Edge (Steelman-Tested)

For remaining markets, find where your probability differs from market by ≥ 10 pp:
a) Full reasoning chain.
b) **Steelman the market** — argue FOR the current price as hard as you can.
c) Only proceed if your thesis demolishes the steelman.

### Step 6 · Order Book & Execution Analysis

For each opportunity from Steps 1–5, use the CLOB order book data to assess executability:
a) **Effective entry price** — given $50-250 position size, what's the realistic fill price? Walk the book.
b) **Slippage estimate** — how much worse than mid-price would a market order fill?
c) **Depth adequacy** — is there enough size at the best bid/ask to absorb your trade?
d) **Spread cost** — does the bid-ask spread eat your edge? (If spread > edge, skip.)
e) **Limit order strategy** — if spread is wide, propose a limit price between bid and mid that's likely to fill.

Flag markets where the order book reveals hidden information:
• Heavily skewed depth (large bids vs small asks or vice versa) → directional pressure signal.
• Very thin books despite high volume → market maker retreat, possible event risk.

### Step 7 · Quantitative Ranking

Build this table for ALL opportunities from Steps 1–6:

| # | Market | Side | Entry | Your Prob | Mkt Prob | Edge | EV/$ | Kelly Tier | Size Rule | Confidence | Type |
|---|--------|------|-------|-----------|----------|------|------|------------|-----------|------------|------|

Sort by (EV/$ × Confidence) descending.

### Step 8 · Portfolio Construction

From Step 7, build the portfolio:
• Apply the tiered sizing rules from the system prompt.
• For each position: Entry price, Dollar size, % of capital, Target, Stop-loss, Catalyst, Timeline, Invalidation trigger.
• Prioritize FORENSIC and ASYMMETRIC edges — they have the best risk/reward.
• Present summary table.
• Total deployed ≤ 80 % (keep ≥ 20 % reserve).

### Step 9 · Risk & Correlation Check

• Worst-case drawdown if all stops hit simultaneously.
• Identify correlated positions (same underlying event). Cap correlated exposure at 30 %.
• Check: does any single geopolitical/economic scenario wipe out multiple positions?

### Step 10 · Intelligence Gaps

What 3-5 specific lookups, data sources, or API calls would MOST increase your confidence?
For each, estimate: how much would this data change your portfolio if obtained?
`;
}

// ---------------------------------------------------------------------------
// Market data types & enrichment
// ---------------------------------------------------------------------------

export interface MarketData {
  question: string;
  conditionId: string;
  slug: string;
  description: string;
  resolutionSource: string;
  startDateIso: string;
  endDateIso: string;
  volume: string;
  outcomes: string | string[];
  outcomePrices: string | string[];
  clobTokenIds: string | string[];
  spread: string;
  oneWeekPriceChange: string;
  oneDayPriceChange: string;
  oneHourPriceChange: string;
  lastTradePrice: string;
  volume24hr: string;
  volume1wk: string;
  volume1mo: string;
  bestBid: string;
  bestAsk: string;
  liquidity: string;
  competitive: number;
  acceptingOrders: boolean;
}

export interface ProcessedQuestion {
  question: string;
  conditionId: string;
  slug: string;
  description: string;
  resolutionSource: string;
  clobTokenIds: string[];
  start: string;
  end: string;
  daysToResolution: number;
  outcomeParsed: { label: string; price: number }[];
  priceSum: string;
  volume: string;
  vol1d: number;
  vol7d: number;
  vol30d: number;
  bestBid: string;
  bestAsk: string;
  midPrice: string;
  spread: string;
  spreadPct: string;
  liquidity: string;
  lastPrice: string;
  pChange1h: string;
  pChange1d: string;
  pChange7d: string;
}

function parseJsonField<T>(raw: string | T[]): T[] {
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function buildQuestion(q: MarketData): ProcessedQuestion {
  const outcomes: string[] = parseJsonField(q.outcomes);
  const prices: number[] = parseJsonField<string>(q.outcomePrices).map(Number);
  const priceSum = prices.reduce((a, b) => a + b, 0);
  const clobTokenIds: string[] = parseJsonField(q.clobTokenIds);

  const bestBid = Number(q.bestBid) || 0;
  const bestAsk = Number(q.bestAsk) || 0;
  const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : 0;
  const spreadVal = bestAsk - bestBid;
  const spreadPct = midPrice > 0 ? (spreadVal / midPrice) * 100 : 0;

  const outcomeParsed = outcomes.map((label, i) => ({
    label,
    price: prices[i] ?? 0,
  }));

  const endDate = new Date(q.endDateIso);
  const daysToResolution = Math.max(0, Math.round((endDate.getTime() - Date.now()) / 86400000));

  return {
    question: q.question,
    conditionId: q.conditionId,
    slug: q.slug,
    description: q.description || "",
    resolutionSource: q.resolutionSource || "",
    clobTokenIds,
    start: q.startDateIso,
    end: q.endDateIso,
    daysToResolution,
    outcomeParsed,
    priceSum: priceSum.toFixed(4),
    volume: q.volume,
    vol1d: Number(q.volume24hr) || 0,
    vol7d: Number(q.volume1wk) || 0,
    vol30d: Number(q.volume1mo) || 0,
    bestBid: q.bestBid,
    bestAsk: q.bestAsk,
    midPrice: midPrice.toFixed(4),
    spread: q.spread,
    spreadPct: spreadPct.toFixed(2),
    liquidity: q.liquidity || "0",
    lastPrice: q.lastTradePrice,
    pChange1h: q.oneHourPriceChange,
    pChange1d: q.oneDayPriceChange,
    pChange7d: q.oneWeekPriceChange,
  };
}

// ---------------------------------------------------------------------------
// Assemble the full prompt (system + user)
// ---------------------------------------------------------------------------

export interface StructuredPrompt {
  system: string;
  user: string;
}

export async function preparePromptWithContext(
  enrichedMarkets: EnrichedMarket[],
  triageResults: TriageResult[],
): Promise<StructuredPrompt> {
  const [newsStr, pricesStr] = await Promise.all([getNews(), getPrices()]);

  const marketDataStr = JSON.stringify(enrichedMarkets, null, 2);
  const triageReasons = triageResults
    .map((t) => `• **${t.slug}** [${t.edgeType}]: ${t.reason}`)
    .join("\n");

  console.log(
    `Context: ${newsStr.length} chars news, ${pricesStr.length} chars prices, ${marketDataStr.length} chars markets (${enrichedMarkets.length} enriched)`,
  );

  const date = new Date().toISOString();

  return {
    system: systemPrompt,
    user: userPrompt(date, marketDataStr, newsStr, pricesStr, enrichedMarkets.length, triageReasons),
  };
}
