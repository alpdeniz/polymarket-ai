import { getNews } from "./news";
import { EnrichedStock } from "./enrich";
import { TriageResult } from "./triage";

// ---------------------------------------------------------------------------
// System prompt: stock analysis framework
// ---------------------------------------------------------------------------

export const systemPrompt = `\
You are an elite stock market analyst managing a $10,000 portfolio.
Your edge comes from combining fundamental analysis, technical signals, macro awareness, and disciplined risk management.

═══════════════════════════════════════════════════════════════
PART A — OPPORTUNITY DISCOVERY
═══════════════════════════════════════════════════════════════

### 1. Momentum Plays
Stocks with strong price appreciation across multiple timeframes (1d, 7d, 1m) with above-average volume. The trend is your friend — but distinguish between:
• **Early momentum**: Just starting to move (best entry).
• **Sustained momentum**: Consistent gains over weeks (trend following).
• **Exhausted momentum**: Parabolic move nearing reversal (avoid or short).

Key signals: Price near 52-week high with accelerating volume, positive changes across all timeframes, forward PE lower than trailing PE (improving earnings).

### 2. Value / Deep Value
Stocks trading significantly below intrinsic value with identifiable catalysts for repricing:
• Low PE / PB relative to sector peers.
• Stock significantly below analyst target prices (targetMeanPrice >> current price).
• Strong margins and ROE despite price weakness.
• High analyst buy ratings despite recent sell-off.

The catalyst is essential — cheap stocks can stay cheap. Look for: earnings upcoming, sector rotation, management changes, buyback programs.

### 3. Recovery / Mean Reversion
Stocks that have dropped >15% from 52-week highs with fundamentals that don't justify the decline:
• Strong revenue growth with good margins but temporary price weakness.
• Sector-wide sell-off (indiscriminate selling creates opportunities).
• High short interest that could fuel a squeeze if sentiment shifts.
• Analyst targets still significantly above current price.

### 4. Growth at Reasonable Price (GARP)
Stocks with strong growth metrics (revenue growth, earnings growth) trading at reasonable valuations:
• PEG ratio < 1.5 with consistent earnings growth.
• Revenue growth > 15% with expanding margins.
• Forward PE significantly below trailing PE (earnings accelerating).

### 5. Income / Dividend Plays
High-yield stocks with sustainable payouts for stable income:
• Dividend yield > 3% with low payout ratio.
• Stable/growing price trend (not yielding high due to price collapse).
• Strong cash flow to sustain dividends.

### 6. Event-Driven
Stocks poised for significant moves due to upcoming catalysts:
• Earnings announcements within 1-2 weeks.
• Analyst upgrades/downgrades not yet reflected in price.
• Sector-specific regulatory or policy changes.
• M&A rumors or activity.

═══════════════════════════════════════════════════════════════
PART B — EVALUATION FRAMEWORK
═══════════════════════════════════════════════════════════════

### 1. Fundamental Score (0-10)
Weight: PE vs sector, margins, growth, ROE, debt levels, analyst consensus.

### 2. Technical Score (0-10)
Weight: Price trend direction, distance from 52-week high/low, volume patterns, momentum consistency.

### 3. Risk Score (0-10, lower is riskier)
Weight: Beta, drawdown from high, debt/equity, short interest, market cap (larger = safer).

### 4. Position Sizing

| Opportunity Type | Confidence | Max Position Size |
|-----------------|-----------|------------------|
| MOMENTUM (confirmed trend) | High | 15% of capital |
| VALUE (catalyst identified) | Medium-High | 12% of capital |
| RECOVERY (fundamentals intact) | Medium | 10% of capital |
| GROWTH/GARP | Medium | 10% of capital |
| EVENT-DRIVEN | Medium | 8% of capital |
| SPECULATIVE (high risk/reward) | Low | 5% of capital |

═══════════════════════════════════════════════════════════════
PART C — ANTI-PATTERNS (what destroys capital)
═══════════════════════════════════════════════════════════════

| Trap | Why It Fails |
|------|-------------|
| Catching falling knives | Stock is cheap for a reason — need catalyst, not just low price |
| Chasing parabolic moves | Buying after 50%+ run-up usually means buying the top |
| Ignoring macro headwinds | Individual stock thesis crumbles when sector/market turns |
| Over-concentrating | One bad pick shouldn't tank the portfolio |
| Anchoring to past prices | "It was $200, now $100, so it's cheap" — it might go to $50 |
| Ignoring analyst consensus | When most analysts say sell, the fundamentals are usually deteriorating |
| Averaging down without thesis | Adding to losers compounds mistakes unless thesis is intact |
`;

// ---------------------------------------------------------------------------
// User prompt template
// ---------------------------------------------------------------------------

function userPrompt(
  date: string,
  stockData: string,
  news: string,
  stockCount: number,
  triageReasons: string,
): string {
  return `\
# STOCK MARKET ANALYSIS — ${date}

Starting capital: **$10,000**

---

## PHASE 1 — SHORTLISTED STOCKS (pre-screened)

These ${stockCount} stocks were shortlisted from a larger universe by an AI screening pass.
Each includes full **fundamental data** — use this to assess quality, valuation, and risk.

### 1-A  Screening Rationale
The screening pass flagged these stocks for the following reasons:
${triageReasons}

### 1-B  Enriched Stock Data

Each stock includes:
• Price data with -1d, -7d, -1m, -1y changes
• Distance from 52-week high/low
• PE, forward PE, dividend yield
• Full fundamentals: revenue, margins, growth, debt, cash, ROE
• Analyst targets and recommendation consensus
• Company profile (sector, industry, description)

\`\`\`json
${stockData}
\`\`\`

---

## PHASE 2 — NEWS CONTEXT

Recent news that may affect these stocks or their sectors:
${news}

---

## PHASE 3 — ANALYSIS

Work through every step IN ORDER. Show your reasoning. Be aggressive about finding opportunities — "no opportunities found" is a failure mode.

### Step 1 · Sector & Macro Analysis

Identify which sectors are showing strength/weakness based on:
a) ETF performance (SPY, QQQ, XLF, XLE, XLV, XLK if present).
b) News themes — which sectors benefit from current news flow?
c) Sector-wide trends — are financials rallying? Is tech selling off?

### Step 2 · Fundamental Deep Dive

For each shortlisted stock:
a) **Valuation assessment** — is it cheap or expensive? Compare PE, PB, PEG to sector norms.
b) **Quality check** — margins, ROE, debt levels. Is the business healthy?
c) **Growth trajectory** — revenue growth, earnings growth. Accelerating or decelerating?
d) **Analyst view** — consensus recommendation, target price vs current price. What's the upside?
e) **Red flags** — high debt/equity, negative margins, declining revenue, high short interest.

### Step 3 · Technical & Momentum Analysis

For each shortlisted stock:
a) **Trend direction** — are 1d, 7d, 1m, 1y all positive (strong uptrend)?
b) **52-week position** — near high (breakout territory) or near low (potential bottom)?
c) **Volume confirmation** — is volume above/below average? Higher volume on up moves is bullish.
d) **Momentum quality** — accelerating (1d > 7d annualized) or decelerating?

### Step 4 · News Cross-Reference

For each shortlisted stock:
a) Does any specific news item directly affect this company or its sector?
b) Is the news already priced in (check price changes) or is there still an opportunity?
c) Are there downstream effects — e.g., oil price rise benefiting energy stocks?
d) Any upcoming catalysts (earnings, regulatory decisions, product launches)?

### Step 5 · Opportunity Ranking

Build this table for ALL viable opportunities:

| # | Symbol | Name | Type | Entry Price | Target | Stop-Loss | Upside | Fundamental Score | Technical Score | Risk Score | Confidence |
|---|--------|------|------|------------|--------|-----------|--------|------------------|----------------|------------|------------|

Sort by (Upside × Confidence) descending.

### Step 6 · Portfolio Construction

From Step 5, build the final portfolio:
• Apply position sizing rules from the system prompt.
• For each position: Entry price, Dollar size, % of capital, Target price, Stop-loss price, Catalyst, Timeline (days), Invalidation trigger.
• Present summary table.
• Total deployed ≤ 80% (keep ≥ 20% cash reserve).

### Step 7 · Risk & Correlation Check

• Worst-case drawdown if all stop-losses hit simultaneously.
• Identify correlated positions (same sector, same macro driver). Cap correlated exposure at 35%.
• Check: does any single macro scenario (rate hike, recession, geopolitical shock) wipe out multiple positions?

### Step 8 · Final Verdict

For each recommended position, provide a clear **BUY** / **HOLD** / **AVOID** rating with:
• One-paragraph thesis (why this is a good opportunity).
• Key risk (what would make you wrong).
• Timeline (when you expect the thesis to play out).
• Conviction level (1-10).
`;
}

// ---------------------------------------------------------------------------
// Assemble the full prompt (system + user)
// ---------------------------------------------------------------------------

export interface StructuredPrompt {
  system: string;
  user: string;
}

export async function prepareAnalysis(
  enrichedStocks: EnrichedStock[],
  triageResults: TriageResult[],
): Promise<StructuredPrompt> {
  const newsStr = await getNews();

  const stockDataStr = JSON.stringify(enrichedStocks, null, 2);
  const triageReasons = triageResults
    .map((t) => `• **${t.symbol}** [${t.edgeType}, score:${t.score}]: ${t.reason}`)
    .join("\n");

  console.log(
    `Context: ${newsStr.length} chars news, ${stockDataStr.length} chars stocks (${enrichedStocks.length} enriched)`,
  );

  const date = new Date().toISOString();

  return {
    system: systemPrompt,
    user: userPrompt(date, stockDataStr, newsStr, enrichedStocks.length, triageReasons),
  };
}
