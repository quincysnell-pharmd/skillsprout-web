"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────
interface Holding {
  id: string;
  ticker: string;
  company_name: string;
  why_chosen?: string;
  product_desc?: string;
  price_when_added: number;
  added_at: string;
}

interface HoldingWithPrice extends Holding {
  current_price: number | null;
  change_pct: number | null;
  loading: boolean;
}

const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

// ── Fetch price (with 24h cache) ──────────────────────────────
async function fetchPrice(ticker: string, supabase: ReturnType<typeof supabaseBrowser>): Promise<number | null> {
  // Check cache first
  const { data: cached } = await supabase
    .from("stock_price_cache")
    .select("price, updated_at")
    .eq("ticker", ticker)
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date(cached.updated_at).getTime();
    if (age < 24 * 60 * 60 * 1000) return cached.price; // Under 24h, use cache
  }

  // Fetch from Finnhub
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`);
    const data = await res.json();
    const price = data.c; // current price
    if (!price || price === 0) return cached?.price ?? null;

    // Upsert cache
    await supabase.from("stock_price_cache").upsert({ ticker, price, updated_at: new Date().toISOString() });
    return price;
  } catch {
    return cached?.price ?? null;
  }
}

// ── Change pill ───────────────────────────────────────────────
function ChangePill({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs font-bold text-slate-400">—</span>;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${
      up ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
    }`}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

// ── Main Portfolio Page ───────────────────────────────────────
export default function PortfolioPage({ childId }: { childId: string }) {
  const supabase = supabaseBrowser();
  const [holdings, setHoldings] = useState<HoldingWithPrice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { if (childId) loadHoldings(); }, [childId]);

  async function loadHoldings() {
    setLoading(true);
    const { data } = await supabase
      .from("portfolio_holdings")
      .select("*")
      .eq("child_id", childId)
      .order("added_at", { ascending: true });

    const rows = (data ?? []) as Holding[];

    // Set loading state for each
    setHoldings(rows.map((h) => ({ ...h, current_price: null, change_pct: null, loading: true })));
    setLoading(false);

    // Fetch prices one by one
    for (const h of rows) {
      const price = await fetchPrice(h.ticker, supabase);
      const change = price && h.price_when_added
        ? ((price - h.price_when_added) / h.price_when_added) * 100
        : null;
      setHoldings((prev) => prev.map((p) =>
        p.id === h.id ? { ...p, current_price: price, change_pct: change, loading: false } : p
      ));
    }
  }

  async function removeHolding(id: string) {
    await supabase.from("portfolio_holdings").delete().eq("id", id);
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  }

  if (loading) return (
    <div className="flex justify-center py-16"><div className="text-4xl animate-bounce">📈</div></div>
  );

  const totalValue = holdings.reduce((sum, h) => sum + (h.current_price ?? h.price_when_added), 0);
  const totalCost  = holdings.reduce((sum, h) => sum + h.price_when_added, 0);
  const totalChange = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Portfolio summary */}
      {holdings.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-lg">
          <h2 className="font-display text-lg font-black mb-4">📊 My Portfolio Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs font-bold text-white/70">Companies</div>
              <div className="text-2xl font-black mt-1">{holdings.length}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-white/70">Starting Value</div>
              <div className="text-2xl font-black mt-1">${totalCost.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-white/70">Overall Change</div>
              <div className={`text-2xl font-black mt-1 ${totalChange >= 0 ? "text-white" : "text-rose-200"}`}>
                {totalChange >= 0 ? "▲" : "▼"} {Math.abs(totalChange).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holdings list */}
      {holdings.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center">
          <div className="text-5xl mb-3">📈</div>
          <p className="font-bold text-slate-400">No companies yet!</p>
          <p className="text-sm font-semibold text-slate-400 mt-1">Add companies during your investing lessons.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {holdings.map((h) => (
            <div key={h.id}
              className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              {/* Main row */}
              <button onClick={() => setExpanded(expanded === h.id ? null : h.id)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition">
                {/* Ticker badge */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white text-xs font-black">
                  {h.ticker}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900">{h.company_name}</div>
                  <div className="text-xs font-semibold text-slate-400 mt-0.5">
                    Added {new Date(h.added_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {h.loading ? (
                    <div className="h-5 w-16 rounded bg-slate-100 animate-pulse" />
                  ) : (
                    <>
                      <div className="font-black text-slate-900">
                        ${h.current_price?.toFixed(2) ?? "—"}
                      </div>
                      <div className="mt-1"><ChangePill pct={h.change_pct} /></div>
                    </>
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              {expanded === h.id && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3 bg-slate-50">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white border border-slate-100 p-3">
                      <div className="text-xs font-bold text-slate-500">Price When Added</div>
                      <div className="text-lg font-black text-slate-900 mt-1">${h.price_when_added.toFixed(2)}</div>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-100 p-3">
                      <div className="text-xs font-bold text-slate-500">Current Price</div>
                      <div className="text-lg font-black text-slate-900 mt-1">
                        {h.loading ? "..." : `$${h.current_price?.toFixed(2) ?? "—"}`}
                      </div>
                    </div>
                  </div>
                  {h.why_chosen && (
                    <div className="rounded-xl bg-white border border-slate-100 p-3">
                      <div className="text-xs font-bold text-slate-500 mb-1">💭 Why I chose this company</div>
                      <p className="text-sm font-semibold text-slate-700">{h.why_chosen}</p>
                    </div>
                  )}
                  {h.product_desc && (
                    <div className="rounded-xl bg-white border border-slate-100 p-3">
                      <div className="text-xs font-bold text-slate-500 mb-1">🏭 What they make</div>
                      <p className="text-sm font-semibold text-slate-700">{h.product_desc}</p>
                    </div>
                  )}
                  <button onClick={() => removeHolding(h.id)}
                    className="text-xs font-bold text-rose-400 hover:text-rose-600 transition">
                    Remove from portfolio
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs font-semibold text-slate-400">
        📊 Prices update every 24 hours · This is a practice portfolio for learning purposes only
      </p>
    </div>
  );
}