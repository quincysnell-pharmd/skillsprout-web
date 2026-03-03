"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";
import Link from "next/link";

interface Stats {
  courses: number;
  challenges: number;
  badges: number;
  careers: number;
  children: number;
  parents: number;
}

export default function AdminOverview() {
  const supabase = supabaseBrowser();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      const [courses, challenges, badges, careers, children, parents] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("daily_challenges").select("id", { count: "exact", head: true }),
        supabase.from("badges").select("id", { count: "exact", head: true }),
        supabase.from("career_interests").select("id", { count: "exact", head: true }),
        supabase.from("child_profiles").select("id", { count: "exact", head: true }),
        supabase.from("parents").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        courses:    courses.count ?? 0,
        challenges: challenges.count ?? 0,
        badges:     badges.count ?? 0,
        careers:    careers.count ?? 0,
        children:   children.count ?? 0,
        parents:    parents.count ?? 0,
      });
    }
    load();
  }, []);

  const CONTENT_CARDS = [
    { label: "Courses",    count: stats?.courses,    icon: "📚", href: "/admin/courses",    color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
    { label: "Challenges", count: stats?.challenges, icon: "⚡", href: "/admin/challenges", color: "bg-amber-50 border-amber-200 text-amber-700" },
    { label: "Badges",     count: stats?.badges,     icon: "🏅", href: "/admin/badges",     color: "bg-violet-50 border-violet-200 text-violet-700" },
    { label: "Careers",    count: stats?.careers,    icon: "🚀", href: "/admin/careers",    color: "bg-sky-50 border-sky-200 text-sky-700" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-black text-slate-900">Overview</h1>
        <p className="text-sm font-semibold text-slate-500 mt-1">Welcome back, admin. Here's the current state of SkillSprout.</p>
      </div>

      {/* User stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="text-3xl font-black text-slate-900">{stats?.children ?? "—"}</div>
          <div className="text-sm font-bold text-slate-500 mt-1">👧 Kids registered</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="text-3xl font-black text-slate-900">{stats?.parents ?? "—"}</div>
          <div className="text-sm font-bold text-slate-500 mt-1">👨‍👩‍👧 Parent accounts</div>
        </div>
      </div>

      {/* Content cards */}
      <div>
        <h2 className="font-display text-lg font-bold text-slate-700 mb-3">Content</h2>
        <div className="grid grid-cols-2 gap-4">
          {CONTENT_CARDS.map(({ label, count, icon, href, color }) => (
            <Link
              key={label}
              href={href}
              className={`rounded-2xl border ${color} p-5 hover:shadow-md transition-shadow`}
            >
              <div className="text-3xl mb-2">{icon}</div>
              <div className="text-2xl font-black">{count ?? "—"}</div>
              <div className="text-sm font-bold mt-0.5">{label}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}