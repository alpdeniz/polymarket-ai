import YahooFinance from "yahoo-finance2";
import { ProcessedStock } from "./stocks";

// ---------------------------------------------------------------------------
// Enrichment types
// ---------------------------------------------------------------------------

export interface StockFundamentals {
  sector: string;
  industry: string;
  description: string;
  country: string;
  employees: number | null;
  website: string;
  // Financial metrics
  totalRevenue: number | null;
  revenueGrowth: number | null;
  grossMargins: number | null;
  operatingMargins: number | null;
  profitMargins: number | null;
  returnOnEquity: number | null;
  totalDebt: number | null;
  totalCash: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  // Valuation
  priceToBook: number | null;
  pegRatio: number | null;
  enterpriseValue: number | null;
  beta: number | null;
  shortPercentOfFloat: number | null;
  earningsGrowthQuarterly: number | null;
  // Analyst data
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice: number | null;
  recommendationKey: string;
  numberOfAnalysts: number;
  // Analyst recommendation breakdown
  analystBuy: number;
  analystHold: number;
  analystSell: number;
}

export interface EnrichedStock extends ProcessedStock {
  fundamentals: StockFundamentals;
}

// ---------------------------------------------------------------------------
// Fetch fundamentals via quoteSummary
// ---------------------------------------------------------------------------

const MODULES = [
  "assetProfile" as const,
  "financialData" as const,
  "defaultKeyStatistics" as const,
  "recommendationTrend" as const,
];

async function fetchFundamentals(
  yf: InstanceType<typeof YahooFinance>,
  symbol: string,
): Promise<StockFundamentals> {
  const empty: StockFundamentals = {
    sector: "N/A",
    industry: "N/A",
    description: "",
    country: "N/A",
    employees: null,
    website: "",
    totalRevenue: null,
    revenueGrowth: null,
    grossMargins: null,
    operatingMargins: null,
    profitMargins: null,
    returnOnEquity: null,
    totalDebt: null,
    totalCash: null,
    currentRatio: null,
    debtToEquity: null,
    priceToBook: null,
    pegRatio: null,
    enterpriseValue: null,
    beta: null,
    shortPercentOfFloat: null,
    earningsGrowthQuarterly: null,
    targetMeanPrice: null,
    targetHighPrice: null,
    targetLowPrice: null,
    recommendationKey: "N/A",
    numberOfAnalysts: 0,
    analystBuy: 0,
    analystHold: 0,
    analystSell: 0,
  };

  try {
    const summary: any = await yf.quoteSummary(symbol, {
      modules: MODULES,
    });

    const profile = summary.assetProfile || {};
    const fin = summary.financialData || {};
    const stats = summary.defaultKeyStatistics || {};
    const recTrend = summary.recommendationTrend?.trend?.[0] || {};

    return {
      sector: profile.sector || "N/A",
      industry: profile.industry || "N/A",
      description: (profile.longBusinessSummary || "").slice(0, 500),
      country: profile.country || "N/A",
      employees: profile.fullTimeEmployees ?? null,
      website: profile.website || "",
      totalRevenue: fin.totalRevenue ?? null,
      revenueGrowth: fin.revenueGrowth ?? null,
      grossMargins: fin.grossMargins ?? null,
      operatingMargins: fin.operatingMargins ?? null,
      profitMargins: fin.profitMargins ?? null,
      returnOnEquity: fin.returnOnEquity ?? null,
      totalDebt: fin.totalDebt ?? null,
      totalCash: fin.totalCash ?? null,
      currentRatio: fin.currentRatio ?? null,
      debtToEquity: fin.debtToEquity ?? null,
      priceToBook: stats.priceToBook ?? null,
      pegRatio: stats.pegRatio ?? null,
      enterpriseValue: stats.enterpriseValue ?? null,
      beta: stats.beta ?? null,
      shortPercentOfFloat: stats.shortPercentOfFloat ?? null,
      earningsGrowthQuarterly: stats.earningsQuarterlyGrowth ?? null,
      targetMeanPrice: fin.targetMeanPrice ?? null,
      targetHighPrice: fin.targetHighPrice ?? null,
      targetLowPrice: fin.targetLowPrice ?? null,
      recommendationKey: fin.recommendationKey || "N/A",
      numberOfAnalysts: fin.numberOfAnalystOpinions ?? 0,
      analystBuy: (recTrend.strongBuy || 0) + (recTrend.buy || 0),
      analystHold: recTrend.hold || 0,
      analystSell: (recTrend.sell || 0) + (recTrend.strongSell || 0),
    };
  } catch (err) {
    console.warn(`  ⚠ Fundamentals for ${symbol}: ${(err as Error).message}`);
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Public API: enrich shortlisted stocks with fundamentals
// ---------------------------------------------------------------------------

const ENRICH_BATCH = 5;

export async function enrichStocks(
  stocks: ProcessedStock[],
): Promise<EnrichedStock[]> {
  const yf = new YahooFinance();
  const results: EnrichedStock[] = [];
  const totalBatches = Math.ceil(stocks.length / ENRICH_BATCH);

  for (let i = 0; i < stocks.length; i += ENRICH_BATCH) {
    const batch = stocks.slice(i, i + ENRICH_BATCH);
    const batchNum = Math.floor(i / ENRICH_BATCH) + 1;
    console.log(
      `  Enrichment batch ${batchNum}/${totalBatches}: ${batch.map((s) => s.symbol).join(", ")}`,
    );

    const enriched = await Promise.all(
      batch.map(async (stock) => {
        const fundamentals = await fetchFundamentals(yf, stock.symbol);
        return { ...stock, fundamentals } as EnrichedStock;
      }),
    );

    results.push(...enriched);
  }

  console.log(`Enriched ${results.length} stocks with fundamentals`);
  return results;
}
