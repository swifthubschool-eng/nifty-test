"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowUpRight, ArrowDownRight, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/use-socket";

// Initial data... (keep existing mocked data as base)
const INITIAL_DATA = [
  { time: "09:15", value: 25800 },
  // ... (keep 5-10 points for initialization)
  { time: "09:30", value: 25820 },
  { time: "10:00", value: 25860 },
  { time: "10:30", value: 25830 },
  { time: "11:00", value: 25880 },
  { time: "11:30", value: 25925 },
  { time: "12:00", value: 25950 },
  { time: "12:30", value: 25920 },
  { time: "13:00", value: 25880 },
  { time: "13:30", value: 25850 },
  { time: "14:00", value: 25880 },
  { time: "14:30", value: 25915 },
  { time: "15:00", value: 25930 },
  { time: "15:30", value: 25935.15 },
];

const INDICES = [
  { name: "NIFTY 50", symbol: "NIFTY 50", price: "25,807.20", currency: "INR", change: "-0.57%", trending: "down" },
  { name: "SENSEX", symbol: "SENSEX", price: "83,674.92", currency: "INR", change: "-0.66%", trending: "down" },
  { name: "NIFTY BANK", symbol: "NIFTY BANK", price: "60,739.75", currency: "INR", change: "-0.01%", trending: "down" },
  { name: "MIDCAP 100", symbol: "MIDCAP", price: "60,470.85", currency: "INR", change: "-0.47%", trending: "down" },
  { name: "SMALLCAP 100", symbol: "SMALLCAP", price: "17,344.10", currency: "INR", change: "-0.64%", trending: "down" },
  { name: "NIFTY FIN", symbol: "FINNIFTY", price: "28,385.20", currency: "INR", change: "+0.38%", trending: "up" },
];

export function MarketSummary() {
  const { socket, isConnected } = useSocket();
  const [indices, setIndices] = useState(INDICES);
  const [data, setData] = useState(INITIAL_DATA);
  const [currentPrice, setCurrentPrice] = useState(25935.15);
  const [change, setChange] = useState({ value: 18.70, percent: 0.07 }); // Initial seed 
  const [hoveredData, setHoveredData] = useState<any>(null);

  useEffect(() => {
    if (!socket) return;

    // Debug log
    console.log("Socket instance available, isConnected:", isConnected);

    const handleIndexUpdate = (update: { symbol: string; price: number; change?: number; percent?: number; timestamp: string }) => {
      console.log("Received index-update:", update); // Uncommented for debugging
      // Update Main Chart if Nifty 50
      if (update.symbol === "NIFTY 50") {
        setCurrentPrice(update.price);
        if (update.change !== undefined && update.percent !== undefined) {
          setChange({ value: update.change, percent: update.percent });
        }

        setData(prev => {
          const newData = [...prev];
          const lastPoint = { ...newData[newData.length - 1] };
          lastPoint.value = update.price;
          newData[newData.length - 1] = lastPoint;
          return newData;
        });
      }

      // Update Indices List (for any supported index)
      setIndices(prevIndices => {
        return prevIndices.map(index => {
          if (index.symbol === update.symbol) {
            const change = update.change || 0;
            const percent = update.percent || 0;
            return {
              ...index,
              price: update.price.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
              change: `${change > 0 ? "+" : ""}${percent.toFixed(2)}%`,
              trending: change >= 0 ? "up" : "down"
            };
          }
          return index;
        });
      });
    };

    socket.on("index-update", handleIndexUpdate);

    return () => {
      socket.off("index-update", handleIndexUpdate);
    };
  }, [socket, isConnected]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main Chart Section */}
      <div className="flex-1 p-8 rounded-3xl bg-card border border-border relative overflow-hidden group">


        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex bg-muted rounded-full p-1 pr-4 items-center gap-3 border border-border">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              50
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-foreground font-semibold">Nifty 50</span>
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">NIFTY</span>
                {/* Connection Indicator */}
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  isConnected ? "bg-green-500" : "bg-red-500 animate-pulse"
                )} title={isConnected ? "Live Connected" : "Connecting..."} />
              </div>
            </div>
          </div>
        </div>

        {/* Price & Change */}
        <div className="mb-8">
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-bold text-foreground tracking-tight">
              {currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-lg text-muted-foreground font-medium">INR</span>
            <span className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold ml-2",
              change.value >= 0 ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10"
            )}>
              {change.value >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {change.value > 0 ? "+" : ""}{change.value.toFixed(2)} ({change.percent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Area Chart */}
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} onMouseMove={(e: any) => { if (e.activePayload) setHoveredData(e.activePayload[0].payload) }} onMouseLeave={() => setHoveredData(null)}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                ticks={['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30']}
                dy={15}
              />
              <YAxis hide domain={['dataMin - 50', 'dataMax + 50']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
                itemStyle={{ color: 'var(--color-foreground)' }}
                cursor={{ stroke: 'var(--color-border)', strokeWidth: 1, strokeDasharray: '4 4' }}
                formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Value']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#22c55e"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right Sidebar: Major Indices */}
      <div className="w-full lg:w-96 p-6 rounded-3xl bg-card border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-6">Major indices</h3>

        <div className="space-y-4">
          {indices.map((index) => (
            <div key={index.name} className="flex items-center justify-between group hover:bg-muted p-2 rounded-xl transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold ring-1 ring-border",
                  index.name === "NIFTY 50" ? "bg-blue-600 text-white" :
                    index.name === "SENSEX" ? "bg-purple-600 text-white" :
                      index.name === "NIFTY BANK" ? "bg-green-600 text-white" :
                        index.name === "NIFTY FIN" ? "bg-yellow-600 text-white" :
                          "bg-muted text-muted-foreground"
                )}>
                  {index.symbol.substring(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground group-hover:text-blue-400 transition-colors">{index.name}</span>
                    {index.currency !== "INR" && <span className="text-[10px] bg-muted text-muted-foreground px-1 rounded">{index.currency}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{index.symbol}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-medium text-foreground">
                  {index.price} <span className="text-xs text-muted-foreground font-normal">{index.currency}</span>
                </div>
                <div className={cn(
                  "text-xs font-medium flex items-center justify-end gap-1",
                  index.trending === "up" ? "text-green-500" : "text-red-500"
                )}>
                  {index.change}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Link href="/indices">
          <button className="w-full mt-6 py-2 text-sm text-primary hover:text-primary/80 transition-colors text-left flex items-center gap-1">
            See all major Indices <ArrowUpRight className="h-3 w-3" />
          </button>
        </Link>
      </div>
    </div>
  );
}
