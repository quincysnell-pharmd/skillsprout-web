"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";

interface Ticket {
  id: string;
  name?: string;
  email?: string;
  subject?: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  source: "contact_form" | "help_button";
  page_url?: string;
  created_at: string;
}

const STATUS_CONFIG = {
  open:        { label: "Open",        color: "bg-amber-100 text-amber-700"   },
  in_progress: { label: "In Progress", color: "bg-sky-100 text-sky-700"       },
  resolved:    { label: "Resolved",    color: "bg-emerald-100 text-emerald-700" },
};

export default function AdminSupportPage() {
  const supabase = supabaseBrowser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "resolved">("open");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { loadTickets(); }, []);

  async function loadTickets() {
    setLoading(true);
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    setTickets((data as Ticket[]) ?? []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: Ticket["status"]) {
    await supabase.from("support_tickets").update({ status }).eq("id", id);
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  }

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);
  const openCount = tickets.filter(t => t.status === "open").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-900">💬 Support Tickets</h1>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">
            {openCount > 0 ? `${openCount} open ticket${openCount !== 1 ? "s" : ""} need attention` : "All caught up!"}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "open", "in_progress", "resolved"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition capitalize ${
              filter === f ? "bg-emerald-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}>
            {f.replace("_", " ")} {f === "all" ? `(${tickets.length})` : `(${tickets.filter(t => t.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="text-4xl animate-bounce">💬</div></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center">
          <div className="text-5xl mb-3">✅</div>
          <p className="font-bold text-slate-400">No tickets here!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ticket => (
            <div key={ticket.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <div className="flex items-start gap-4 p-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{ticket.name || "Anonymous"}</span>
                    {ticket.email && <span className="text-sm font-semibold text-slate-500">{ticket.email}</span>}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_CONFIG[ticket.status].color}`}>
                      {STATUS_CONFIG[ticket.status].label}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500 capitalize">
                      {ticket.source.replace("_", " ")}
                    </span>
                  </div>
                  {ticket.subject && <p className="text-sm font-bold text-slate-700 mt-1">{ticket.subject}</p>}
                  <p className={`text-sm font-semibold text-slate-600 mt-1 ${expanded === ticket.id ? "" : "line-clamp-2"}`}>
                    {ticket.message}
                  </p>
                  {ticket.message.length > 120 && (
                    <button onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-800 mt-1">
                      {expanded === ticket.id ? "Show less" : "Show more"}
                    </button>
                  )}
                  <div className="text-xs font-semibold text-slate-400 mt-2">
                    {new Date(ticket.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {ticket.page_url && <span className="ml-2 truncate">• {ticket.page_url}</span>}
                  </div>
                </div>
                <div className="shrink-0 flex flex-col gap-2">
                  {ticket.email && (
                    <a href={`mailto:${ticket.email}`}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition text-center">
                      Reply
                    </a>
                  )}
                  <select value={ticket.status} onChange={e => updateStatus(ticket.id, e.target.value as Ticket["status"])}
                    className="rounded-xl border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-600 outline-none focus:border-emerald-400">
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}