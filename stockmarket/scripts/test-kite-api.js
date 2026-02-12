/**
 * Test script to inspect raw Kite Connect API response
 */

const { KiteConnect } = require("kiteconnect");
require('dotenv').config();

const kite = new KiteConnect({
  api_key: process.env.KITE_API_KEY,
});

kite.setAccessToken(process.env.KITE_ACCESS_TOKEN);

const instruments = ["NSE:RELIANCE", "NSE:TCS", "NSE:INFY"];

console.log("\n🔍 Fetching quotes for:", instruments.join(", "), "\n");

kite.getQuote(instruments)
  .then((quotes) => {
    console.log("✅ Raw API Response:\n");
    console.log(JSON.stringify(quotes, null, 2));
    
    console.log("\n📊 Parsed Data:\n");
    Object.keys(quotes).forEach(instrument => {
      const quote = quotes[instrument];
      console.log(`${instrument}:`);
      console.log(`  last_price: ${quote.last_price}`);
      console.log(`  net_change: ${quote.net_change}`);
      console.log(`  ohlc.close: ${quote.ohlc?.close}`);
      console.log(`  change: ${quote.change}`);
      console.log("");
    });
  })
  .catch((error) => {
    console.error("❌ Error:", error.message);
  });
