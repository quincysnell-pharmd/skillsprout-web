"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";
import { formatCode, cleanCode, generateCode } from "@/app/lib/linkCodes";
import ParentPostApprovals from "@/components/community/ParentPostApprovals";

// ── Types ─────────────────────────────────────────────────────
interface ChildProfile {
  id: string; username: string; status: "active" | "pending";
  avatar_url?: string; streak_count?: number; xp?: number; pending_code?: string;
}
interface ParentRow { id: string; invite_code: string | null; email: string; }
interface Course {
  id: string; title: string; emoji?: string; level: string;
  price_cents: number; stripe_price_id: string | null; is_published: boolean;
}
interface Enrollment { child_id: string; course_id: string; paid: boolean; progress_pct: number; }
interface CourseRequest { id: string; child_id: string; course_id: string; status: string; }

// ── InviteCodeCard ────────────────────────────────────────────
function InviteCodeCard({ code, onRegenerate, busy }: { code: string; onRegenerate: () => void; busy: boolean }) {
  const [copied, setCopied] = useState(false);
  function copyCode() { navigator.clipboard.writeText(formatCode(code)); setCopied(true); setTimeout(() => setCopied(false), 2000); }
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
      <button onClick={onRegenerate} disabled={busy} className="mt-3 text-xs font-semibold text-slate-400 hover:text-slate-600 disabled:opacity-50">
        ↻ Generate new code
      </button>
    </div>
  );
}

// ── LinkedChildCard ───────────────────────────────────────────
function LinkedChildCard({ child }: { child: ChildProfile }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-2xl font-black text-emerald-700 border-2 border-emerald-200">
        {child.avatar_url ? <img src={child.avatar_url} alt={child.username} className="h-full w-full rounded-full object-cover" /> : child.username[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-slate-900 truncate">{child.username}</div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs font-semibold text-emerald-600">🔥 {child.streak_count ?? 0} day streak</span>
          <span className="text-xs font-semibold text-amber-600">⭐ {child.xp ?? 0} XP</span>
        </div>
      </div>
      <a href={`/dashboard/child/${child.id}`} className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">View →</a>
    </div>
  );
}

// ── PendingChildCard ──────────────────────────────────────────
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

// ── CoursesTab ────────────────────────────────────────────────
function CoursesTab({ children, courses, enrollments, requests, parentId, onRefresh }: {
  children: ChildProfile[]; courses: Course[]; enrollments: Enrollment[];
  requests: CourseRequest[]; parentId: string; onRefresh: () => void;
}) {
  const supabase = supabaseBrowser();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const linkedChildren = children.filter(c => c.status === "active");
  const totalPending   = requests.filter(r => r.status === "pending").length;

  function getEnrollment(childId: string, courseId: string) {
    return enrollments.find(e => e.child_id === childId && e.course_id === courseId);
  }
  function getRequest(childId: string, courseId: string) {
    return requests.find(r => r.child_id === childId && r.course_id === courseId && r.status === "pending");
  }

  async function handleUnlock(courseId: string, childId: string, requestId?: string) {
    const key = `${courseId}:${childId}`;
    setPurchasing(key); setErr(null);
    if (requestId) {
      await supabase.from("course_requests").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", requestId);
    }
    try {
      const res  = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, childId, parentId }) });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else if (data.error === "Already enrolled") { onRefresh(); }
      else { setErr("Something went wrong. Please try again."); }
    } catch { setErr("Network error. Please try again."); }
    finally { setPurchasing(null); }
  }

  async function handleDismiss(requestId: string) {
    setDismissing(requestId);
    await supabase.from("course_requests").update({ status: "dismissed", updated_at: new Date().toISOString() }).eq("id", requestId);
    onRefresh();
    setDismissing(null);
  }

  if (linkedChildren.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center space-y-3">
        <div className="text-4xl">👶</div>
        <p className="font-bold text-slate-500">Link a child account first to manage their courses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {err && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{err}</div>}

      {totalPending > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">🔔</span>
          <p className="text-sm font-bold text-amber-800">{totalPending} course request{totalPending > 1 ? "s" : ""} waiting for your approval!</p>
        </div>
      )}

      {linkedChildren.map(child => {
        const childRequests = requests.filter(r => r.child_id === child.id && r.status === "pending");
        return (
          <div key={child.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-xl shadow-sm">
                {child.avatar_url ? <img src={child.avatar_url} className="h-full w-full rounded-xl object-cover" /> : child.username[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-display font-bold text-slate-900">{child.username}</div>
                <div className="text-xs font-semibold text-slate-400">⭐ {child.xp ?? 0} XP</div>
              </div>
              {childRequests.length > 0 && (
                <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-black text-white">
                  🔔 {childRequests.length} request{childRequests.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {courses.map(course => {
                const enrollment = getEnrollment(child.id, course.id);
                const isPaid     = enrollment?.paid === true;
                const progress   = enrollment?.progress_pct ?? 0;
                const isLoading  = purchasing === `${course.id}:${child.id}`;
                const request    = getRequest(child.id, course.id);
                const price      = ((course.price_cents ?? 999) / 100).toFixed(2);
                return (
                  <div key={course.id} className={`px-5 py-4 ${request ? "bg-amber-50" : ""}`}>
                    <div className="flex items-center gap-4">
                      <div className="text-2xl w-8 text-center shrink-0">{course.emoji ?? "📚"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm">{course.title}</span>
                          {request && <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-black text-amber-800">🙋 Requested</span>}
                        </div>
                        <div className="text-xs font-semibold text-slate-400 capitalize">{course.level} level</div>
                        {isPaid && progress > 0 && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs font-black text-emerald-600">{progress}%</span>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700">✅ Purchased</span>
                        ) : (
                          <button onClick={() => handleUnlock(course.id, child.id, request?.id)} disabled={isLoading}
                            className={`rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-60 transition ${request ? "bg-emerald-600 hover:bg-emerald-700" : "bg-violet-600 hover:bg-violet-700"}`}>
                            {isLoading ? "Loading…" : request ? `✅ Approve $${price}` : `🔓 Unlock $${price}`}
                          </button>
                        )}
                        {request && !isPaid && (
                          <button onClick={() => handleDismiss(request.id)} disabled={dismissing === request.id}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition">
                            {dismissing === request.id ? "…" : "Dismiss"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {courses.length === 0 && <div className="px-5 py-8 text-center text-sm font-semibold text-slate-400">No published courses yet.</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
function ParentDashboardInner() {
  const router       = useRouter();
  const supabase     = supabaseBrowser();

  const [parent, setParent]               = useState<ParentRow | null>(null);
  const [children, setChildren]           = useState<ChildProfile[]>([]);
  const [courses, setCourses]             = useState<Course[]>([]);
  const [enrollments, setEnrollments]     = useState<Enrollment[]>([]);
  const [requests, setRequests]           = useState<CourseRequest[]>([]);
  const [loading, setLoading]             = useState(true);
  const [busy, setBusy]                   = useState(false);
  const [msg, setMsg]                     = useState<{ text: string; ok: boolean } | null>(null);
  const [childCode, setChildCode]         = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [activeTab, setActiveTab]         = useState<"dashboard" | "courses" | "posts">("dashboard");

  const pendingRequestCount = requests.filter(r => r.status === "pending").length;

  useEffect(() => {
    const params   = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const payment  = params.get("payment");
    const courseId = params.get("course");
    const childId  = params.get("child");
    if (payment === "success" && courseId && childId) {
      // Manually mark enrollment as paid in case webhook was slow
      const supabaseAdmin = supabaseBrowser();
      supabaseAdmin.from("enrollments").upsert(
        { child_id: childId, course_id: courseId, paid: true, progress_pct: 0, updated_at: new Date().toISOString(), enrolled_at: new Date().toISOString() },
        { onConflict: "child_id,course_id" }
      ).then(() => {
        setMsg({ text: "🎉 Course unlocked! Your child can now start learning.", ok: true });
        setActiveTab("courses");
        router.replace("/dashboard/parent");
        loadData();
      });
    } else if (payment === "cancelled") {
      setMsg({ text: "Payment was cancelled. No charge was made.", ok: false });
      router.replace("/dashboard/parent");
      loadData();
    } else {
      loadData();
    }
  }, []);

  async function loadData() {
    setLoading(true);
    // Use getSession first (faster after redirects), fall back to getUser
    let user = null;
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      user = sessionData.session.user;
    } else {
      // Retry with getUser up to 5 times
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase.auth.getUser();
        if (data.user) { user = data.user; break; }
        await new Promise(r => setTimeout(r, 800));
      }
    }
    if (!user) { router.replace("/auth"); return; }

    const { data: parentRow } = await supabase.from("parents").select("id, invite_code, email").eq("user_id", user.id).maybeSingle();
    if (!parentRow) { router.replace("/auth"); return; }
    setParent(parentRow);

    const { data: childRows } = await supabase.from("child_profiles")
      .select("id, username, status, avatar_url, streak_count, xp, pending_code, parent_id")
      .eq("parent_id", parentRow.id).order("id", { ascending: true });

    const childList = (childRows as ChildProfile[]) ?? [];
    setChildren(childList);

    const { data: courseData } = await supabase.from("courses")
      .select("id, title, emoji, level, price_cents, stripe_price_id, is_published")
      .eq("is_published", true).order("created_at", { ascending: true });
    setCourses((courseData as Course[]) ?? []);

    if (childList.length > 0) {
      const childIds = childList.map(c => c.id);
      const [{ data: enrollData }, { data: requestData }] = await Promise.all([
        supabase.from("enrollments").select("child_id, course_id, paid, progress_pct").in("child_id", childIds),
        supabase.from("course_requests").select("id, child_id, course_id, status").in("child_id", childIds).eq("status", "pending"),
      ]);
      setEnrollments((enrollData as Enrollment[]) ?? []);
      setRequests((requestData as CourseRequest[]) ?? []);
    }

    setLoading(false);
  }

  async function regenerateInviteCode() {
    if (!parent) return;
    setBusy(true);
    const newCode = generateCode();
    await supabase.from("parents").update({ invite_code: newCode }).eq("id", parent.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("link_codes").insert({ code: newCode, type: "invite", created_by: user.id, parent_id: parent.id });
    setParent({ ...parent, invite_code: newCode });
    setBusy(false);
  }

  async function approveChild(childId: string) {
    if (!parent) return;
    setBusy(true);
    await supabase.from("child_profiles").update({ status: "active", pending_code: null }).eq("id", childId);
    await loadData();
    setBusy(false);
  }

  async function enterChildCode() {
    if (!parent || !childCode.trim()) return;
    setBusy(true); setMsg(null);
    const cleaned = cleanCode(childCode);
    const { data: codeRow } = await supabase.from("link_codes").select("id, child_id, expires_at")
      .eq("code", cleaned).eq("type", "pending").is("used_at", null).maybeSingle();
    if (!codeRow) { setMsg({ text: "That code doesn't look right. Ask your child to check their linking code.", ok: false }); setBusy(false); return; }
    await supabase.from("child_profiles").update({ parent_id: parent.id, status: "active", pending_code: null }).eq("id", codeRow.child_id);
    await supabase.from("link_codes").update({ used_at: new Date().toISOString() }).eq("id", codeRow.id);
    setChildCode(""); setShowCodeInput(false);
    setMsg({ text: "✅ Child account linked successfully!", ok: true });
    await loadData();
    setBusy(false);
  }

  const linkedChildren  = children.filter(c => c.status === "active");
  const pendingChildren = children.filter(c => c.status === "pending");

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-3"><div className="text-4xl animate-bounce">🌱</div><p className="text-sm font-bold text-slate-400">Loading your dashboard…</p></div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-emerald-900">Parent Dashboard</h1>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">{parent?.email}</p>
        </div>
        <span className="text-4xl">👨‍👩‍👧</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
        {([
          { key: "dashboard", label: "🏠 Dashboard" },
          { key: "courses",   label: pendingRequestCount > 0 ? `📚 Courses 🔔${pendingRequestCount}` : "📚 Courses" },
          { key: "posts",     label: "📝 Post Approvals" },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-xl py-2 text-sm font-bold transition-all ${
              activeTab === tab.key
                ? tab.key === "dashboard" ? "bg-white text-emerald-700 shadow-sm" : "bg-white text-violet-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`rounded-2xl border p-4 text-sm font-semibold flex items-center justify-between gap-4 ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="shrink-0 font-black opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {activeTab === "posts" && <ParentPostApprovals />}

      {activeTab === "courses" && parent && (
        <CoursesTab
          children={children} courses={courses} enrollments={enrollments}
          requests={requests} parentId={parent.id}
          onRefresh={() => { loadData(); setMsg({ text: "✅ Done!", ok: true }); }}
        />
      )}

      {activeTab === "dashboard" && (
        <>
          {parent?.invite_code && <InviteCodeCard code={parent.invite_code} onRegenerate={regenerateInviteCode} busy={busy} />}

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display text-lg font-bold text-slate-900">Link a Child Account</h2>
              <span className="text-xl">🔗</span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mb-4">If your child signed up without your invite code, enter their 6-character linking code here.</p>
            {!showCodeInput ? (
              <button onClick={() => setShowCodeInput(true)} className="rounded-xl border-2 border-dashed border-slate-200 w-full py-3 text-sm font-bold text-slate-500 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all">
                + Enter a child's linking code
              </button>
            ) : (
              <div className="flex gap-2">
                <input value={childCode} onChange={(e) => setChildCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && enterChildCode()}
                  placeholder="e.g. ABC-123" maxLength={7}
                  className="flex-1 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-base font-mono tracking-widest outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition" />
                <button onClick={enterChildCode} disabled={busy || !childCode.trim()} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">Link ✓</button>
                <button onClick={() => { setShowCodeInput(false); setChildCode(""); }} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors">✕</button>
              </div>
            )}
          </div>

          {pendingChildren.length > 0 && (
            <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-amber-800 mb-4">⏳ Waiting for Approval ({pendingChildren.length})</h2>
              <div className="space-y-3">{pendingChildren.map(child => <PendingChildCard key={child.id} child={child} onApprove={approveChild} busy={busy} />)}</div>
            </div>
          )}

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
              <div className="space-y-3">{linkedChildren.map(child => <LinkedChildCard key={child.id} child={child} />)}</div>
            )}
          </div>

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

          <button onClick={async () => { await supabase.auth.signOut(); router.replace("/auth"); }}
            className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors">
            Sign Out
          </button>
        </>
      )}
    </div>
  );
}

export default function ParentDashboard() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="text-4xl animate-bounce">🌱</div></div>}>
      <ParentDashboardInner />
    </Suspense>
  );
}