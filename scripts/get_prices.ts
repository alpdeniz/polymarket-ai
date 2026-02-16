import dotenv from "dotenv";
dotenv.config();

import { getPrices } from "../src/prices";

getPrices().then((prices) => console.log(prices, prices.length));
