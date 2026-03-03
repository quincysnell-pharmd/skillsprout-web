"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProfile, getProfile } from "../lib/clientStore";

function isValidUsername(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 3) return false;
  if (trimmed.length > 16) return false;
  // Allow letters, numbers, underscore
  return /^[a-zA-Z0-9_]+$/.test(trimmed);
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    // If they already have a profile, don’t make them do this again
    const existing = getProfile();
    if (existing) router.replace("/profile");
  }, [router]);

  const validation = useMemo(() => {
    const trimmed = username.trim();
    if (!touched && trimmed.length === 0) return { ok: false, msg: "" };

    if (trimmed.length < 3) return { ok: false, msg: "Use at least 3 characters." };
    if (trimmed.length > 16) return { ok: false, msg: "Use 16 characters or less." };
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed))
      return { ok: false, msg: "Use only letters, numbers, or _" };

    return { ok: true, msg: "Looks good!" };
  }, [username, touched]);

  function handleCreate() {
    setTouched(true);
    if (!isValidUsername(username)) return;

    createProfile(username);
    router.push("/profile");
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-emerald-100 bg-white p-10 shadow-sm">
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
          🌱 Create a profile
        </span>

        <h1 className="font-display mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">
          Choose a username
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          This is what shows on leaderboards and progress. Parents can control privacy later.
        </p>

        <div className="mt-8 grid gap-4 md:max-w-lg">
          <label className="text-sm font-semibold text-slate-800">
            Username
          </label>

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g. SproutHero_7"
            className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base outline-none focus:ring-4 focus:ring-emerald-100"
          />

          <div
            className={
              "text-sm " +
              (validation.msg === ""
                ? "text-slate-400"
                : validation.ok
                ? "text-emerald-700"
                : "text-rose-600")
            }
          >
            {validation.msg || "Use 3–16 characters. Letters, numbers, or _ only."}
          </div>

          <button
            onClick={handleCreate}
            className={
              validation.ok
                ? "mt-2 inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-700"
                : "mt-2 inline-flex items-center justify-center rounded-2xl bg-emerald-300 px-5 py-3 text-base font-semibold text-white cursor-not-allowed"
            }
          >
            Create profile
          </button>

          <div className="mt-2 text-xs text-slate-500">
            Tip: no spaces. Example: <span className="font-semibold">GreenCoder</span> or{" "}
            <span className="font-semibold">SproutChef_12</span>.
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/explore"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-emerald-50"
            >
              Back to Explore
            </Link>
            <Link
              href="/careers"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-emerald-50"
            >
              Browse Careers
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl font-extrabold tracking-tight">
          Coming next
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Parent controls, multiple kids under one parent account, and secure sign-in.
        </p>
      </section>
    </main>
  );
}
