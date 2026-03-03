"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "../lib/supabase/client";
import { generateCode, formatCode, cleanCode } from "@/app/lib/linkCodes";

type Mode = "signup" | "login";
type Step = "choose" | "parent-form" | "kid-signup" | "kid-login" | "kid-pending";

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-2 rounded-full transition-all duration-300 ${
          i < current ? "w-6 bg-emerald-500" : i === current ? "w-6 bg-emerald-300" : "w-2 bg-slate-200"
        }`} />
      ))}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors">
      ← Back
    </button>
  );
}

function AuthPageInner() {
  const router   = useRouter();
  const params   = useSearchParams();
  const nextPath = params.get("next") || "/dashboard/parent";
  const supabase = supabaseBrowser();

  const [step, setStep] = useState<Step>("choose");
  const [mode, setMode] = useState<Mode>("signup");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState<{ text: string; ok: boolean } | null>(null);

  // Parent form
  const [parentEmail, setParentEmail]       = useState("");
  const [parentPassword, setParentPassword] = useState("");

  // Kid signup
  const [kidUsername, setKidUsername]     = useState("");
  const [kidPin, setKidPin]               = useState("");
  const [kidPinConfirm, setKidPinConfirm] = useState("");
  const [kidEmail, setKidEmail]           = useState("");
  const [inviteCode, setInviteCode]       = useState("");
  const [hasInviteCode, setHasInviteCode] = useState<boolean | null>(null);

  // Kid login
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPin, setLoginPin]           = useState("");

  // Pending
  const [pendingCode, setPendingCode] = useState("");

  // Secret admin
  const [lockClicks, setLockClicks] = useState(0);
  const showAdminOption = lockClicks >= 5;

  const clearMsg = () => setMsg(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: adminRow } = await supabase.from("admins").select("id").eq("user_id", data.user.id).maybeSingle();
      if (adminRow) { router.replace("/admin"); return; }
      const { data: childRow } = await supabase.from("child_profiles").select("id").eq("user_id", data.user.id).maybeSingle();
      if (childRow) { router.replace(`/dashboard/child/${childRow.id}`); return; }
      router.replace("/dashboard/parent");
    });
  }, []);

  async function handleParentSubmit() {
    clearMsg();
    if (!parentEmail.trim() || !parentPassword.trim()) {
      setMsg({ text: "Please enter your email and password.", ok: false }); return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: parentEmail, password: parentPassword });
        if (error) throw error;
        if (!data.user) { setMsg({ text: "Check your email to confirm your account!", ok: true }); return; }
        const code = generateCode();
        const { data: existing } = await supabase.from("parents").select("id").eq("user_id", data.user.id).maybeSingle();
        if (!existing) {
          await supabase.from("parents").insert({ user_id: data.user.id, email: data.user.email, invite_code: code });
        }
        const { data: parentRow } = await supabase.from("parents").select("id").eq("user_id", data.user.id).maybeSingle();
        if (parentRow) {
          await supabase.from("link_codes").insert({ code, type: "invite", created_by: data.user.id, parent_id: parentRow.id });
        }
        router.replace("/dashboard/parent");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: parentEmail, password: parentPassword });
        if (error) throw error;
        const { data: adminRow } = await supabase.from("admins").select("id").eq("user_id", data.user.id).maybeSingle();
        if (adminRow) { router.replace("/admin"); return; }
        router.replace("/dashboard/parent");
      }
    } catch (e: unknown) {
      setMsg({ text: (e as { message?: string })?.message || "Something went wrong.", ok: false });
    } finally { setBusy(false); }
  }

  async function handleKidSignup() {
    clearMsg();
    if (!kidUsername.trim()) { setMsg({ text: "Please enter a username.", ok: false }); return; }
    if (!/^\d{4}$/.test(kidPin)) { setMsg({ text: "PIN must be exactly 4 numbers.", ok: false }); return; }
    if (kidPin !== kidPinConfirm) { setMsg({ text: "PINs don't match — try again.", ok: false }); return; }
    if (hasInviteCode === null) { setMsg({ text: "Please choose whether you have an invite code.", ok: false }); return; }
    if (kidEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(kidEmail)) {
      setMsg({ text: "That email doesn't look right — double check it or leave it blank.", ok: false }); return;
    }

    setBusy(true);
    try {
      const fakeEmail = `${kidUsername.toLowerCase().replace(/[^a-z0-9]/g, "")}.${Date.now()}@skillsprout.kids`;
      const { data: existing } = await supabase.from("child_profiles").select("id").eq("username", kidUsername).maybeSingle();
      if (existing) { setMsg({ text: "That username is taken — try a different one!", ok: false }); setBusy(false); return; }

      const { data, error } = await supabase.auth.signUp({ email: fakeEmail, password: `ss-${kidPin}` });
      if (error) throw error;
      if (!data.user) { setMsg({ text: "Something went wrong. Try again!", ok: false }); return; }

      const userId = data.user.id;
      const cleanedInvite = cleanCode(inviteCode);
      let linkedParentId: string | null = null;

      if (cleanedInvite) {
        const { data: codeRow } = await supabase
          .from("link_codes").select("id, parent_id")
          .eq("code", cleanedInvite).eq("type", "invite")
          .is("used_at", null)
          .maybeSingle();
        if (!codeRow) { setMsg({ text: "That invite code doesn't look right. Double-check it or skip for now.", ok: false }); setBusy(false); return; }
        linkedParentId = codeRow.parent_id;
      }

      const pendingChildCode = generateCode();
      const { data: childRow, error: childError } = await supabase
       .from("child_profiles")
       .insert({
         user_id: userId,
         username: kidUsername,
         display_name: kidUsername,
         email: kidEmail.trim() || null,
         auth_email: fakeEmail,
         status: linkedParentId ? "active" : "pending",
         parent_id: linkedParentId ?? null,
         pending_code: linkedParentId ? null : pendingChildCode,
      })
      .select("id").single();
      if (childError) throw childError;

      if (linkedParentId && cleanedInvite) {
        await supabase.from("link_codes").update({ used_at: new Date().toISOString() }).eq("code", cleanedInvite);
      }

      if (!linkedParentId && childRow) {
        await supabase.from("link_codes").insert({
          code: pendingChildCode,
          type: "pending",
          created_by: userId,
          child_id: childRow.id,
          // No expires_at — parent can link anytime
        });
        setPendingCode(pendingChildCode);
        setStep("kid-pending");
        return;
      }

      if (childRow) router.replace(`/dashboard/child/${childRow.id}`);
    } catch (e: unknown) {
      setMsg({ text: (e as { message?: string })?.message || "Something went wrong.", ok: false });
    } finally { setBusy(false); }
  }

  async function handleKidLogin() {
    clearMsg();
    if (!loginUsername.trim()) { setMsg({ text: "Please enter your username.", ok: false }); return; }
    if (!/^\d{4}$/.test(loginPin)) { setMsg({ text: "PIN must be 4 numbers.", ok: false }); return; }
    setBusy(true);
    try {
      // Try matching by username to get the fake email
      const { data: childRow } = await supabase
        .from("child_profiles").select("user_id, id, auth_email").eq("username", loginUsername).maybeSingle();

      if (!childRow?.user_id) {
        setMsg({ text: "Username not found — check your spelling!", ok: false }); return;
      }

      // Get the stored auth email directly from child_profiles
      const fakeEmail = childRow.auth_email ??
        `${loginUsername.toLowerCase().replace(/[^a-z0-9]/g, "")}@skillsprout.kids`;

      const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password: `ss-${loginPin}` });
      if (error) {
        setMsg({ text: "Username or PIN is wrong — try again!", ok: false }); return;
      }
      router.replace(`/dashboard/child/${childRow.id}`);
    } catch (e: unknown) {
      setMsg({ text: (e as { message?: string })?.message || "Something went wrong.", ok: false });
    } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-[80vh] items-start justify-center pt-8 px-4">
      <div className="w-full max-w-md space-y-5">

        {/* STEP 1: Choose */}
        {step === "choose" && (
          <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
            <StepDots current={0} total={2} />
            <h1 className="font-display text-3xl font-bold text-emerald-900 text-center mb-2">Welcome to SkillSprout 🌱</h1>
            <p className="text-sm font-semibold text-slate-500 text-center mb-8">Who are you?</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button onClick={() => { setStep("parent-form"); setMode("signup"); clearMsg(); }}
                className="flex flex-col items-center rounded-2xl border-2 border-slate-200 bg-white p-6 hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
                <span className="text-5xl mb-3 group-hover:scale-110 transition-transform">👨‍👩‍👧</span>
                <span className="font-display text-lg font-bold text-emerald-900">Parent</span>
                <span className="mt-1 text-xs font-semibold text-slate-400 text-center">Manage & keep kids safe</span>
              </button>
              <button onClick={() => { setStep("kid-signup"); clearMsg(); }}
                className="flex flex-col items-center rounded-2xl border-2 border-slate-200 bg-white p-6 hover:border-lime-400 hover:bg-lime-50 transition-all group">
                <span className="text-5xl mb-3 group-hover:scale-110 transition-transform">🧒</span>
                <span className="font-display text-lg font-bold text-emerald-900">Kid</span>
                <span className="mt-1 text-xs font-semibold text-slate-400 text-center">I'm here to learn!</span>
              </button>
            </div>
            <div className="text-center mb-2">
              <button onClick={() => setLockClicks((n) => n + 1)} className="text-slate-200 hover:text-slate-300 text-xs">🔒</button>
            </div>
            {showAdminOption && (
              <button onClick={() => { setStep("parent-form"); setMode("login"); clearMsg(); }}
                className="mb-3 w-full rounded-2xl border-2 border-violet-200 bg-violet-50 py-3 text-sm font-bold text-violet-700 hover:bg-violet-100 transition">
                ⚙️ Admin Login
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setMode("login"); setStep("parent-form"); clearMsg(); }}
                className="rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
                Parent sign in →
              </button>
              <button onClick={() => { setStep("kid-login"); clearMsg(); }}
                className="rounded-2xl border border-lime-200 bg-lime-50 py-3 text-sm font-bold text-lime-700 hover:bg-lime-100 transition">
                Kid sign in →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2a: Parent form */}
        {step === "parent-form" && (
          <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
            <BackButton onClick={() => { setStep("choose"); clearMsg(); }} />
            <StepDots current={1} total={2} />
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 mb-3">👨‍👩‍👧 Parent account</span>
            <h1 className="font-display text-3xl font-bold text-emerald-900 mb-1">{mode === "signup" ? "Create your account" : "Welcome back!"}</h1>
            <p className="text-sm font-semibold text-slate-500 mb-6">{mode === "signup" ? "You control privacy, approvals, and your child's progress." : "Sign in to your parent dashboard."}</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700">Email</label>
                <input value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleParentSubmit()}
                  placeholder="you@email.com" type="email"
                  className="mt-1.5 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">Password</label>
                <input value={parentPassword} onChange={(e) => setParentPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleParentSubmit()}
                  placeholder="••••••••" type="password"
                  className="mt-1.5 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition" />
              </div>
              {msg && <div className={`rounded-2xl border p-4 text-sm font-semibold ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{msg.text}</div>}
              <button onClick={handleParentSubmit} disabled={busy} className="w-full rounded-2xl bg-emerald-600 py-3.5 text-base font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 transition">
                {busy ? "Working…" : mode === "signup" ? "Create Account 🌱" : "Sign In →"}
              </button>
              <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); clearMsg(); }}
                className="w-full rounded-2xl border border-emerald-200 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-emerald-50 transition">
                {mode === "signup" ? "Already have an account? Sign in →" : "Need an account? Create one →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2b: Kid signup */}
        {step === "kid-signup" && (
          <div className="rounded-3xl border border-lime-100 bg-white p-8 shadow-sm">
            <BackButton onClick={() => { setStep("choose"); clearMsg(); }} />
            <StepDots current={1} total={2} />
            <span className="inline-flex items-center rounded-full border border-lime-300 bg-lime-50 px-3 py-1 text-xs font-bold text-lime-800 mb-3">🧒 New kid account</span>
            <h1 className="font-display text-3xl font-bold text-emerald-900 mb-1">Let's get growing! 🌱</h1>
            <p className="text-sm font-semibold text-slate-500 mb-6">Pick a fun username and a 4-digit PIN you'll remember.</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700">Username</label>
                <input value={kidUsername} onChange={(e) => setKidUsername(e.target.value)} placeholder="e.g. SuperSprout42" maxLength={20}
                  className="mt-1.5 w-full rounded-2xl border border-lime-200 bg-white px-4 py-3 text-base outline-none focus:border-lime-400 focus:ring-4 focus:ring-lime-100 transition" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">4-Digit PIN</label>
                <input value={kidPin} onChange={(e) => setKidPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="e.g. 1234" type="password" inputMode="numeric" maxLength={4}
                  className="mt-1.5 w-full rounded-2xl border border-lime-200 bg-white px-4 py-3 text-base font-mono tracking-[0.5em] outline-none focus:border-lime-400 focus:ring-4 focus:ring-lime-100 transition" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">Confirm PIN</label>
                <input value={kidPinConfirm} onChange={(e) => setKidPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="Same PIN again" type="password" inputMode="numeric" maxLength={4}
                  className="mt-1.5 w-full rounded-2xl border border-lime-200 bg-white px-4 py-3 text-base font-mono tracking-[0.5em] outline-none focus:border-lime-400 focus:ring-4 focus:ring-lime-100 transition" />
              </div>

              {/* Optional email */}
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span>📧</span>
                  <label className="text-sm font-bold text-sky-800">Email (optional)</label>
                  <span className="rounded-full bg-sky-100 border border-sky-200 px-2 py-0.5 text-xs font-bold text-sky-600">Optional</span>
                </div>
                <p className="text-xs font-semibold text-sky-700">Add your email to get updates on badges, streaks, and new courses. Young kids can skip this!</p>
                <input value={kidEmail} onChange={(e) => setKidEmail(e.target.value)}
                  placeholder="your@email.com" type="email"
                  className="w-full rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-700 mb-2">Do you have a parent invite code?</p>
                <div className="flex gap-2">
                  <button onClick={() => setHasInviteCode(true)}
                    className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-bold transition ${hasInviteCode === true ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-500 hover:border-emerald-200"}`}>
                    ✅ Yes, I have one
                  </button>
                  <button onClick={() => { setHasInviteCode(false); setInviteCode(""); }}
                    className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-bold transition ${hasInviteCode === false ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-500 hover:border-amber-200"}`}>
                    ⏭️ Skip for now
                  </button>
                </div>
              </div>
              {hasInviteCode === true && (
                <div>
                  <label className="text-sm font-bold text-slate-700">Parent Invite Code</label>
                  <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="e.g. ABC-123" maxLength={7}
                    className="mt-1.5 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base font-mono tracking-widest outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition" />
                </div>
              )}
              {hasInviteCode === false && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <span>⚠️</span>
                  <p className="text-xs font-semibold text-amber-800">No problem! You can browse everything, but progress won't save until a parent links your account.</p>
                </div>
              )}
              {msg && <div className={`rounded-2xl border p-4 text-sm font-semibold ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{msg.text}</div>}
              <button onClick={handleKidSignup} disabled={busy}
                className="w-full rounded-2xl bg-lime-500 py-3.5 text-base font-bold text-white shadow-sm hover:bg-lime-600 disabled:opacity-50 transition">
                {busy ? "Creating your account…" : "Start Learning! 🚀"}
              </button>
              <button onClick={() => { setStep("kid-login"); clearMsg(); }}
                className="w-full rounded-2xl border border-lime-200 bg-white py-3 text-sm font-bold text-lime-700 hover:bg-lime-50 transition">
                Already have an account? Sign in →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2c: Kid login */}
        {step === "kid-login" && (
          <div className="rounded-3xl border border-lime-100 bg-white p-8 shadow-sm">
            <BackButton onClick={() => { setStep("choose"); clearMsg(); }} />
            <StepDots current={1} total={2} />
            <span className="inline-flex items-center rounded-full border border-lime-300 bg-lime-50 px-3 py-1 text-xs font-bold text-lime-800 mb-3">🧒 Kid sign in</span>
            <h1 className="font-display text-3xl font-bold text-emerald-900 mb-1">Welcome back! 👋</h1>
            <p className="text-sm font-semibold text-slate-500 mb-6">Enter your username and 4-digit PIN.</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700">Username</label>
                <input value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleKidLogin()}
                  placeholder="Your username"
                  className="mt-1.5 w-full rounded-2xl border border-lime-200 bg-white px-4 py-3 text-base outline-none focus:border-lime-400 focus:ring-4 focus:ring-lime-100 transition" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">4-Digit PIN</label>
                <input value={loginPin} onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, "").slice(0, 4))} onKeyDown={(e) => e.key === "Enter" && handleKidLogin()}
                  placeholder="••••" type="password" inputMode="numeric" maxLength={4}
                  className="mt-1.5 w-full rounded-2xl border border-lime-200 bg-white px-4 py-3 text-base font-mono tracking-[0.5em] outline-none focus:border-lime-400 focus:ring-4 focus:ring-lime-100 transition" />
              </div>
              {msg && <div className={`rounded-2xl border p-4 text-sm font-semibold ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{msg.text}</div>}
              <button onClick={handleKidLogin} disabled={busy}
                className="w-full rounded-2xl bg-lime-500 py-3.5 text-base font-bold text-white shadow-sm hover:bg-lime-600 disabled:opacity-60 transition">
                {busy ? "Signing in…" : "Sign In 🚀"}
              </button>
              <button onClick={() => { setStep("kid-signup"); clearMsg(); }}
                className="w-full rounded-2xl border border-lime-200 bg-white py-3 text-sm font-bold text-lime-700 hover:bg-lime-50 transition">
                New here? Create an account →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Kid pending */}
        {step === "kid-pending" && (
          <div className="rounded-3xl border border-amber-100 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-5xl">🌱</div>
            <h1 className="font-display text-3xl font-bold text-emerald-900 mb-2">You're almost in!</h1>
            <p className="text-sm font-semibold text-slate-500 mb-6">Show this code to a parent so they can link your account and unlock saving your progress.</p>
            <div className="mx-auto mb-6 inline-flex flex-col items-center rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 px-10 py-6">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-2">Your Linking Code</span>
              <span className="font-mono text-4xl font-black tracking-[0.2em] text-amber-700">{formatCode(pendingCode)}</span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mb-6">Your parent signs up at SkillSprout, goes to their dashboard, and enters this code.</p>
            <button onClick={() => router.replace("/explore")} className="w-full rounded-2xl bg-emerald-600 py-3.5 text-base font-bold text-white shadow-sm hover:bg-emerald-700 transition">
              Start Exploring →
            </button>
          </div>
        )}

        <p className="text-center text-xs font-semibold text-slate-400">
          By signing up you agree to our Terms & Privacy Policy. We never share your data. 🛡️
        </p>
      </div>
    </div>
  );
}
export default function AuthPage() {
  return (
    <Suspense fallback={<div />}>
      <AuthPageInner />
    </Suspense>
  );
}