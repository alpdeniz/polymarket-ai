# AI Stock Market Analyzer

An AI-powered stock market analyzer that uses a multi-stage pipeline to identify profitable trading and investment opportunities in global equities. The application fetches real-time stock data, enriches it with fundamentals, and generates comprehensive analysis reports with actionable recommendations.

## Overview

The analyzer processes ~120 global stocks through a 4-stage AI pipeline:

1. **Fetch** — Pulls stock data from Yahoo Finance with historical prices (-1d, -7d, -1m, -1y)
2. **Triage** — AI screens the universe to shortlist ~25 most promising opportunities
3. **Enrich** — Fetches deep fundamentals (financials, analyst data, company profile)
4. **Verdict** — AI generates comprehensive analysis with BUY/HOLD/AVOID ratings

## Features

- **Global Coverage** — 120+ stocks across US, Europe, Asia, crypto, commodities, and sector ETFs
- **Multi-Model Support** — Works with Claude (Anthropic), Gemini (Google), or DeepSeek
- **Multi-Stage AI Pipeline** — Fast screening followed by deep analysis for efficiency
- **Comprehensive Analysis** — Fundamental + technical + news-driven + macro-aware
- **Risk Management** — Position sizing, correlation checks, stop-loss recommendations
- **Daily Caching** — News and price data cached to reduce API calls

## Usage

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (copy `.env.example` to `.env`):
```bash
ANTHROPIC_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
DEEPSEEK_API_KEY=your_key_here
ACTIVE_MODEL=claude

# Optional: Override the default stock universe
# STOCK_UNIVERSE=AAPL,MSFT,GOOGL,AMZN,NVDA,TSLA
```

3. Run the analyzer:
```bash
npm run dev
# or
npm run build && npm start
```

4. View results in `./output/stock-analysis-[Date].md`

## Stock Universe

The default universe includes ~120 tickers across:

- **US Technology**: AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, etc.
- **US Financials**: JPM, BAC, WFC, GS, MS, BLK, V, MA, etc.
- **US Healthcare**: JNJ, UNH, PFE, ABBV, MRK, LLY, TMO, etc.
- **US Consumer**: WMT, PG, KO, PEP, COST, MCD, NKE, HD, etc.
- **Space**: LUNR, RKLB, SPCE, RDW, ASTS, BKSY, etc.
- **US Industrials**: CAT, GE, HON, BA, UPS, RTX, DE, LMT
- **US Energy**: XOM, CVX, COP, SLB, EOG, MPC, OXY
- **European ADRs**: ASML, SAP, NVO, AZN, SHEL, TTE, UL, DEO, etc.
- **Asian ADRs**: TSM, BABA, JD, PDD, SONY, TM, HMC, etc.
- **Crypto**: BTC-USD, ETH-USD
- **Commodities**: GC=F (Gold), SI=F (Silver), CL=F (Crude Oil)
- **Major ETFs**: SPY, QQQ, IWM, EEM, VGK, EWJ, XLF, XLE, XLV, XLK

Override the universe by setting `STOCK_UNIVERSE` in your `.env` file with comma-separated tickers.

## Output

Generated reports include:

- **Shortlisted Stocks** — AI-selected opportunities with screening rationale
- **Sector & Macro Analysis** — Market themes and sector trends
- **Fundamental Deep Dive** — Valuation, quality, growth trajectory per stock
- **Technical Analysis** — Trend direction, momentum, 52-week positioning
- **News Cross-Reference** — How recent events affect each opportunity
- **Ranked Opportunities** — Sorted by upside × confidence
- **Portfolio Construction** — Entry/target/stop prices, position sizing
- **Risk Assessment** — Correlation analysis, worst-case scenarios

## Customization

### Prompts
- Edit AI screening logic in `src/triage.ts`
- Modify analysis framework in `src/analysis.ts`

### Stock Selection
- Change the default universe in `src/stocks.ts`
- Or set `STOCK_UNIVERSE` environment variable

### AI Model
- Switch between Claude, Gemini, or DeepSeek via `ACTIVE_MODEL` env var
- Models defined in `src/models.ts`

### News Sources
- RSS feeds configured in `src/news.ts`
- Currently uses CNBC (World, US, Finance, Markets, Earnings, Tech)

## Scripts

- `npm run dev` — Build and run in one step
- `npm run build` — Compile TypeScript to `dist/`
- `npm start` — Run compiled code
- `node dist/index.js` — Direct execution

### Helper Scripts

```bash
# Fetch and display news digest
ts-node scripts/get_news.ts

# Fetch and display all stock prices
ts-node scripts/get_prices.ts

# Ask questions about today's analysis
ts-node scripts/question_predictions.ts "What are the top 3 momentum plays?"
```

## Architecture

```
src/
├── index.ts           # Main pipeline orchestrator
├── stocks.ts          # Yahoo Finance data fetching
├── triage.ts          # AI screening (Stage 1)
├── enrich.ts          # Fundamental data enrichment (Stage 2)
├── analysis.ts        # Analysis prompts & verdict generation (Stage 3)
├── news.ts            # News aggregation & summarization
└── models.ts          # AI model abstraction layer

scripts/
├── get_news.ts        # Standalone news fetcher
├── get_prices.ts      # Standalone price viewer
└── question_predictions.ts  # Query analysis results
```

## Data Sources

- **Stock Data**: Yahoo Finance (via `yahoo-finance2` npm package)
  - Real-time quotes, historical charts, fundamentals, analyst data
- **News**: CNBC RSS feeds (World, US, Finance, Markets, Earnings, Technology)
  - AI-summarized daily digest with market-relevant information

## License

ISC
