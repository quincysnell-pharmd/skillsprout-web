"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const supabase = supabaseBrowser();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setChecking(false);
        router.replace("/auth");
        return;
      }

      const { data: adminRow } = await supabase
        .from("admins")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!adminRow) {
        setChecking(false);
        router.replace("/");
        return;
      }

      setChecking(false);
    } catch (err) {
      console.error("Admin auth check error:", err);
      setChecking(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-4xl animate-bounce">🌱</div>
      </div>
    );
  }

  const navItems = [
    { label: "Courses",   href: "/admin/courses"   },
    { label: "Community", href: "/admin/community"  },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <button onClick={() => router.push("/admin/courses")}
            className="font-display text-lg font-black text-violet-700 hover:text-violet-900 transition">
            🌱 SkillSprout Admin
          </button>
          <nav className="flex items-center gap-1">
            {navItems.map(item => (
              <button key={item.href} onClick={() => router.push(item.href)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  pathname.startsWith(item.href)
                    ? "bg-violet-100 text-violet-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto">
            <button onClick={async () => { await supabase.auth.signOut(); router.replace("/auth"); }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}