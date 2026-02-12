"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockChartProps {
  symbol: string;
  stockData: any;
}

export function StockChart({ symbol, stockData }: StockChartProps) {
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [range, setRange] = useState("1d");

  useEffect(() => {
    if (!symbol) return;

    const fetchHistoricalData = async () => {
      // Check if it's an index
      const isIndex = symbol.includes("NIFTY") || symbol.includes("SENSEX") || symbol.includes("MIDCAP") || symbol.includes("SMALLCAP") || symbol.includes("FINNIFTY") || symbol.includes("VIX") || symbol.includes("BSE");

      if (isIndex) {
        // Generate simulated intraday data for indices
        // This is a visual fallback until we have real index historical data
        const mockData = [];
        const now = new Date();
        const startTime = new Date();
        startTime.setHours(9, 15, 0, 0); // Market open 9:15 AM

        let currentTime = new Date(startTime);
        let currentPrice = stockData?.last_price || (symbol.includes("NIFTY 50") ? 25800 : 84000);

        // Generate points from 9:15 AM to now (or 3:30 PM)
        while (currentTime <= now && currentTime.getHours() < 16) { // Until 4 PM max
          const timeLabel = currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

          // Random walk for price simulation
          const change = (Math.random() - 0.5) * (currentPrice * 0.002); // 0.2% max fluctuation per minute
          currentPrice += change;

          mockData.push({
            time: timeLabel,
            price: currentPrice
          });

          currentTime.setMinutes(currentTime.getMinutes() + 5); // 5-minute intervals
        }

        setHistoricalData(mockData);
        return;
      }

      try {
        const res = await fetch(`/api/stocks/${symbol}/historical?range=${range}`);

        // If API returns 404 or error, handle gracefully
        if (!res.ok) {
          console.log(`No historical data available for ${symbol}`);
          setHistoricalData([]);
          return;
        }

        const data = await res.json();

        if (Array.isArray(data)) {
          setHistoricalData(data);
        } else {
          console.error("Historical data format error:", data);
          setHistoricalData([]); // Clear chart on error
        }
      } catch (error) {
        console.error("Error fetching historical chart data:", error);
        setHistoricalData([]);
      }
    };

    fetchHistoricalData();

    // Refresh chart every minute only for 1d view
    let interval: NodeJS.Timeout;
    if (range === "1d") {
      interval = setInterval(fetchHistoricalData, 60000);
    }

    return () => clearInterval(interval);
  }, [symbol, range]);

  const change = stockData?.change || 0;
  const changePercent = stockData?.change_percent || 0;
  const price = stockData?.last_price || 0;
  const longName = stockData?.longName || symbol;

  const handleRangeChange = (newRange: string) => {
    setRange(newRange);
  };

  return (
    <div className="p-4 md:p-8 rounded-3xl bg-card border border-border relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Header */}
      <div className="relative z-10 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold mb-1 text-foreground">{longName}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm font-medium">{symbol}</span>
              <span className="text-xs">•</span>
              <span className="text-xs">NSE</span>
              <div className="flex items-center gap-1 text-xs">
                <Activity className="h-3 w-3 text-green-500" />
                <span className="text-green-500">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Price Display */}
        <div className="flex items-baseline gap-3">
          <span className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={cn(
            "flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-xs md:text-sm font-semibold",
            change >= 0 ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10"
          )}>
            {change >= 0 ? <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4" /> : <ArrowDownRight className="h-3 w-3 md:h-4 md:w-4" />}
            {change > 0 ? "+" : ""}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative z-10 h-[250px] md:h-[450px] w-full mt-4 md:mt-8">
        {historicalData.length === 0 ? (
          <div className="h-full flex items-center justify-center border border-border rounded-2xl bg-muted/20">
            <div className="text-center px-4">
              <Activity className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Live index data available</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Historical chart coming soon</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData}>
              <defs>
                <linearGradient id={`colorPrice-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={change >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={change >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                minTickGap={30}
                dy={10}
              />
              <YAxis
                hide
                domain={['dataMin', 'dataMax']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Price']}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={change >= 0 ? "#22c55e" : "#ef4444"}
                strokeWidth={3}
                fill={`url(#colorPrice-${symbol})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Period Selector */}
      <div className="relative z-10 mt-6 flex gap-2 text-sm">
        {['1d', '5d', '1m', '1y', '5y'].map((r) => (
          <button
            key={r}
            onClick={() => handleRangeChange(r)}
            className={cn(
              "px-3 py-1.5 rounded-lg font-medium transition-colors",
              range === r
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
