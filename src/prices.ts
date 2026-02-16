import fs from "fs";
import YahooFinance from "yahoo-finance2";

interface PricePoint { date: Date; close: number | null }

const SYMBOLS: Record<string, string> = {
  "BTC-USD": "Bitcoin",
  "ETH-USD": "Ethereum",
  "AMZN": "Amazon",
  "GOOGL": "Google",
  "NVDA": "Nvidia",
  "GC=F": "Gold",
  "SI=F": "Silver",
};

function findClosestPrice(quotes: PricePoint[], target: Date): number | null {
  let closest: number | null = null;
  let minDiff = Infinity;
  for (const q of quotes) {
    if (q.close == null) continue;
    const diff = Math.abs(q.date.getTime() - target.getTime());
    if (diff < minDiff) { minDiff = diff; closest = q.close; }
  }
  return closest;
}

function pct(current: number, past: number | null): string {
  if (past == null || past === 0) return "N/A";
  const change = ((current - past) / past) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}

export async function getPrices(): Promise<string> {
  const filename = `output/prices_${new Date().toDateString()}.md`;
  if (fs.existsSync(filename)) {
    console.log(`Using cached: ${filename}`);
    return fs.readFileSync(filename, "utf8");
  }
  try {
    const yf = new YahooFinance();
    const now = Date.now();
    const tickers = Object.keys(SYMBOLS);

    const charts = await Promise.all(
      tickers.flatMap((t) => [
        yf.chart(t, { period1: new Date(now - 400 * 86400000), interval: "1d" }),
        yf.chart(t, { period1: new Date(now - 2 * 86400000), interval: "1h" }),
      ])
    );

    const targets = {
      "1h": new Date(now - 3600000),
      "1d": new Date(now - 86400000),
      "7d": new Date(now - 7 * 86400000),
      "30d": new Date(now - 30 * 86400000),
      "1y": new Date(now - 365 * 86400000),
    };

    const lines = tickers.map((ticker, i) => {
      const daily = charts[i * 2];
      const hourly = charts[i * 2 + 1];
      const price = daily.meta.regularMarketPrice;
      const changes = Object.entries(targets)
        .map(([label, date]) => {
          const quotes = label === "1h" ? hourly.quotes : daily.quotes;
          return `${label}:${pct(price, findClosestPrice(quotes, date))}`;
        })
        .join(" ");
      return `${SYMBOLS[ticker]}: $${price.toFixed(2)} (${changes})`;
    });

    const pricesStr = lines.join("\n");
    fs.writeFileSync(filename, pricesStr);
    return pricesStr;
  } catch (err) {
    console.error("Failed to fetch prices:", err);
    return "Price data unavailable";
  }
}
