"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";
import SetActiveChildOnLoad from "@/components/child/SetActiveChildOnLoad";

// ── Types ─────────────────────────────────────────────────────
interface ChildProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  streak_count: number;
  xp: number;
  status: "active" | "pending";
  parent_id?: string;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface Enrollment {
  id: string;
  course_id: string;
  progress_pct: number;
  courses: { title: string; category: string; level: string; emoji?: string };
}

// ── Avatar options ────────────────────────────────────────────
const AVATARS = [
  "🐸","🦊","🐼","🦁","🐨","🐙","🦋","🐬","🦄","🐲",
  "🐯","🦓","🦒","🐘","🦏","🦛","🦍","🐺","🦝","🦨",
  "🦡","🦫","🦦","🦥","🐿️","🦔","🐇","🐈","🐕","🐓",
  "🦚","🦜","🦩","🦢","🦅","🦉","🐳","🦈","🐊","🦎",
  "🌵","🍄","🌸","🌻","🌺","🍀","🎋","🪴","🌊","🔥",
  "⭐","🌈","🎮","🚀","🎨","🎸","🎯","🏆","💎","🪄",
];

// ── XP Level system ───────────────────────────────────────────
const XP_LEVELS = [
  { min: 0,    max: 100,  label: "Seedling",    emoji: "🌱", color: "emerald" },
  { min: 100,  max: 300,  label: "Sprout",      emoji: "🌿", color: "green"   },
  { min: 300,  max: 600,  label: "Bloom",       emoji: "🌸", color: "pink"    },
  { min: 600,  max: 1000, label: "Harvest",     emoji: "🌻", color: "amber"   },
  { min: 1000, max: 2000, label: "Grove",       emoji: "🌳", color: "teal"    },
  { min: 2000, max: 5000, label: "Forest",      emoji: "🌲", color: "cyan"    },
  { min: 5000, max: 9999, label: "Legend",      emoji: "🏆", color: "violet"  },
];

function getLevel(xp: number) {
  return XP_LEVELS.findLast((l) => xp >= l.min) ?? XP_LEVELS[0];
}

function getNextLevel(xp: number) {
  return XP_LEVELS.find((l) => xp < l.max) ?? XP_LEVELS[XP_LEVELS.length - 1];
}

// ── PENDING BANNER ────────────────────────────────────────────
function PendingBanner({ childId }: { childId: string }) {
  const [copied, setCopied] = useState(false);
  async function copyCode() {
    const supabase = supabaseBrowser();
    const { data } = await supabase.from("child_profiles").select("pending_code").eq("id", childId).maybeSingle();
    if (data?.pending_code) {
      navigator.clipboard.writeText(`${data.pending_code.slice(0,3)}-${data.pending_code.slice(3)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }
  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-5 flex items-start gap-3">
      <span className="text-2xl">⚠️</span>
      <div className="flex-1">
        <p className="font-bold text-amber-800">Your account isn't linked to a parent yet.</p>
        <p className="text-sm font-semibold text-amber-700 mt-1">You can browse everything, but your progress won't be saved until a parent links your account.</p>
        <button onClick={copyCode} className="mt-3 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 transition-colors">
          {copied ? "✓ Copied!" : "Copy my linking code"}
        </button>
      </div>
    </div>
  );
}

// ── AVATAR PICKER ─────────────────────────────────────────────
function AvatarPicker({ current, onSelect, onClose }: { current: string; onSelect: (a: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-slateald-900">Choose your avatar!</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <div className="grid grid-cols-8 gap-2 max-h-72 overflow-y-auto">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => { onSelect(a); onClose(); }}
              className={`text-2xl rounded-xl p-1.5 transition-all hover:scale-110 ${current === a ? "bg-emerald-100 ring-2 ring-emerald-400 scale-110" : "hover:bg-slate-100"}`}
            >
              {a}
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs font-semibold text-slate-400">More avatars unlock as you level up! 🔒</p>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function ChildDashboard() {
  const params   = useParams();
  const router   = useRouter();
  const supabase = supabaseBrowser();
  const childId  = params.childId as string;

  const [child, setChild]               = useState<ChildProfile | null>(null);
  const [badges, setBadges]             = useState<Badge[]>([]);
  const [enrollments, setEnrollments]   = useState<Enrollment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editingName, setEditingName]   = useState(false);
  const [nameInput, setNameInput]       = useState("");
  const [savingName, setSavingName]     = useState(false);
  const [activeTab, setActiveTab]       = useState<"home" | "courses" | "badges" | "friends">("home");

  useEffect(() => { if (childId) loadData(); }, [childId]);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth"); return; }

    const { data: childData } = await supabase
      .from("child_profiles")
      .select("id, username, display_name, avatar_url, streak_count, xp, status, parent_id")
      .eq("id", childId).maybeSingle();
    if (!childData) { router.replace("/dashboard/parent"); return; }
    setChild(childData as ChildProfile);
    setNameInput(childData.display_name || childData.username);

    const { data: badgeData } = await supabase
      .from("child_badges").select("badges(id, name, icon, description)").eq("child_id", childId);
    setBadges((badgeData ?? []).map((b: Record<string, unknown>) => b.badges as Badge).filter(Boolean));

    const { data: enrollData, error: enrollError } = await supabase
      .from("enrollments").select("id, course_id, progress_pct, courses(title, category, level, emoji)")
      .eq("child_id", childId).order("id", { ascending: false });
    console.log("Enrollments:", enrollData, "Error:", enrollError);
    setEnrollments((enrollData as unknown as Enrollment[]) ?? []);
    setLoading(false);
  }

  async function handleAvatarSelect(emoji: string) {
    if (!child) return;
    await supabase.from("child_profiles").update({ avatar_url: emoji }).eq("id", childId);
    setChild({ ...child, avatar_url: emoji });
  }

  async function saveName() {
    if (!child || !nameInput.trim()) return;
    setSavingName(true);
    await supabase.from("child_profiles").update({ display_name: nameInput.trim() }).eq("id", childId);
    setChild({ ...child, display_name: nameInput.trim() });
    setEditingName(false);
    setSavingName(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-5xl animate-bounce">🌱</div>
          <p className="text-sm font-bold text-slate-400">Loading your world…</p>
        </div>
      </div>
    );
  }

  if (!child) return null;

  const level     = getLevel(child.xp);
  const nextLevel = getNextLevel(child.xp);
  const xpProgress = Math.min(100, Math.round(((child.xp - level.min) / (nextLevel.max - level.min)) * 100));
  const avatar = child.avatar_url || "🌱";

  return (
    <>
      <SetActiveChildOnLoad childId={childId} />
      {showAvatarPicker && (
        <AvatarPicker current={avatar} onSelect={handleAvatarSelect} onClose={() => setShowAvatarPicker(false)} />
      )}

      <div className="max-w-2xl mx-auto space-y-4 py-6 px-4">

        {/* ── HERO CARD ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 p-6 text-white shadow-lg">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-52 w-52 rounded-full bg-white/5" />

          <div className="relative flex items-start gap-4">
            {/* Avatar */}
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="group relative shrink-0"
              title="Change avatar"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-5xl backdrop-blur-sm border-2 border-white/30 shadow-lg transition group-hover:scale-105 group-hover:bg-white/30">
                {avatar}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs shadow-md">
                ✏️
              </div>
            </button>

            {/* Name + stats */}
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                    maxLength={20}
                    autoFocus
                    className="rounded-xl bg-white/20 border border-white/40 px-3 py-1.5 text-lg font-bold text-white placeholder-white/60 outline-none focus:bg-white/30 w-40"
                  />
                  <button onClick={saveName} disabled={savingName} className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-bold hover:bg-white/30 transition">
                    {savingName ? "…" : "✓"}
                  </button>
                  <button onClick={() => setEditingName(false)} className="rounded-lg bg-white/10 px-2 py-1.5 text-sm hover:bg-white/20 transition">✕</button>
                </div>
              ) : (
                <button onClick={() => setEditingName(true)} className="group flex items-center gap-2 mb-1">
                  <h1 className="font-display text-2xl font-black truncate">{child.display_name || child.username}</h1>
                  <span className="opacity-0 group-hover:opacity-100 transition text-sm">✏️</span>
                </button>
              )}
              <p className="text-sm font-semibold text-white/70">@{child.username}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm font-bold backdrop-blur-sm border border-white/20">
                  🔥 {child.streak_count} day streak
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm font-bold backdrop-blur-sm border border-white/20">
                  {level.emoji} {level.label}
                </span>
              </div>
            </div>
          </div>

          {/* XP Bar */}
          <div className="relative mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white/80">{child.xp} XP</span>
              <span className="text-xs font-bold text-white/80">Next: {nextLevel.label} {nextLevel.emoji} ({nextLevel.max} XP)</span>
            </div>
            <div className="h-3 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-all duration-700 shadow-sm"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── PENDING BANNER ── */}
        {child.status === "pending" && <PendingBanner childId={childId} />}

        {/* ── TABS ── */}
        <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
          {([
            { key: "home",    label: "Home",    icon: "🏠" },
            { key: "courses", label: "Courses", icon: "📚" },
            { key: "badges",  label: "Badges",  icon: "🏅" },
            { key: "friends", label: "Friends", icon: "👯" },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 rounded-xl py-2 text-sm font-bold transition-all ${
                activeTab === key
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="mr-1">{icon}</span>{label}
            </button>
          ))}
        </div>

        {/* ── HOME TAB ── */}
        {activeTab === "home" && (
          <div className="space-y-4">
            {/* Quick links */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { href: "/explore", icon: "⚡", label: "Daily Challenge", color: "from-amber-50 to-orange-50 border-amber-100 hover:border-amber-300" },
                { href: "/courses", icon: "📚", label: "Courses",         color: "from-emerald-50 to-teal-50 border-emerald-100 hover:border-emerald-300" },
                { href: "/careers", icon: "🚀", label: "Careers",         color: "from-sky-50 to-indigo-50 border-sky-100 hover:border-sky-300" },
              ].map(({ href, icon, label, color }) => (
                <a key={href} href={href}
                  className={`flex flex-col items-center gap-2 rounded-2xl border bg-gradient-to-br p-4 text-center transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 ${color}`}>
                  <span className="text-3xl">{icon}</span>
                  <span className="text-xs font-bold text-slate-700">{label}</span>
                </a>
              ))}
            </div>

            {/* Recent courses preview */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-slate-900">📚 My Courses</h2>
                <button onClick={() => setActiveTab("courses")} className="text-xs font-bold text-emerald-600 hover:text-emerald-800">See all →</button>
              </div>
              {enrollments.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-2">📖</div>
                  <p className="text-sm font-semibold text-slate-400">No courses started yet!</p>
                  <a href="/courses" className="mt-2 inline-block rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition">Browse courses →</a>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrollments.slice(0, 3).map((e) => (
                    <div key={e.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-xl shadow-sm">
                        {e.courses.emoji ?? "📚"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">{e.courses.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${e.progress_pct}%` }} />
                          </div>
                          <span className="text-xs font-black text-emerald-600 shrink-0">{e.progress_pct}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent badges preview */}
            {badges.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-bold text-slate-900">🏅 Recent Badges</h2>
                  <button onClick={() => setActiveTab("badges")} className="text-xs font-bold text-emerald-600 hover:text-emerald-800">See all →</button>
                </div>
                <div className="flex gap-3">
                  {badges.slice(0, 5).map((b) => (
                    <div key={b.id} className="flex flex-col items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 p-3 w-16">
                      <span className="text-2xl">{b.icon}</span>
                      <span className="text-xs font-bold text-slate-600 text-center leading-tight">{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── COURSES TAB ── */}
        {activeTab === "courses" && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold text-slate-900 mb-4">📚 All My Courses</h2>
            {enrollments.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-5xl mb-3">📖</div>
                <p className="text-sm font-semibold text-slate-400">You haven't started any courses yet!</p>
                <a href="/courses" className="mt-3 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition">Browse Courses →</a>
              </div>
            ) : (
              <div className="space-y-3">
                {enrollments.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-2xl shadow-sm">
                      {e.courses.emoji ?? "📚"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 truncate">{e.courses.title}</div>
                      <div className="text-xs font-semibold text-slate-400 capitalize mt-0.5">{e.courses.category} · {e.courses.level}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${e.progress_pct}%` }} />
                        </div>
                        <span className="text-sm font-black text-emerald-600 shrink-0">{e.progress_pct}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BADGES TAB ── */}
        {activeTab === "badges" && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold text-slate-900 mb-4">🏅 My Badges</h2>
            {badges.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-5xl mb-3">🎯</div>
                <p className="text-sm font-semibold text-slate-400">No badges yet — keep learning!</p>
                <p className="text-xs font-semibold text-slate-400 mt-1">Complete challenges and finish courses to earn them.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {badges.map((b) => (
                  <div key={b.id} className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 text-center shadow-sm hover:shadow-md transition">
                    <span className="text-4xl">{b.icon}</span>
                    <span className="text-xs font-bold text-slate-700 leading-tight">{b.name}</span>
                    {b.description && <span className="text-xs text-slate-400 leading-tight">{b.description}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── FRIENDS TAB ── */}
        {activeTab === "friends" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="font-display text-lg font-bold text-slate-900 mb-1">👯 Friends</h2>
              <p className="text-xs font-semibold text-slate-400 mb-5">Add friends and cheer each other on!</p>

              {/* Add friend */}
              <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-4 text-center mb-4">
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-sm font-bold text-emerald-800">Find a friend by username</p>
                <p className="text-xs font-semibold text-emerald-600 mt-0.5 mb-3">Coming soon — friends launching shortly!</p>
                <div className="flex gap-2 max-w-xs mx-auto">
                  <input
                    placeholder="Enter their username…"
                    disabled
                    className="flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-slate-400 outline-none opacity-60"
                  />
                  <button disabled className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white opacity-50">Add</button>
                </div>
              </div>

              {/* Empty friends list */}
              <div className="text-center py-8">
                <div className="text-5xl mb-3">🌱</div>
                <p className="text-sm font-semibold text-slate-400">No friends yet.</p>
                <p className="text-xs font-semibold text-slate-400 mt-1">When you add friends, you'll see their streaks and progress here!</p>
              </div>
            </div>

            {/* Pre-chosen messages preview */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="font-display text-base font-bold text-slate-900 mb-3">💬 Quick Messages</h2>
              <p className="text-xs font-semibold text-slate-400 mb-3">Send a friend one of these encouraging messages!</p>
              <div className="flex flex-wrap gap-2">
                {["🔥 You're on fire!", "⭐ Amazing work!", "💪 Keep going!", "🎉 Congrats!", "🌱 You're growing!", "🏆 You're a legend!"].map((msg) => (
                  <button key={msg} disabled
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-500 opacity-60 cursor-not-allowed">
                    {msg}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold text-emerald-600">🔒 Unlocks when friends are added!</p>
            </div>
          </div>
        )}

      </div>
    </>
  );
}