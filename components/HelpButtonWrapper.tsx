"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";

export default function HelpButtonWrapper() {
  const supabase = supabaseBrowser();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function submit() {
    if (!form.message.trim()) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("support_tickets").insert({
      name: form.name.trim() || null,
      email: form.email.trim() || null,
      message: form.message.trim(),
      user_id: user?.id ?? null,
      source: "help_button",
      page_url: window.location.href,
    });
    setSubmitted(true);
    setBusy(false);
    setTimeout(() => { setOpen(false); setSubmitted(false); setForm({ name: "", email: "", message: "" }); }, 2500);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition hover:scale-110"
        title="Need help?"
      >
        <span className="text-2xl">❓</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-black text-white">Need Help? 🌱</h2>
                <p className="text-xs font-semibold text-white/80 mt-0.5">We'll get back to you as soon as possible!</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-xl font-bold">✕</button>
            </div>
            <div className="p-6">
              {submitted ? (
                <div className="text-center space-y-3 py-4">
                  <div className="text-5xl">🎉</div>
                  <p className="font-display text-lg font-black text-emerald-900">Message sent!</p>
                  <p className="text-sm font-semibold text-slate-500">We'll be in touch soon.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Your Name</label>
                      <input value={form.name} onChange={e => set("name", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400"
                        placeholder="e.g. Alex" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Email</label>
                      <input value={form.email} onChange={e => set("email", e.target.value)}
                        type="email"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400"
                        placeholder="your@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">What do you need help with? *</label>
                    <textarea value={form.message} onChange={e => set("message", e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 resize-none"
                      placeholder="Describe what's happening or what you need help with..." />
                  </div>
                  <button onClick={submit} disabled={busy || !form.message.trim()}
                    className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-40">
                    {busy ? "Sending..." : "Send Message →"}
                  </button>
                  <p className="text-center text-xs font-semibold text-slate-400">
                    Or email us at{" "}
                    <a href="mailto:hello@myskillsprout.com" className="text-emerald-600 hover:underline">
                      hello@myskillsprout.com
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}