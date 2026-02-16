import dotenv from "dotenv";
dotenv.config();

import { fetchStockUniverse } from "./stocks";
import { triageStocks } from "./triage";
import { enrichStocks } from "./enrich";
import { prepareAnalysis } from "./analysis";
import model from "./models";
import fs from "fs";

async function main(): Promise<void> {
  const now = new Date();

  // ── Stage 0: Fetch stock universe with price data ────────────────────
  console.log(`[Stage 0] Fetching stock universe with price history...`);
  const allStocks = await fetchStockUniverse();
  console.log(`[Stage 0] ${allStocks.length} stocks fetched with -1d/-7d/-1m/-1y data\n`);

  if (allStocks.length === 0) {
    console.error("[Stage 0] No stocks fetched. Check network/API. Aborting.");
    return;
  }

  // ── Stage 1: AI triage — screen for the most promising ~25 stocks ────
  console.log(`[Stage 1] Running AI triage on ${allStocks.length} stocks...`);
  const triageResults = await triageStocks(allStocks);

  if (triageResults.length === 0) {
    console.error("[Stage 1] Triage returned no stocks. Aborting.");
    return;
  }

  const selectedSymbols = new Set(triageResults.map((t) => t.symbol));
  const shortlisted = allStocks.filter((s) => selectedSymbols.has(s.symbol));
  console.log(
    `[Stage 1] ${triageResults.length} selected by AI, ${shortlisted.length} matched\n`,
  );

  // ── Stage 2: Enrich shortlisted stocks with fundamentals ─────────────
  console.log(`[Stage 2] Fetching fundamentals for ${shortlisted.length} stocks...`);
  const enriched = await enrichStocks(shortlisted);
  console.log(`[Stage 2] Enrichment complete\n`);

  // ── Stage 3: Full analysis and verdict ───────────────────────────────
  console.log(`[Stage 3] Running full analysis on ${enriched.length} enriched stocks...`);
  const prompt = await prepareAnalysis(enriched, triageResults);
  const result = await model.query(prompt);
  console.log("[Stage 3] Analysis complete\n");

  if (!fs.existsSync("./output")) fs.mkdirSync("./output");
  const filename = `./output/stock-analysis-${now.toDateString()}.md`;
  fs.writeFileSync(filename, result);
  console.log(`Output: ${filename}`);
}

main();
