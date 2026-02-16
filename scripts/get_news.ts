import dotenv from "dotenv";
dotenv.config();

import { getNews } from "../src/news";

getNews().then((news) => console.log(news, news.length));
