"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const supabase = supabaseBrowser();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin]   = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    setChecking(true);
    try {
      // Always use getUser which is more reliable than getSession after full page reload
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) { router.replace("/auth"); return; }

      const { data: adminRow } = await supabase
        .from("admins").select("id").eq("user_id", user.id).maybeSingle();

      if (!adminRow) { router.replace("/auth"); return; }

      setIsAdmin(true);
    } catch (err) {
      console.error("Admin auth check error:", err);
    } finally {
      setChecking(false);
    }
  }

  const navItems = [
    { label: "Courses",    href: "/admin/courses",    emoji: "📚" },
    { label: "Challenges", href: "/admin/challenges", emoji: "⚡" },
    { label: "Community",  href: "/admin/community",  emoji: "🌱" },
    { label: "Futures",    href: "/admin/careers",    emoji: "🚀" },
    { label: "Users",      href: "/admin/users",      emoji: "👥" },
    { label: "Announcements", href: "/admin/announcements", emoji: "📣" },
    { label: "Support",       href: "/admin/support",       emoji: "💬" },
  ];

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-4xl animate-bounce">🌱</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.push("/admin/courses")}
            className="font-display text-lg font-black text-violet-700 hover:text-violet-900 transition">
            ⚙️ Admin
          </button>
        </div>
        <nav className="flex items-center gap-1 flex-wrap">
          {navItems.map(item => (
            <button key={item.href} onClick={() => router.push(item.href)}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                pathname.startsWith(item.href)
                  ? "bg-violet-100 text-violet-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}>
              {item.emoji} {item.label}
            </button>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}