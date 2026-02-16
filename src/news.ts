import fs from "fs";
import Parser from "rss-parser";
import model from "./models";

const FEEDS = [
  { name: "World News", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362" },
  { name: "US Top News", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114" },
  { name: "Finance News", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664" },
  { name: "Markets", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258" },
  { name: "Earnings", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839135" },
  { name: "Technology", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=19854910" },
];

const parser = new Parser();

async function collectNews(): Promise<string> {
  const sections = await Promise.all(
    FEEDS.map(async ({ name, url }) => {
      try {
        console.log(`Parsing ${name}`);
        const feed = await parser.parseURL(url);
        const items = feed.items
          .map((i) => `Title: ${i.title}\nDescription: ${i.content}\nDate: ${i.isoDate}`)
          .join("\n\n");
        return `\n${name}\n${items}`;
      } catch (err) {
        console.warn(`Failed to fetch ${name}: ${(err as Error).message}`);
        return "";
      }
    })
  );
  const news = sections.filter(Boolean).join("\n");
  console.log(`News size: ${news.length}`);
  return news;
}

async function summarize(news: string): Promise<string> {
  const summary = await model.query(`\
Below is a feed of world, finance, markets, earnings, and technology news:

${news}

Digest all of it, and generate a clear text listing all of the information contained in the news text.
Focus on information relevant to stock market analysis and investment decisions:
- Corporate earnings, guidance, and financial results
- Sector-specific trends and developments
- Macroeconomic indicators (interest rates, inflation, employment, GDP)
- Geopolitical events affecting markets
- Regulatory and policy changes
- Technology and industry disruptions
- Commodity and currency movements

Convey trends and directions that can help in predicting stock movements and identifying opportunities.
Deduplicate information and compress it without losing information.
Only output the final desired context form, without fore or final words.`);
  console.log(`Summarized news size: ${summary.length}`);
  return summary;
}

export async function getNews(): Promise<string> {
  const filename = `output/news_${new Date().toDateString()}.md`;
  if (fs.existsSync(filename)) {
    console.log(`Using cached: ${filename}`);
    return fs.readFileSync(filename, "utf8");
  }
  const raw = await collectNews();
  const summarized = await summarize(raw);
  if (!fs.existsSync("output")) fs.mkdirSync("output");
  fs.writeFileSync(filename, summarized);
  return summarized;
}
