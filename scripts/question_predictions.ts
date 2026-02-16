import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import model from "../src/models";

async function main(question: string) {
  const today = new Date().toDateString();
  const news = fs.readFileSync(`./news_${today}.md`, "utf8");
  const predictions = fs.readFileSync(`./output/suggestions-${today}.md`, "utf8");

  const response = await model.query(`\
News summary:
${news}

Predictions:
${predictions}

Given above news summary and predictions, answer the following question:

${question}`);
  console.log(response);
}

main(process.argv[2]);
