"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";

export default function ContactPage() {
  const supabase = supabaseBrowser();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function submit() {
    if (!form.message.trim() || !form.email.trim()) {
      setError("Please fill in your email and message.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("support_tickets").insert({
      name: form.name.trim() || null,
      email: form.email.trim(),
      subject: form.subject.trim() || null,
      message: form.message.trim(),
      user_id: user?.id ?? null,
      source: "contact_form",
      page_url: window.location.href,
    });
    if (err) { setError("Something went wrong. Please try again."); setBusy(false); return; }
    setSubmitted(true);
    setBusy(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-10 px-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-10 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="text-5xl mb-4">💬</div>
        <h1 className="font-display text-4xl font-black">Contact Us</h1>
        <p className="mt-2 text-white/80 font-semibold max-w-md">
          Have a question, suggestion, or need help? We'd love to hear from you!
        </p>
      </div>

      {/* Contact info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="text-3xl mb-3">📧</div>
          <h3 className="font-display font-bold text-slate-900">Email Us</h3>
          <p className="text-sm font-semibold text-slate-500 mt-1">For general inquiries</p>
          <a href="mailto:hello@myskillsprout.com"
            className="mt-2 block text-sm font-bold text-emerald-600 hover:text-emerald-800 transition">
            hello@myskillsprout.com
          </a>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="text-3xl mb-3">⏱️</div>
          <h3 className="font-display font-bold text-slate-900">Response Time</h3>
          <p className="text-sm font-semibold text-slate-500 mt-1">We typically respond within</p>
          <p className="mt-2 text-sm font-bold text-emerald-600">1–2 business days</p>
        </div>
      </div>

      {/* Contact form */}
      {submitted ? (
        <div className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-10 text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h2 className="font-display text-2xl font-black text-emerald-900">Message Sent!</h2>
          <p className="text-sm font-semibold text-emerald-700">
            Thanks for reaching out! We'll get back to you within 1–2 business days.
          </p>
          <button onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
            className="rounded-xl border-2 border-emerald-300 bg-white px-6 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition">
            Send Another Message
          </button>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm space-y-5">
          <h2 className="font-display text-xl font-black text-slate-900">Send us a message</h2>
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              ❌ {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Your Name</label>
              <input value={form.name} onChange={e => set("name", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition"
                placeholder="e.g. Sarah Smith" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Email Address *</label>
              <input value={form.email} onChange={e => set("email", e.target.value)}
                type="email"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition"
                placeholder="you@email.com" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Subject</label>
            <input value={form.subject} onChange={e => set("subject", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition"
              placeholder="e.g. Question about a course" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Message *</label>
            <textarea value={form.message} onChange={e => set("message", e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition resize-none"
              placeholder="Tell us how we can help..." />
          </div>
          <button onClick={submit} disabled={busy}
            className="w-full rounded-2xl bg-emerald-600 py-4 text-base font-black text-white hover:bg-emerald-700 transition disabled:opacity-50">
            {busy ? "Sending..." : "Send Message 💬"}
          </button>
        </div>
      )}
    </div>
  );
}