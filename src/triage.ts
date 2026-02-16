import model from "./models";
import { ProcessedQuestion } from "./question";
import { getNews } from "./news";
import { getPrices } from "./prices";

// ---------------------------------------------------------------------------
// Triage prompt — fast first pass to shortlist the most promising markets
// ---------------------------------------------------------------------------

const TRIAGE_SYSTEM = `\
You are a prediction-market screening engine. Your ONLY job is to select the markets most likely to contain a tradeable edge from a large list.

Selection criteria (in priority order):
1. FORENSIC — outcome is already determinable or nearly so from observable data (scores, filings, prices, published stats).
2. NEWS-DRIVEN — a recent news event materially changes the probability but the market hasn't repriced.
3. ASYMMETRIC — low-priced market (< $0.30) or high-priced (> $0.85) where even a small edge yields outsized returns.
4. ARBITRAGE — priceSum significantly below 1.00 across outcomes, or cross-market inconsistencies.
5. RESOLUTION IMMINENT — resolves within 48-72 hours and current state is knowable.
6. ANALYTICAL — your probability estimate differs from market by ≥ 10 pp with solid reasoning.

Rejection criteria (skip these):
• Sports game outcomes without live score data — sharp bettors dominate.
• Markets with spread > 15% of midPrice — untradeable.
• Markets priced 0.95-1.00 with < 5% edge — capital traps after fees.
• Markets with no 24h volume and no forensic edge.

IMPORTANT: You are screening, not analyzing. Be aggressive about including markets that MIGHT have an edge. The next stage will do deep analysis. When in doubt, include.`;

function triageUserPrompt(
  marketData: string,
  marketCount: number,
  news: string,
  prices: string,
): string {
  return `\
# MARKET TRIAGE — ${new Date().toISOString()}

## Context
${news}

## Financial Prices
${prices}

## Markets (${marketCount} total)
\`\`\`json
${marketData}
\`\`\`

## Task

From the ${marketCount} markets above, select the **top 20** (or fewer if fewer qualify) most likely to contain a tradeable edge.

For each selected market, provide:
- The market's \`slug\` (the unique identifier)
- A one-line reason why it might have an edge
- Which edge type it falls under (FORENSIC / NEWS / ASYMMETRIC / ARBITRAGE / RESOLUTION / ANALYTICAL)

You MUST respond with ONLY a valid JSON array, no markdown fences, no commentary. Format:
[
  { "slug": "market-slug-here", "reason": "...", "edgeType": "FORENSIC" },
  ...
]`;
}

// ---------------------------------------------------------------------------
// Triage: slim-down view of markets for the screening prompt
// ---------------------------------------------------------------------------

interface TriageView {
  slug: string;
  question: string;
  description: string;
  resolutionSource: string;
  daysToResolution: number;
  outcomes: { label: string; price: number }[];
  priceSum: string;
  volume: string;
  vol1d: number;
  midPrice: string;
  spreadPct: string;
  liquidity: string;
  pChange1h: string;
  pChange1d: string;
  pChange7d: string;
}

function toTriageView(q: ProcessedQuestion): TriageView {
  return {
    slug: q.slug,
    question: q.question,
    description: q.description.slice(0, 200),
    resolutionSource: q.resolutionSource,
    daysToResolution: q.daysToResolution,
    outcomes: q.outcomeParsed,
    priceSum: q.priceSum,
    volume: q.volume,
    vol1d: q.vol1d,
    midPrice: q.midPrice,
    spreadPct: q.spreadPct,
    liquidity: q.liquidity,
    pChange1h: q.pChange1h,
    pChange1d: q.pChange1d,
    pChange7d: q.pChange7d,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface TriageResult {
  slug: string;
  reason: string;
  edgeType: string;
}

export async function triageMarkets(
  markets: ProcessedQuestion[],
): Promise<TriageResult[]> {
  const views = markets.map(toTriageView);
  const marketData = JSON.stringify(views, null, 2);

  const [news, prices] = await Promise.all([getNews(), getPrices()]);

  console.log(
    `Triage: sending ${markets.length} markets (${marketData.length} chars) to screening model`,
  );

  const prompt = {
    system: TRIAGE_SYSTEM,
    user: triageUserPrompt(marketData, markets.length, news, prices),
  };

  const raw = await model.query(prompt);

  // Extract JSON from response (handle model wrapping it in markdown fences)
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("Triage: failed to parse JSON from model response");
    console.error("Raw response (first 500 chars):", raw.slice(0, 500));
    return [];
  }

  try {
    const parsed: TriageResult[] = JSON.parse(jsonMatch[0]);
    console.log(`Triage: model selected ${parsed.length} markets`);
    return parsed;
  } catch (err) {
    console.error("Triage: JSON parse error:", err);
    return [];
  }
}
