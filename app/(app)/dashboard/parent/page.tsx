"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";
import { formatCode, cleanCode, generateCode } from "@/app/lib/linkCodes";
import ParentPostApprovals from "@/components/community/ParentPostApprovals";

// ── Types ─────────────────────────────────────────────────────
interface ChildProfile {
  id: string;
  username: string;
  status: "active" | "pending";
  avatar_url?: string;
  streak_count?: number;
  xp?: number;
  pending_code?: string;
}

interface ParentRow {
  id: string;
  invite_code: string | null;
  email: string;
}

// ── Sub-components ────────────────────────────────────────────
function InviteCodeCard({ code, onRegenerate, busy }: { code: string; onRegenerate: () => void; busy: boolean }) {
  const [copied, setCopied] = useState(false);
  function copyCode() {
    navigator.clipboard.writeText(formatCode(code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-lime-50 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-emerald-900">Your Invite Code</h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Share this with your child during their signup</p>
        </div>
        <span className="text-2xl">🔗</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-xl border-2 border-dashed border-emerald-300 bg-white px-5 py-3 text-center">
          <span className="font-mono text-2xl font-black tracking-[0.15em] text-emerald-700">{formatCode(code)}</span>
        </div>
        <button onClick={copyCode} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors">
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <button onClick={onRegenerate} disabled={busy} className="mt-3 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
        ↻ Generate new code
      </button>
    </div>
  );
}

function LinkedChildCard({ child }: { child: ChildProfile }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-2xl font-black text-emerald-700 border-2 border-emerald-200">
        {child.avatar_url
          ? <img src={child.avatar_url} alt={child.username} className="h-full w-full rounded-full object-cover" />
          : child.username[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-slate-900 truncate">{child.username}</div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs font-semibold text-emerald-600">🔥 {child.streak_count ?? 0} day streak</span>
          <span className="text-xs font-semibold text-amber-600">⭐ {child.xp ?? 0} XP</span>
        </div>
      </div>
      <a href={`/dashboard/child/${child.id}`} className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
        View →
      </a>
    </div>
  );
}

function PendingChildCard({ child, onApprove, busy }: { child: ChildProfile; onApprove: (id: string) => void; busy: boolean }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 p-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-100 text-2xl font-black text-amber-700 border-2 border-amber-200">
        {child.username[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-slate-900 truncate">{child.username}</div>
        <div className="text-xs font-semibold text-amber-600 mt-0.5">⏳ Waiting for your approval</div>
      </div>
      <button onClick={() => onApprove(child.id)} disabled={busy}
        className="shrink-0 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600 transition-colors disabled:opacity-50">
        Approve ✓
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ParentDashboard() {
  const router   = useRouter();
  const supabase = supabaseBrowser();

  const [parent, setParent]               = useState<ParentRow | null>(null);
  const [children, setChildren]           = useState<ChildProfile[]>([]);
  const [loading, setLoading]             = useState(true);
  const [busy, setBusy]                   = useState(false);
  const [msg, setMsg]                     = useState<{ text: string; ok: boolean } | null>(null);
  const [childCode, setChildCode]         = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "posts">("dashboard");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth"); return; }

    const { data: parentRow } = await supabase
      .from("parents").select("id, invite_code, email").eq("user_id", user.id).maybeSingle();
    if (!parentRow) { router.replace("/auth"); return; }
    setParent(parentRow);

    console.log("Parent row id:", parentRow.id);

    const { data: childRows, error: childError } = await supabase
      .from("child_profiles")
      .select("id, username, status, avatar_url, streak_count, xp, pending_code, parent_id")
      .eq("parent_id", parentRow.id)
      .order("id", { ascending: true });

    console.log("Child rows:", childRows, "Error:", childError);

    setChildren((childRows as ChildProfile[]) ?? []);
    setLoading(false);
  }

  async function regenerateInviteCode() {
    if (!parent) return;
    setBusy(true);
    const newCode = generateCode();
    await supabase.from("parents").update({ invite_code: newCode }).eq("id", parent.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("link_codes").insert({
        code: newCode, type: "invite", created_by: user.id, parent_id: parent.id,
      });
    }
    setParent({ ...parent, invite_code: newCode });
    setBusy(false);
  }

  async function approveChild(childId: string) {
    if (!parent) return;
    setBusy(true);
    await supabase.from("child_profiles")
      .update({ status: "active", pending_code: null }).eq("id", childId);
    await loadData();
    setBusy(false);
  }

  async function enterChildCode() {
  if (!parent || !childCode.trim()) return;
  setBusy(true);
  setMsg(null);

  const cleaned = cleanCode(childCode);
  console.log("Looking up code:", cleaned);

  const { data: codeRow, error: codeError } = await supabase
    .from("link_codes")
    .select("id, child_id, expires_at")
    .eq("code", cleaned)
    .eq("type", "pending")
    .is("used_at", null)
    .maybeSingle();

  console.log("Code row:", codeRow, "Error:", codeError);

  if (!codeRow) {
    setMsg({ text: "That code doesn't look right. Ask your child to check their linking code.", ok: false });
    setBusy(false);
    return;
  }

  const { error: updateError } = await supabase
    .from("child_profiles")
    .update({ parent_id: parent.id, status: "active", pending_code: null })
    .eq("id", codeRow.child_id);

  console.log("Update error:", updateError);
  console.log("Updating child_id:", codeRow.child_id, "with parent.id:", parent.id);

  await supabase
    .from("link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", codeRow.id);

  setChildCode("");
  setShowCodeInput(false);
  setMsg({ text: "✅ Child account linked successfully!", ok: true });
  await loadData();
  setBusy(false);
}

  const linkedChildren  = children.filter((c) => c.status === "active");
  const pendingChildren = children.filter((c) => c.status === "pending");

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-bounce">🌱</div>
          <p className="text-sm font-bold text-slate-400">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-emerald-900">Parent Dashboard</h1>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">{parent?.email}</p>
        </div>
        <span className="text-4xl">👨‍👩‍👧</span>
      </div>

{/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
        <button onClick={() => setActiveTab("dashboard")}
          className={`flex-1 rounded-xl py-2 text-sm font-bold transition-all ${activeTab === "dashboard" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          🏠 Dashboard
        </button>
        <button onClick={() => setActiveTab("posts")}
          className={`flex-1 rounded-xl py-2 text-sm font-bold transition-all ${activeTab === "posts" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          📝 Post Approvals
        </button>
      </div>

      {activeTab === "posts" && <ParentPostApprovals />}

      {activeTab === "dashboard" && <>

      {msg && (
        <div className={`rounded-2xl border p-4 text-sm font-semibold ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {msg.text}
        </div>
      )}

      {parent?.invite_code && (
        <InviteCodeCard code={parent.invite_code} onRegenerate={regenerateInviteCode} busy={busy} />
      )}

      {/* Enter child's linking code */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-lg font-bold text-slate-900">Link a Child Account</h2>
          <span className="text-xl">🔗</span>
        </div>
        <p className="text-xs font-semibold text-slate-500 mb-4">
          If your child signed up without your invite code, enter their 6-character linking code here.
        </p>
        {!showCodeInput ? (
          <button onClick={() => setShowCodeInput(true)}
            className="rounded-xl border-2 border-dashed border-slate-200 w-full py-3 text-sm font-bold text-slate-500 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all">
            + Enter a child's linking code
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              value={childCode}
              onChange={(e) => setChildCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && enterChildCode()}
              placeholder="e.g. ABC-123" maxLength={7}
              className="flex-1 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-base font-mono tracking-widest outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition"
            />
            <button onClick={enterChildCode} disabled={busy || !childCode.trim()}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              Link ✓
            </button>
            <button onClick={() => { setShowCodeInput(false); setChildCode(""); }}
              className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Pending children */}
      {pendingChildren.length > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-amber-800 mb-4">⏳ Waiting for Approval ({pendingChildren.length})</h2>
          <div className="space-y-3">
            {pendingChildren.map((child) => (
              <PendingChildCard key={child.id} child={child} onApprove={approveChild} busy={busy} />
            ))}
          </div>
        </div>
      )}

      {/* Linked children */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-slate-900">Your Children ({linkedChildren.length})</h2>
          <span className="text-xl">🌱</span>
        </div>
        {linkedChildren.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">👧👦</div>
            <p className="text-sm font-semibold text-slate-400">No children linked yet.</p>
            <p className="text-xs font-semibold text-slate-400 mt-1">Share your invite code above, or enter your child's linking code.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {linkedChildren.map((child) => (
              <LinkedChildCard key={child.id} child={child} />
            ))}
          </div>
        )}
      </div>

      {/* Subscription */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-slate-900">Subscription</h2>
          <span className="text-xl">💳</span>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">🌿</div>
          <div className="flex-1">
            <div className="font-bold text-slate-900">Free Plan</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">1 child · Basic courses · Daily challenges</div>
          </div>
          <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors">Upgrade</button>
        </div>
      </div>

      <button
        onClick={async () => { await supabase.auth.signOut(); router.replace("/auth"); }}
        className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
      >
        Sign Out
      </button>

      </>}
    </div>
  );
}