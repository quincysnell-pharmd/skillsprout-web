"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";

interface Parent {
  id: string;
  email: string;
  created_at: string;
  is_banned?: boolean;
  children?: Child[];
}

interface Child {
  id: string;
  display_name: string;
  username: string;
  xp: number;
  level: number;
  is_active: boolean;
  parent_id: string;
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition";
const labelCls = "block text-xs font-bold text-slate-600 mb-1.5";

export default function AdminUsersPage() {
  const supabase = supabaseBrowser();
  const [parents, setParents]   = useState<Parent[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const [xpModal, setXpModal]   = useState<Child | null>(null);
  const [xpAmount, setXpAmount] = useState(0);
  const [xpBusy, setXpBusy]     = useState(false);
  const [pwModal, setPwModal]   = useState<Child | null>(null);
  const [newPin, setNewPin]     = useState("");
  const [pwBusy, setPwBusy]     = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: parentData }, { data: childData }] = await Promise.all([
      supabase.from("profiles").select("id, email, created_at, is_banned").order("created_at", { ascending: false }),
      supabase.from("child_profiles").select("id, display_name, username, xp, level, is_active, parent_id").order("display_name"),
    ]);
    setParents((parentData as Parent[]) ?? []);
    setChildren((childData as Child[]) ?? []);
    setLoading(false);
  }

  function childrenForParent(parentId: string) {
    return children.filter(c => c.parent_id === parentId);
  }

  async function banParent(parent: Parent) {
    const newVal = !parent.is_banned;
    if (!confirm(`${newVal ? "Ban" : "Unban"} this parent account?`)) return;
    await supabase.from("profiles").update({ is_banned: newVal }).eq("id", parent.id);
    setParents(prev => prev.map(p => p.id === parent.id ? { ...p, is_banned: newVal } : p));
  }

  async function toggleChild(child: Child) {
    const newVal = !child.is_active;
    if (!confirm(`${newVal ? "Activate" : "Deactivate"} ${child.display_name}'s account?`)) return;
    await supabase.from("child_profiles").update({ is_active: newVal }).eq("id", child.id);
    setChildren(prev => prev.map(c => c.id === child.id ? { ...c, is_active: newVal } : c));
  }

  async function awardXP() {
    if (!xpModal || xpAmount <= 0) return;
    setXpBusy(true);
    const newXP = (xpModal.xp ?? 0) + xpAmount;
    await supabase.from("child_profiles").update({ xp: newXP }).eq("id", xpModal.id);
    setChildren(prev => prev.map(c => c.id === xpModal.id ? { ...c, xp: newXP } : c));
    setXpModal(null);
    setXpAmount(0);
    setXpBusy(false);
  }

  async function resetPin() {
    if (!pwModal || newPin.length < 4) return;
    setPwBusy(true);
    // Store hashed pin — for simplicity storing plain, but should be hashed in production
    await supabase.from("child_profiles").update({ pin: newPin }).eq("id", pwModal.id);
    setPwModal(null);
    setNewPin("");
    setPwBusy(false);
    alert(`PIN updated for ${pwModal.display_name}!`);
  }

  const filteredParents = parents.filter(p =>
    !search || p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-black text-slate-900">👥 Users</h1>
        <p className="text-sm font-semibold text-slate-500 mt-1">Manage parent accounts and their children</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Parents", value: parents.length, emoji: "👨‍👩‍👧", color: "bg-violet-50 border-violet-200" },
          { label: "Total Kids",    value: children.length, emoji: "🧒",      color: "bg-emerald-50 border-emerald-200" },
          { label: "Banned",        value: parents.filter(p => p.is_banned).length, emoji: "🚫", color: "bg-rose-50 border-rose-200" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border-2 ${s.color} p-4 text-center`}>
            <div className="text-3xl mb-1">{s.emoji}</div>
            <div className="font-display text-2xl font-black text-slate-900">{s.value}</div>
            <div className="text-xs font-bold text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input className={inputCls} value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search by parent email..." />

      {/* User list */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="text-4xl animate-bounce">👥</div></div>
      ) : filteredParents.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="font-bold text-slate-400">No users found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredParents.map(parent => {
            const kids = childrenForParent(parent.id);
            const isExpanded = expandedParent === parent.id;
            return (
              <div key={parent.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                {/* Parent row */}
                <div className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-lg font-black text-violet-700">
                    {parent.email?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 truncate">{parent.email}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-slate-400">
                        Joined {new Date(parent.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">·</span>
                      <span className="text-xs font-semibold text-slate-500">{kids.length} kid{kids.length !== 1 ? "s" : ""}</span>
                      {parent.is_banned && (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">🚫 Banned</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {kids.length > 0 && (
                      <button onClick={() => setExpandedParent(isExpanded ? null : parent.id)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
                        {isExpanded ? "Hide Kids ▲" : `Kids (${kids.length}) ▼`}
                      </button>
                    )}
                    <button onClick={() => banParent(parent)}
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                        parent.is_banned
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                      }`}>
                      {parent.is_banned ? "Unban" : "Ban"}
                    </button>
                  </div>
                </div>

                {/* Children rows */}
                {isExpanded && kids.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50 divide-y divide-slate-100">
                    {kids.map(child => (
                      <div key={child.id} className="flex items-center gap-3 px-4 py-3 pl-14">
                        <div className="text-xl shrink-0">🧒</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-slate-800">{child.display_name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-semibold text-slate-400">@{child.username}</span>
                            <span className="text-xs font-semibold text-amber-600">⭐ {child.xp ?? 0} XP</span>
                            <span className="text-xs font-semibold text-violet-600">Level {child.level ?? 1}</span>
                            {!child.is_active && (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">Inactive</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => { setXpModal(child); setXpAmount(0); }}
                            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition">
                            ⭐ Award XP
                          </button>
                          <button onClick={() => { setPwModal(child); setNewPin(""); }}
                            className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition">
                            🔑 Reset PIN
                          </button>
                          <button onClick={() => toggleChild(child)}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                              child.is_active
                                ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}>
                            {child.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Award XP Modal */}
      {xpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl p-6 space-y-4">
            <h2 className="font-display text-xl font-bold text-slate-900">⭐ Award XP</h2>
            <p className="text-sm font-semibold text-slate-600">Awarding XP to <strong>{xpModal.display_name}</strong> (currently {xpModal.xp ?? 0} XP)</p>
            <div>
              <label className={labelCls}>XP Amount</label>
              <input className={inputCls} type="number" min={1} value={xpAmount || ""} onChange={e => setXpAmount(Number(e.target.value))} placeholder="e.g. 50" />
            </div>
            <div className="flex gap-3">
              <button onClick={awardXP} disabled={xpBusy || xpAmount <= 0}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50 transition">
                {xpBusy ? "Awarding…" : "Award XP ⭐"}
              </button>
              <button onClick={() => setXpModal(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset PIN Modal */}
      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl p-6 space-y-4">
            <h2 className="font-display text-xl font-bold text-slate-900">🔑 Reset PIN</h2>
            <p className="text-sm font-semibold text-slate-600">Set a new PIN for <strong>{pwModal.display_name}</strong></p>
            <div>
              <label className={labelCls}>New PIN (4+ digits)</label>
              <input className={inputCls} type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="Enter new PIN" maxLength={8} />
            </div>
            <div className="flex gap-3">
              <button onClick={resetPin} disabled={pwBusy || newPin.length < 4}
                className="flex-1 rounded-xl bg-sky-600 py-2.5 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50 transition">
                {pwBusy ? "Saving…" : "Set PIN 🔑"}
              </button>
              <button onClick={() => setPwModal(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}