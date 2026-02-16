import fs from "fs";
import Parser from "rss-parser";
import model from "./models";

const FEEDS = [
  { name: "World News", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362" },
  { name: "US Top News", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114" },
  { name: "Finance News", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664" },
  { name: "Politics", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000113" },
];

const parser = new Parser();

async function collectNews(): Promise<string> {
  const sections = await Promise.all(
    FEEDS.map(async ({ name, url }) => {
      console.log(`Parsing ${name}`);
      const feed = await parser.parseURL(url);
      const items = feed.items
        .map((i) => `Title: ${i.title}\nDescription: ${i.content}\nDate: ${i.isoDate}`)
        .join("\n\n");
      return `\n${name}\n${items}`;
    })
  );
  const news = sections.join("\n");
  console.log(`News size: ${news.length}`);
  return news;
}

async function summarize(news: string): Promise<string> {
  const summary = await model.query(`\
Below is a feed of world, finance, and politics news:

${news}

Digest all of it, and generate a clear text listing all of the information contained in the news text.
Make sure it is ready for digestion in order to predict future global, political or economic events and outcomes.
Convey trends and directions that can help in predicting future events and outcomes.
Deduplicate information -if exists- and compress it without losing information.
Only output the final desired context form that would work best for the consumer agent, without fore or final words.`);
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
  fs.writeFileSync(filename, summarized);
  return summarized;
}
