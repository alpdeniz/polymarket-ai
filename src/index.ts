import dotenv from "dotenv";
dotenv.config();

import { buildQuestion, preparePromptWithContext, ProcessedQuestion } from "./question";
import { triageMarkets } from "./triage";
import { enrichWithOrderBooks } from "./orderbook";
import model from "./models";
import fs from "fs";

const ENDING_IN_X_DAYS = Number(process.env.ENDING_IN_X_DAYS) || 30;
const MARKET_LIMIT = Number(process.env.MARKET_WINDOW_LIMIT) || 500;
const MIN_VOLUME_24H = 1000;

async function main(): Promise<void> {
  const now = new Date();

  // ── Stage 0: Fetch all active markets from Gamma API ──────────────────
  const endMin = encodeURIComponent(now.toISOString());
  const endMax = encodeURIComponent(
    new Date(Date.now() + ENDING_IN_X_DAYS * 86400000).toISOString(),
  );
  const url = `https://gamma-api.polymarket.com/markets?limit=${MARKET_LIMIT}&offset=0&active=true&closed=false&end_date_min=${endMin}&end_date_max=${endMax}&order=volume&ascending=false`;
  console.log(`[Stage 0] Fetching markets: ${url}`);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Polymarket API error: ${response.status}`);
  const rawMarkets = await response.json();

  const allQuestions: ProcessedQuestion[] = rawMarkets
    .map(buildQuestion)
    .filter((q: ProcessedQuestion) => q.vol1d >= MIN_VOLUME_24H && q.clobTokenIds.length > 0);

  console.log(
    `[Stage 0] ${rawMarkets.length} fetched → ${allQuestions.length} after liquidity filter`,
  );

  // ── Stage 1: AI triage — fast screening to shortlist ~20 markets ──────
  console.log(`[Stage 1] Running AI triage on ${allQuestions.length} markets...`);
  const triageResults = await triageMarkets(allQuestions);

  if (triageResults.length === 0) {
    console.error("[Stage 1] Triage returned no markets. Aborting.");
    return;
  }

  const selectedSlugs = new Set(triageResults.map((t) => t.slug));
  const shortlisted = allQuestions.filter((q) => selectedSlugs.has(q.slug));
  console.log(
    `[Stage 1] ${triageResults.length} selected by AI, ${shortlisted.length} matched`,
  );

  // ── Stage 2: Enrich shortlisted markets with CLOB order book depth ────
  console.log(`[Stage 2] Fetching CLOB order book depth for ${shortlisted.length} markets...`);
  const enriched = await enrichWithOrderBooks(shortlisted);

  // ── Stage 3: Full analysis with enriched data ─────────────────────────
  console.log(`[Stage 3] Running full analysis on ${enriched.length} enriched markets...`);
  const prompt = await preparePromptWithContext(enriched, triageResults);
  const result = await model.query(prompt);
  console.log("[Stage 3] Analysis complete");

  fs.writeFileSync(`./output/suggestions-${now.toDateString()}.md`, result);
  console.log(`Output: suggestions-${now.toDateString()}.md`);
}

main();
