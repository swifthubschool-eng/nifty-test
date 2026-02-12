import { kite } from "@/lib/kite";

export const dynamic = "force-dynamic";

// In-memory cache for instruments
let cachedInstruments: any[] = [];
let lastFetch = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function fetchInstruments() {
  const now = Date.now();

  if (cachedInstruments.length > 0 && now - lastFetch < CACHE_DURATION) {
    return cachedInstruments;
  }

  try {
    // Fetch all NSE instruments
    const instruments = await (kite as any).getInstruments("NSE");

    // Filter for Equity segment only
    const equityInstruments = instruments.filter(
      (inst: any) =>
        inst.segment === "NSE" &&
        inst.instrument_type === "EQ" &&
        inst.name &&
        // Filter out non-stocks
        !inst.tradingsymbol.includes("-TB") &&
        !inst.tradingsymbol.includes("-GS") &&
        !inst.tradingsymbol.includes("-SG") &&
        !inst.tradingsymbol.includes("-EB") &&
        !inst.tradingsymbol.endsWith("INAV") &&
        !inst.name.toUpperCase().includes("GOI TBILL") &&
        !inst.name.toUpperCase().includes("G-SEC") &&
        !inst.name.toUpperCase().includes("STATE GOV") &&
        !inst.name.toUpperCase().includes(" ETF") &&
        !/^\d/.test(inst.tradingsymbol)
    );

    // Simplify data
    const simplified = equityInstruments.map((inst: any) => ({
      symbol: inst.tradingsymbol,
      name: inst.name,
      instrument_token: inst.instrument_token,
      exchange: "NSE"
    }));

    cachedInstruments = simplified;
    lastFetch = now;

    return simplified;
  } catch (error) {
    console.error("Error fetching instruments:", error);
    return cachedInstruments; // Return stale cache if fetch fails
  }
}
