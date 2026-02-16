import { ProcessedQuestion } from "./question";

// ---------------------------------------------------------------------------
// CLOB Order Book types
// ---------------------------------------------------------------------------

interface OrderLevel {
  price: string;
  size: string;
}

export interface OrderBookSummary {
  market: string;
  asset_id: string;
  timestamp: string;
  bids: OrderLevel[];
  asks: OrderLevel[];
  min_order_size: string;
  tick_size: string;
  neg_risk: boolean;
}

export interface OrderBookDigest {
  outcome: string;
  tokenId: string;
  bidLevels: number;
  askLevels: number;
  bestBid: string;
  bestAsk: string;
  midPrice: number;
  spread: number;
  spreadPct: number;
  bidDepthUsd: number;
  askDepthUsd: number;
  totalDepthUsd: number;
  bids5: { price: string; size: string }[];
  asks5: { price: string; size: string }[];
  tickSize: string;
  minOrderSize: string;
}

export interface EnrichedMarket extends ProcessedQuestion {
  orderBooks: OrderBookDigest[];
}

// ---------------------------------------------------------------------------
// Fetch order books for a set of markets (batched via POST /books)
// ---------------------------------------------------------------------------

const CLOB_BASE = "https://clob.polymarket.com";
const BATCH_SIZE = 50; // CLOB allows up to 500, but keep batches reasonable

async function fetchBooksBatch(
  tokenIds: string[],
): Promise<Map<string, OrderBookSummary>> {
  const body = tokenIds.map((id) => ({ token_id: id }));
  const res = await fetch(`${CLOB_BASE}/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`CLOB /books error: ${res.status}`);
    return new Map();
  }
  const books: OrderBookSummary[] = await res.json();
  const map = new Map<string, OrderBookSummary>();
  for (const b of books) map.set(b.asset_id, b);
  return map;
}

function digestBook(
  book: OrderBookSummary,
  outcome: string,
  tokenId: string,
): OrderBookDigest {
  const bids = book.bids.sort(
    (a, b) => Number(b.price) - Number(a.price),
  );
  const asks = book.asks.sort(
    (a, b) => Number(a.price) - Number(b.price),
  );

  const bestBid = bids[0]?.price ?? "0";
  const bestAsk = asks[0]?.price ?? "0";
  const mid =
    Number(bestBid) && Number(bestAsk)
      ? (Number(bestBid) + Number(bestAsk)) / 2
      : 0;
  const spreadVal = Number(bestAsk) - Number(bestBid);
  const spreadPct = mid > 0 ? (spreadVal / mid) * 100 : 0;

  const bidDepthUsd = bids.reduce(
    (sum, l) => sum + Number(l.price) * Number(l.size),
    0,
  );
  const askDepthUsd = asks.reduce(
    (sum, l) => sum + Number(l.price) * Number(l.size),
    0,
  );

  return {
    outcome,
    tokenId,
    bidLevels: bids.length,
    askLevels: asks.length,
    bestBid,
    bestAsk,
    midPrice: Math.round(mid * 10000) / 10000,
    spread: Math.round(spreadVal * 10000) / 10000,
    spreadPct: Math.round(spreadPct * 100) / 100,
    bidDepthUsd: Math.round(bidDepthUsd),
    askDepthUsd: Math.round(askDepthUsd),
    totalDepthUsd: Math.round(bidDepthUsd + askDepthUsd),
    bids5: bids.slice(0, 5),
    asks5: asks.slice(0, 5),
    tickSize: book.tick_size,
    minOrderSize: book.min_order_size,
  };
}

// ---------------------------------------------------------------------------
// Public: enrich an array of ProcessedQuestions with full order book data
// ---------------------------------------------------------------------------

export async function enrichWithOrderBooks(
  markets: ProcessedQuestion[],
): Promise<EnrichedMarket[]> {
  // Collect all token IDs we need, mapped back to their market/outcome
  const tokenMeta: { marketIdx: number; outcomeIdx: number; tokenId: string }[] = [];
  for (let mi = 0; mi < markets.length; mi++) {
    const m = markets[mi];
    for (let oi = 0; oi < m.clobTokenIds.length; oi++) {
      const tid = m.clobTokenIds[oi];
      if (tid) tokenMeta.push({ marketIdx: mi, outcomeIdx: oi, tokenId: tid });
    }
  }

  // Batch fetch
  const allTokenIds = tokenMeta.map((t) => t.tokenId);
  const bookMap = new Map<string, OrderBookSummary>();
  for (let i = 0; i < allTokenIds.length; i += BATCH_SIZE) {
    const batch = allTokenIds.slice(i, i + BATCH_SIZE);
    const partial = await fetchBooksBatch(batch);
    for (const [k, v] of partial) bookMap.set(k, v);
  }

  console.log(
    `Order books: ${bookMap.size}/${allTokenIds.length} fetched for ${markets.length} markets`,
  );

  // Assemble enriched markets
  const enriched: EnrichedMarket[] = markets.map((m) => ({
    ...m,
    orderBooks: [],
  }));

  for (const { marketIdx, outcomeIdx, tokenId } of tokenMeta) {
    const book = bookMap.get(tokenId);
    if (!book) continue;
    const label =
      enriched[marketIdx].outcomeParsed[outcomeIdx]?.label ?? `Outcome ${outcomeIdx}`;
    enriched[marketIdx].orderBooks.push(digestBook(book, label, tokenId));
  }

  return enriched;
}
