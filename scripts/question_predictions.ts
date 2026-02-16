import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import model from "../src/models";

async function main(question: string) {
  const today = new Date().toDateString();
  const newsFile = `./output/news_${today}.md`;
  const analysisFile = `./output/stock-analysis-${today}.md`;

  if (!fs.existsSync(newsFile) || !fs.existsSync(analysisFile)) {
    console.error("Run the main analysis first (npm start) to generate today's files.");
    process.exit(1);
  }

  const news = fs.readFileSync(newsFile, "utf8");
  const analysis = fs.readFileSync(analysisFile, "utf8");

  const response = await model.query(`\
News summary:
${news}

Stock Analysis:
${analysis}

Given the above news summary and stock analysis, answer the following question:

${question}`);
  console.log(response);
}

main(process.argv[2]);
