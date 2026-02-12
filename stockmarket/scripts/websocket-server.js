
const { Server } = require("socket.io");
const { createServer } = require("http");
require("dotenv").config();

const port = 3001;
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Track subscribed symbols
const subscribedSymbols = new Set();

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });

  socket.on("subscribe", (symbol) => {
    if (!symbol) return;
    const cleanSymbol = symbol.toUpperCase();
    console.log(`Client ${socket.id} subscribed to ${cleanSymbol}`);
    socket.join(cleanSymbol);
    subscribedSymbols.add(cleanSymbol);
  });
  
  socket.on("unsubscribe", (symbol) => {
    if (!symbol) return;
    const cleanSymbol = symbol.toUpperCase();
    console.log(`Client ${socket.id} unsubscribed from ${cleanSymbol}`);
    socket.leave(cleanSymbol);
    // Note: We don't remove from subscribedSymbols Set immediately because other clients might be subscribed.
    // In a production app, we'd count reference subscriptions. 
    // For now, it's fine to keep fetching.
  });
});

// State for Nifty 50
let niftyPrice = 25935.15;

// Initialize Kite Connect
const { KiteConnect } = require("kiteconnect");
const kite = new KiteConnect({
  api_key: process.env.KITE_API_KEY,
});
if (process.env.KITE_ACCESS_TOKEN) {
  kite.setAccessToken(process.env.KITE_ACCESS_TOKEN);
}

// Update function
setInterval(async () => {
  try {
    // 1. Fetch Nifty 50 (Always)
    const indexSymbol = "NSE:NIFTY 50";
    
    // 2. Prepare list of symbols to fetch
    // Add Nifty 50 to the list
    const symbolsToFetch = [indexSymbol];
    
    // Add subscribed symbols (prefix with NSE:)
    subscribedSymbols.forEach(s => {
        // Avoid duplicates if Nifty returned
        if (s !== "NIFTY 50" && !s.includes(":")) {
            symbolsToFetch.push(`NSE:${s}`);
        }
    });

    if (symbolsToFetch.length === 0) return;

    // console.log("Fetching quotes for:", symbolsToFetch);
    const quotes = await kite.getQuote(symbolsToFetch);
    
    // Process Nifty 50
    if (quotes[indexSymbol]) {
      const data = quotes[indexSymbol];
      const change = data.net_change || 0;
      const prevClose = data.ohlc?.close || data.last_price;
      const percent = prevClose > 0 ? (change / prevClose) * 100 : 0;
      
      const updateData = {
        symbol: "NIFTY 50",
        price: data.last_price,
        change: change,
        percent: percent,
        timestamp: new Date().toISOString()
      };
      
      io.emit("index-update", updateData);
    }

    // Process Subscribed Stocks
    subscribedSymbols.forEach(symbol => {
        const key = `NSE:${symbol}`;
        if (quotes[key]) {
            const data = quotes[key];
            
            // Use same fallback logic as API: last_price -> ohlc.close
            let price = data.last_price || 0;
            const close = data.ohlc?.close || 0;
            
            // If last_price is 0 (market closed), use closing price
            if (price === 0 && close > 0) {
                price = close;
            }
            
            // Use Kite's net_change directly (same as API - most reliable)
            // Kite's ohlc.close is unreliable - sometimes it's yesterday's close, sometimes today's
            let change = data.net_change || 0;
            let previousClose = 0;
            
            if (change !== 0) {
                // Calculate previous close from: price = previousClose + change
                previousClose = price - change;
            } else if (data.ohlc?.open && data.ohlc.open !== price) {
                // Fallback: use today's open as approximation
                previousClose = data.ohlc.open;
                change = price - previousClose;
            } else {
                // No reliable historical data available
                previousClose = price;
                change = 0;
            }
            
            const percent = previousClose > 0 ? (change / previousClose) * 100 : 0;
            
            const stockUpdate = {
                symbol: symbol,
                price: price,  // Use fallback price
                change: change,
                percent: percent,
                volume: data.volume,
                timestamp: new Date().toISOString()
            };
            
            // Only emit if we have a valid price
            if (price > 0) {
                io.to(symbol).emit("stock-update", stockUpdate);
            }
        }
    });

  } catch (error) {
    console.error("Error in fetch cycle:", error.message);
  }
}, 2000);

httpServer.listen(port, () => {
  console.log(`WebSocket server running on port ${port}`);
});
