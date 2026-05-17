"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";
import SetActiveChildOnLoad from "@/components/child/SetActiveChildOnLoad";
import { CommunityPostForm, PostSubmittedBanner } from "@/components/community/CommunityPostForm";

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
  { min: 0,    max: 100,  label: "Seedling", emoji: "🌱", color: "emerald" },
  { min: 100,  max: 300,  label: "Sprout",   emoji: "🌿", color: "green"   },
  { min: 300,  max: 600,  label: "Bloom",    emoji: "🌸", color: "pink"    },
  { min: 600,  max: 1000, label: "Harvest",  emoji: "🌻", color: "amber"   },
  { min: 1000, max: 2000, label: "Grove",    emoji: "🌳", color: "teal"    },
  { min: 2000, max: 5000, label: "Forest",   emoji: "🌲", color: "cyan"    },
  { min: 5000, max: 9999, label: "Legend",   emoji: "🏆", color: "violet"  },
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
          <h2 className="font-display text-xl font-bold text-slate-900">Choose your avatar!</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <div className="grid grid-cols-8 gap-2 max-h-72 overflow-y-auto">
          {AVATARS.map((a) => (
            <button key={a} onClick={() => { onSelect(a); onClose(); }}
              className={`text-2xl rounded-xl p-1.5 transition-all hover:scale-110 ${current === a ? "bg-emerald-100 ring-2 ring-emerald-400 scale-110" : "hover:bg-slate-100"}`}>
              {a}
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs font-semibold text-slate-400">More avatars unlock as you level up! 🔒</p>
      </div>
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────
function ProfileTab({ child, badges }: { child: ChildProfile; badges: Badge[] }) {
  const supabase = supabaseBrowser();
  const [posts, setPosts] = useState<{ id: string; type: string; title: string | null; content: string; created_at: string }[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const level      = getLevel(child.xp);
  const nextLevel  = getNextLevel(child.xp);
  const xpProgress = Math.min(100, Math.round(((child.xp - level.min) / (nextLevel.max - level.min)) * 100));
  const avatar     = child.avatar_url || "🌱";
  const firstName  = (child.display_name || child.username).split(" ")[0];
  const LOCKED_COUNT = 4;

  useEffect(() => {
    supabase
      .from("community_posts")
      .select("id, type, title, content, created_at")
      .eq("child_id", child.id)
      .eq("status", "approved")
      .in("type", ["achievement", "reflection"])
      .order("created_at", { ascending: false })
      .then(({ data }) => { setPosts(data ?? []); setLoadingPosts(false); });
  }, [child.id]);

  const typeLabel = (type: string) =>
    type === "achievement" ? "🏆 Achievement" : "📝 Reflection";

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-emerald-100 bg-emerald-50 text-5xl">
          {avatar}
        </div>
        <h2 className="font-display mt-3 text-xl font-black text-slate-900">{firstName}</h2>
        <div className="mt-1 flex items-center justify-center gap-1.5">
          <span className="text-lg">{level.emoji}</span>
          <span className="text-sm font-bold text-slate-500">{level.label}</span>
        </div>
        <div className="mx-auto mt-4 max-w-xs">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">{child.xp} pts</span>
            <span className="text-xs font-bold text-slate-400">Next: {nextLevel.label} ({nextLevel.max} pts)</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-400 transition-all duration-700" style={{ width: `${xpProgress}%` }} />
          </div>
        </div>
      </div>

      {/* ── Badge shelf ── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="font-display mb-4 text-base font-bold text-slate-900">🏅 Badges Earned</h3>
        {badges.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mb-2 text-4xl">🎯</div>
            <p className="text-sm font-semibold text-slate-400">No badges yet — keep going!</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">Complete challenges and share achievements to earn your first badge.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {badges.map((b) => (
              <div key={b.id} className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-3 text-center shadow-sm">
                <span className="text-3xl">{b.icon}</span>
                <span className="text-xs font-bold leading-tight text-slate-700">{b.name}</span>
              </div>
            ))}
            {Array.from({ length: LOCKED_COUNT }).map((_, i) => (
              <div key={`locked-${i}`} className="relative flex flex-col items-center gap-1.5 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center opacity-40">
                <span className="text-3xl">🏅</span>
                <span className="text-xs font-bold leading-tight text-slate-400">???</span>
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl">
                  <span className="text-base">🔒</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Achievement feed ── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="font-display mb-4 text-base font-bold text-slate-900">✨ Achievements & Reflections</h3>
        {loadingPosts ? (
          <div className="flex justify-center py-8"><div className="text-2xl animate-bounce">🌱</div></div>
        ) : posts.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mb-2 text-4xl">🌱</div>
            <p className="text-sm font-semibold text-slate-400">Nothing shared yet!</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">Share an achievement or reflection from your Home tab — approved posts appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    {typeLabel(post.type)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                {post.title && <p className="mb-1 text-sm font-bold text-slate-800">{post.title}</p>}
                <p className="text-sm font-semibold leading-relaxed text-slate-600">{post.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
// ── Journal Tab ───────────────────────────────────────────────
function JournalTab({ childId }: { childId: string }) {
  const supabase = supabaseBrowser();
  const [entries, setEntries] = useState<{ id: string; prompt: string; response: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("journal_entries")
      .select("id, prompt, response, created_at")
      .eq("child_id", childId)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setEntries(data ?? []); setLoading(false); });
  }, [childId]);

  if (loading) return <div className="flex justify-center py-16"><div className="text-3xl animate-bounce">✏️</div></div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 flex items-center gap-3">
        <span className="text-2xl">🔒</span>
        <p className="text-sm font-bold text-yellow-800">Your journal is private — only you can see these entries.</p>
      </div>
      {entries.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center">
          <div className="text-5xl mb-3">✏️</div>
          <p className="font-bold text-slate-400">No journal entries yet!</p>
          <p className="text-sm font-semibold text-slate-400 mt-1">Complete journal steps in your lessons to see them here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold text-slate-400 mb-2">
                {new Date(entry.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </div>
              {entry.prompt && <p className="text-sm font-black text-slate-700 mb-2">✏️ {entry.prompt}</p>}
              <p className="text-sm font-semibold text-slate-600 leading-relaxed whitespace-pre-wrap">{entry.response}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChildDashboard() {
  const params   = useParams();
  const router   = useRouter();
  const supabase = supabaseBrowser();
  const childId  = params.childId as string;

  const [child, setChild]             = useState<ChildProfile | null>(null);
  const [badges, setBadges]           = useState<Badge[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]     = useState("");
  const [savingName, setSavingName]   = useState(false);
  const [activeTab, setActiveTab]     = useState<"home" | "badges" | "profile" | "friends" | "journal">("home");
  const [showPostForm, setShowPostForm]   = useState(false);
  const [postFormType, setPostFormType]   = useState<"achievement" | "reflection">("achievement");
  const [postSubmitted, setPostSubmitted] = useState(false);

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

  const level      = getLevel(child.xp);
  const nextLevel  = getNextLevel(child.xp);
  const xpProgress = Math.min(100, Math.round(((child.xp - level.min) / (nextLevel.max - level.min)) * 100));
  const avatar     = child.avatar_url || "🌱";

  return (
    <>
      <SetActiveChildOnLoad childId={childId} />
      {showAvatarPicker && (
        <AvatarPicker current={avatar} onSelect={handleAvatarSelect} onClose={() => setShowAvatarPicker(false)} />
      )}
      {showPostForm && !postSubmitted && (
        <CommunityPostForm
          childId={childId}
          initialType={postFormType}
          onClose={() => setShowPostForm(false)}
          onSubmitted={() => setPostSubmitted(true)}
        />
      )}
      {showPostForm && postSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm">
            <PostSubmittedBanner onClose={() => { setShowPostForm(false); setPostSubmitted(false); }} />
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-4 py-6 px-4">

        {/* ── HERO CARD ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 p-6 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-52 w-52 rounded-full bg-white/5" />

          <div className="relative flex items-start gap-4">
            <button onClick={() => setShowAvatarPicker(true)} className="group relative shrink-0" title="Change avatar">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-5xl backdrop-blur-sm border-2 border-white/30 shadow-lg transition group-hover:scale-105 group-hover:bg-white/30">
                {avatar}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs shadow-md">✏️</div>
            </button>

            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                    maxLength={20} autoFocus
                    className="rounded-xl bg-white/20 border border-white/40 px-3 py-1.5 text-lg font-bold text-white placeholder-white/60 outline-none focus:bg-white/30 w-40" />
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

          <div className="relative mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white/80">{child.xp} XP</span>
              <span className="text-xs font-bold text-white/80">Next: {nextLevel.label} {nextLevel.emoji} ({nextLevel.max} XP)</span>
            </div>
            <div className="h-3 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all duration-700 shadow-sm" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>
        </div>

        {/* ── PENDING BANNER ── */}
        {child.status === "pending" && <PendingBanner childId={childId} />}

        {/* ── TABS ── */}
        <div className="grid grid-cols-5 gap-1 rounded-2xl bg-slate-100 p-1">
          {([
            { key: "home",      label: "Home",      icon: "🏠" },
            { key: "badges",    label: "Badges",    icon: "🏅" },
            { key: "profile",   label: "Profile",   icon: "🌟" },
            { key: "friends",   label: "Friends",   icon: "👯" },
            { key: "journal",   label: "Journal",   icon: "✏️" },
          ] as const).map(({ key, label, icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`rounded-xl py-2 text-xs font-bold transition-all ${
                activeTab === key ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              <div>{icon}</div>
              <div>{label}</div>
            </button>
          ))}
        </div>

        {/* ── HOME TAB ── */}
        {activeTab === "home" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { href: "/explore",    icon: "🌎", label: "Explore",          color: "from-emerald-50 to-teal-50 border-emerald-100 hover:border-emerald-300" },
                { href: "/challenges", icon: "⚡", label: "Daily Challenges", color: "from-violet-50 to-indigo-50 border-violet-100 hover:border-violet-300" },
                { href: "/careers",    icon: "🚀", label: "Futures",          color: "from-sky-50 to-indigo-50 border-sky-100 hover:border-sky-300"           },
              ].map(({ href, icon, label, color }) => (
                <a key={href} href={href}
                  className={`flex flex-col items-center gap-2 rounded-2xl border bg-gradient-to-br p-4 text-center transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 ${color}`}>
                  <span className="text-3xl">{icon}</span>
                  <span className="text-xs font-bold text-slate-700">{label}</span>
                </a>
              ))}
            </div>

            {/* ── SHARE BUTTONS ── */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setPostFormType("achievement"); setPostSubmitted(false); setShowPostForm(true); }}
                className="flex items-center gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-400 hover:bg-amber-100 hover:shadow-md">
                <span className="text-2xl shrink-0">🏆</span>
                <div>
                  <div className="text-sm font-bold text-amber-900">Share an Achievement</div>
                  <div className="text-xs font-semibold text-amber-700">Something you accomplished!</div>
                </div>
              </button>
              <button
                onClick={() => { setPostFormType("reflection"); setPostSubmitted(false); setShowPostForm(true); }}
                className="flex items-center gap-3 rounded-2xl border-2 border-violet-200 bg-violet-50 p-4 text-left transition hover:border-violet-400 hover:bg-violet-100 hover:shadow-md">
                <span className="text-2xl shrink-0">📝</span>
                <div>
                  <div className="text-sm font-bold text-violet-900">Write a Reflection</div>
                  <div className="text-xs font-semibold text-violet-700">A book or resource you finished!</div>
                </div>
              </button>
            </div>

            {/* My Progress home card */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-bold text-slate-900">🌟 My Progress</h2>
                <button onClick={() => setActiveTab("profile")} className="text-xs font-bold text-emerald-600 hover:text-emerald-800">View profile →</button>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{level.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-800">{level.label}</span>
                    <span className="text-xs font-bold text-slate-400">{child.xp} pts</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-400 transition-all duration-700" style={{ width: `${xpProgress}%` }} />
                  </div>
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-400">Next level: <span className="font-bold text-slate-600">{nextLevel.label} {nextLevel.emoji}</span> at {nextLevel.max} pts</p>
            </div>

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

        {/* ── JOURNAL TAB ── */}
        {activeTab === "journal" && (
          <JournalTab childId={child.id} />
        )}

        {/* ── BADGES TAB ── */}
        {activeTab === "badges" && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold text-slate-900 mb-4">🏅 My Badges</h2>
            {badges.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-5xl mb-3">🎯</div>
                <p className="text-sm font-semibold text-slate-400">No badges yet — keep learning!</p>
                <p className="text-xs font-semibold text-slate-400 mt-1">Complete challenges and share achievements to earn them.</p>
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

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (
          <ProfileTab child={child} badges={badges} />
        )}

        {/* ── FRIENDS TAB ── */}
        {activeTab === "friends" && (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm text-center">
            <div className="text-6xl mb-4">👯</div>
            <h2 className="font-display text-xl font-black text-slate-900 mb-2">Friends — coming soon!</h2>
            <p className="text-sm font-semibold text-slate-500 max-w-xs mx-auto leading-relaxed">
              Soon you'll be able to cheer on friends, share streaks, and send encouraging messages. Stay tuned!
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["🔥 You're on fire!", "⭐ Amazing work!", "💪 Keep going!", "🎉 Congrats!"].map((msg) => (
                <span key={msg} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-400">{msg}</span>
              ))}
            </div>
            <p className="mt-4 text-xs font-semibold text-emerald-600">🌱 This feature is growing!</p>
          </div>
        )}

      </div>
    </>
  );
}