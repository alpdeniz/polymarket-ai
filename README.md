# Polymarket Gems

Tries to find gems within polymarket data.

## Usage

Have a look at .env.example and generate your .env file by adding required tokens and options.

Then, as usual:

```bash
   npm i
   npm run start
```

## Experiment

- Change max end date and max number of questions that will be injected to the context through .env file.
- Modify leading and trailing prompts through `/src/question.ts`. 
- Select question properties to include in the prompt in `/src/question.ts`.
- Use another LLM, e.g. anthropic, or connect your own awesome local LLM.

## Available market data 

Polymarket API Response is below. Use the ones you see appropriate to help AI make better evaluations.

```
[
  'id',
  'question',
  'conditionId',
  'slug',
  'endDate',
  'liquidity',
  'startDate',
  'image',
  'icon',
  'description',
  'outcomes',
  'outcomePrices',
  'volume',
  'active',
  'closed',
  'marketMakerAddress',
  'createdAt',
  'updatedAt',
  'new',
  'featured',
  'submitted_by',
  'archived',
  'resolvedBy',
  'restricted',
  'groupItemTitle',
  'groupItemThreshold',
  'questionID',
  'enableOrderBook',
  'orderPriceMinTickSize',
  'orderMinSize',
  'volumeNum',
  'liquidityNum',
  'endDateIso',
  'startDateIso',
  'hasReviewedDates',
  'volume24hr',
  'volume1wk',
  'volume1mo',
  'volume1yr',
  'clobTokenIds',
  'umaBond',
  'umaReward',
  'volume24hrClob',
  'volume1wkClob',
  'volume1moClob',
  'volume1yrClob',
  'volumeClob',
  'liquidityClob',
  'acceptingOrders',
  'negRisk',
  'negRiskMarketID',
  'negRiskRequestID',
  'events',
  'ready',
  'funded',
  'acceptingOrdersTimestamp',
  'cyom',
  'competitive',
  'pagerDutyNotificationEnabled',
  'approved',
  'clobRewards',
  'rewardsMinSize',
  'rewardsMaxSpread',
  'spread',
  'oneDayPriceChange',
  'lastTradePrice',
  'bestAsk',
  'automaticallyActive',
  'clearBookOnStart',
  'showGmpSeries',
  'showGmpOutcome',
  'manualActivation',
  'negRiskOther',
  'umaResolutionStatuses',
  'pendingDeployment',
  'deploying',
  'deployingTimestamp',
  'rfqEnabled'
]
```