import dotenv from "dotenv";
dotenv.config();

import { fetchStockUniverse } from "../src/stocks";

fetchStockUniverse().then((stocks) => {
  for (const s of stocks) {
    console.log(
      `${s.symbol.padEnd(8)} ${s.name.padEnd(30).slice(0, 30)} $${s.price.toFixed(2).padStart(10)}  1d:${s.change1d.padStart(8)}  7d:${s.change7d.padStart(8)}  1m:${s.change1m.padStart(8)}  1y:${s.change1y.padStart(8)}`,
    );
  }
  console.log(`\nTotal: ${stocks.length} stocks`);
});
