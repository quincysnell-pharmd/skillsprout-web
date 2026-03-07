"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";

interface Props {
  childId: string;
  courseId?: string;
  lessonId?: string;
  onClose: () => void;
  onAdded: () => void;
}

const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

// Popular companies for quick-pick
const POPULAR = [
  { ticker: "AAPL", name: "Apple" },
  { ticker: "NKE",  name: "Nike" },
  { ticker: "DIS",  name: "Disney" },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "AMZN", name: "Amazon" },
  { ticker: "TSLA", name: "Tesla" },
  { ticker: "SBUX", name: "Starbucks" },
  { ticker: "MCD",  name: "McDonald's" },
];

export function AddToPortfolioForm({ childId, courseId, lessonId, onClose, onAdded }: Props) {
  const supabase = supabaseBrowser();

  const [ticker, setTicker]       = useState("");
  const [companyName, setCompanyName] = useState("");
  const [whyChosen, setWhyChosen] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [pricePreview, setPricePreview] = useState<number | null>(null);

  async function lookupTicker(t: string) {
    if (!t.trim()) return;
    setLookingUp(true);
    setPricePreview(null);
    try {
      const res  = await fetch(`https://finnhub.io/api/v1/quote?symbol=${t.toUpperCase()}&token=${FINNHUB_KEY}`);
      const data = await res.json();
      if (data.c && data.c > 0) {
        setPricePreview(data.c);
        setError(null);
      } else {
        setPricePreview(null);
        setError("Ticker not found — double check the symbol!");
      }
    } catch {
      setError("Couldn't look up that ticker right now.");
    }
    setLookingUp(false);
  }

  function selectPopular(t: string, name: string) {
    setTicker(t);
    setCompanyName(name);
    lookupTicker(t);
  }

  async function submit() {
    if (!ticker.trim())      { setError("Please enter a ticker symbol."); return; }
    if (!companyName.trim()) { setError("Please enter the company name."); return; }
    if (!whyChosen.trim())   { setError("Please tell us why you chose this company!"); return; }
    if (!pricePreview)       { setError("Please look up the ticker first so we can record today's price."); return; }

    setBusy(true);
    setError(null);

    // Check if already in portfolio
    const { data: existing } = await supabase
      .from("portfolio_holdings")
      .select("id")
      .eq("child_id", childId)
      .eq("ticker", ticker.toUpperCase())
      .maybeSingle();

    if (existing) {
      setError("You already have this company in your portfolio!");
      setBusy(false);
      return;
    }

    const { error: insertError } = await supabase.from("portfolio_holdings").insert({
      child_id:          childId,
      ticker:            ticker.toUpperCase(),
      company_name:      companyName.trim(),
      why_chosen:        whyChosen.trim(),
      product_desc:      productDesc.trim() || null,
      price_when_added:  pricePreview,
      course_id:         courseId ?? null,
      lesson_id:         lessonId ?? null,
    });

    if (insertError) { setError(insertError.message); setBusy(false); return; }

    // Cache the price
    await supabase.from("stock_price_cache").upsert({
      ticker: ticker.toUpperCase(),
      price: pricePreview,
      updated_at: new Date().toISOString(),
    });

    setBusy(false);
    onAdded();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div>
            <h2 className="font-display text-xl font-black text-slate-900">➕ Add to My Portfolio</h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Record today's price and track how it grows!</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Quick picks */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Popular Companies</label>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((p) => (
                <button key={p.ticker} onClick={() => selectPopular(p.ticker, p.name)}
                  className={`rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition ${
                    ticker === p.ticker ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                  }`}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Ticker */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Ticker Symbol *</label>
            <div className="flex gap-2">
              <input value={ticker} onChange={(e) => { setTicker(e.target.value.toUpperCase()); setPricePreview(null); }}
                placeholder="e.g. NKE" maxLength={6}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-slate-800 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition" />
              <button onClick={() => lookupTicker(ticker)} disabled={!ticker.trim() || lookingUp}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-40 transition whitespace-nowrap">
                {lookingUp ? "..." : "Look Up"}
              </button>
            </div>
            {pricePreview && (
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                <span className="text-emerald-600">✓</span>
                <span className="text-sm font-bold text-emerald-800">Current price: <span className="text-emerald-600">${pricePreview.toFixed(2)}</span> — this will be your starting price!</span>
              </div>
            )}
          </div>

          {/* Company name */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Company Name *</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Nike" maxLength={60}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition" />
          </div>

          {/* Why chosen */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Why did you choose this company? *</label>
            <textarea value={whyChosen} onChange={(e) => setWhyChosen(e.target.value)} rows={3}
              placeholder="e.g. I like their shoes and a lot of athletes wear them."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition resize-none" />
          </div>

          {/* Product description */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">What do they make or sell? <span className="text-slate-400 font-semibold">(optional)</span></label>
            <input value={productDesc} onChange={(e) => setProductDesc(e.target.value)}
              placeholder="e.g. Shoes and sports clothes"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition" />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 transition">Cancel</button>
          <button onClick={submit} disabled={busy}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition">
            {busy ? "Adding..." : "Add to My Portfolio 📈"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Success banner ────────────────────────────────────────────
export function PortfolioAddedBanner({ ticker, price, onClose }: { ticker: string; price: number; onClose: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
      <div className="text-5xl">📈</div>
      <h3 className="font-display text-xl font-bold text-emerald-900">{ticker} added to your portfolio!</h3>
      <p className="text-sm font-semibold text-emerald-700">Starting price recorded at <span className="font-black">${price.toFixed(2)}</span>. Check your portfolio anytime to see how it's doing!</p>
      <button onClick={onClose} className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition">Got it! 📊</button>
    </div>
  );
}