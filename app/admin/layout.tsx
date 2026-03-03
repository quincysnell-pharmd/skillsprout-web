"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/app/lib/supabase/client";

const NAV = [
  { href: "/admin",            icon: "🏠", label: "Overview"   },
  { href: "/admin/courses",    icon: "📚", label: "Courses"    },
  { href: "/admin/challenges", icon: "⚡", label: "Challenges" },
  { href: "/admin/badges",     icon: "🏅", label: "Badges"     },
  { href: "/admin/careers",    icon: "🚀", label: "Careers"    },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const supabase = supabaseBrowser();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function check(userId: string) {
      console.log("Checking admin for userId:", userId);
      const { data: adminRow, error } = await supabase
        .from("admins")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      console.log("Admin row:", adminRow, "Error:", error);

      if (!adminRow) { router.replace("/"); return; }
      setAuthorized(true);
      setChecking(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Session:", session?.user?.id ?? "no session");
      if (session?.user) {
        check(session.user.id);
      } else {
        router.replace("/auth");
      }
    });
  }, []);

  if (checking) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-4xl animate-bounce">⚙️</div>
    </div>
  );

  if (!authorized) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="px-5 py-6 border-b border-slate-100">
          <div className="font-display text-lg font-black text-slate-900">SkillSprout</div>
          <div className="text-xs font-bold text-violet-600 mt-0.5">Admin CMS</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                  active
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-100">
          <button
            onClick={async () => { await supabase.auth.signOut(); router.replace("/auth"); }}
            className="w-full rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}