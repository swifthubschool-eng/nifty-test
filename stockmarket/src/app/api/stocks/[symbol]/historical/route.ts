
import { kite } from "@/lib/kite";
import { fetchInstruments } from "@/lib/instruments";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> } // Params are now a Promise in Next.js 15+
) {
  try {
    const { symbol } = await params;
    const upperSymbol = symbol.toUpperCase();

    // 1. Get instrument token
    const instruments = await fetchInstruments();
    const instrument = instruments.find((inst: any) => inst.symbol === upperSymbol);

    if (!instrument || !instrument.instrument_token) {
      return NextResponse.json({ error: "Instrument not found" }, { status: 404 });
    }

    // 2. Define time range and interval based on query
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "1d"; // 1d, 5d, 1mo, 1y, 5y

    let fromDate = new Date();
    let toDate = new Date();
    let interval = "minute";

    // Normalize today
    const now = new Date();

    switch (range) {
      case "1d":
        fromDate.setHours(9, 15, 0, 0);
        toDate.setHours(15, 30, 0, 0);
        if (now < fromDate) {
          // If requested before market open, show yesterday's close? 
          // For now, let's just keep today, it will return empty which is fine.
        }
        interval = "minute";
        break;
      case "5d":
        fromDate.setDate(now.getDate() - 5);
        interval = "60minute"; // Use 60min for 5 days to reduce data points
        break;
      case "1m":
        fromDate.setDate(now.getDate() - 30);
        interval = "60minute";
        break;
      case "1y":
        fromDate.setDate(now.getDate() - 365);
        interval = "day";
        break;
      case "5y":
        fromDate.setDate(now.getDate() - (5 * 365));
        interval = "day";
        break;
      default:
        // Default to 1d
        fromDate.setHours(9, 15, 0, 0);
        toDate.setHours(15, 30, 0, 0);
        interval = "minute";
    }

    // Kite API expects dates as strings or Date objects.
    // historical(instrument_token, interval, from_date, to_date)

    // We casts kite as any because typescript definition might be missing historical method
    const candles = await (kite as any).getHistoricalData(
      instrument.instrument_token,
      interval,
      fromDate,
      toDate
    );

    // Format data for the chart
    // Kite returns: [[date, open, high, low, close, volume], ...]
    // We need: { time: "HH:MM", price: number }
    const chartData = candles.map((candle: any) => {
      const date = new Date(candle.date);

      let timeLabel = "";
      if (range === "1d") {
        timeLabel = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
      } else if (range === "5d" || range === "1m") {
        // Show "DD MMM HH:mm" for medium ranges
        timeLabel = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + " " + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
      } else {
        // Show "DD MMM YY" for long ranges
        timeLabel = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
      }

      return {
        time: timeLabel,
        originalDate: date.toISOString(),
        price: candle.close, // Using close price for line/area chart
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume
      };
    });

    return NextResponse.json(chartData);

  } catch (error: any) {
    console.error(`Error fetching historical data for ${await params}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch historical data", details: error.message },
      { status: 500 }
    );
  }
}
