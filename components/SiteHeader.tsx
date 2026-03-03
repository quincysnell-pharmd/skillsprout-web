"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { supabaseBrowser } from "../app/lib/supabase/client";

type UserRole = "guest" | "kid" | "parent" | "admin";

const ADMIN_LINK = { href: "/admin", label: "Admin" };

const PUBLIC_LINKS = [
  { href: "/explore",  label: "Explore"  },
  { href: "/courses",  label: "Courses"  },
  { href: "/careers",  label: "Careers"  },
  { href: "/about",    label: "About Us" },
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [role, setRole]         = useState<UserRole>("guest");
  const [childId, setChildId]   = useState<string | null>(null);
  const supabase                = supabaseBrowser();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    async function detectRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setRole("guest"); return; }

      const { data: adminRow } = await supabase
        .from("admins").select("id").eq("user_id", user.id).maybeSingle();
      if (adminRow) { setRole("admin"); return; }

      const { data: childRow } = await supabase
        .from("child_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (childRow) { setRole("kid"); setChildId(childRow.id); return; }

      setRole("parent");
    }

    detectRole();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        detectRole();
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const roleLinks = () => {
    if (role === "kid" && childId) return [{ href: `/dashboard/child/${childId}`, label: "My Profile" }];
    if (role === "parent") return [{ href: "/dashboard/parent", label: "Parent View" }];
    return [];
  };

  const allNavLinks = [...PUBLIC_LINKS, ...roleLinks()];

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <>
      <header className={`sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur transition-shadow duration-200 ${scrolled ? "shadow-md" : "shadow-none"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-4 shrink-0" onClick={closeMenu}>
            <div className="relative h-16 w-16 rounded-full bg-white ring-2 ring-emerald-200 shadow-sm flex items-center justify-center">
              <Image src="/logo.png" alt="SkillSprout" width={60} height={60} className="object-scale-down" priority />
            </div>
            <div className="leading-tight">
              <div className="font-display text-xl font-extrabold text-slate-900 tracking-tight">SkillSprout</div>
              <div className="text-xs text-slate-500 font-medium">Where skills grow</div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold text-slate-600">
            {allNavLinks.map(({ href, label }) => (
              <Link key={href} href={href} className="px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150">
                {label}
              </Link>
            ))}
            {role === "admin" && (
              <>
                <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
                <Link href={ADMIN_LINK.href} className="px-3 py-2 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-700 transition-colors duration-150 text-xs uppercase tracking-wider">
                  {ADMIN_LINK.label}
                </Link>
              </>
            )}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {role === "guest" && (
              <>
                <Link href="/auth?mode=signin" className="px-4 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">Sign In</Link>
                <Link href="/auth?mode=signup" className="px-4 py-2 text-sm font-bold text-white bg-green-500 rounded-xl hover:bg-green-600 transition-colors shadow-sm">Get Started 🌱</Link>
              </>
            )}
            {role === "admin" && (
              <Link href="/admin" className="px-4 py-2 text-sm font-bold text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors shadow-sm">Admin Panel</Link>
            )}
            {(role === "kid" || role === "parent" || role === "admin") && (
              <button onClick={signOut} className="px-4 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                Sign Out
              </button>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="lg:hidden flex flex-col items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 transition-colors gap-[5px]"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span className={`block h-0.5 w-5 bg-slate-700 rounded transition-transform duration-200 origin-center ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 bg-slate-700 rounded transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-slate-700 rounded transition-transform duration-200 origin-center ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${menuOpen ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="border-t border-slate-100 bg-white px-4 pb-4 pt-2">
            <nav className="flex flex-col gap-1 mb-4">
              {allNavLinks.map(({ href, label }) => (
                <Link key={href} href={href} onClick={closeMenu} className="px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                  {label}
                </Link>
              ))}
              {role === "admin" && (
                <>
                  <div className="my-1 h-px bg-slate-100" />
                  <Link href={ADMIN_LINK.href} onClick={closeMenu} className="px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 hover:bg-amber-50 hover:text-amber-700 transition-colors">
                    {ADMIN_LINK.label}
                  </Link>
                </>
              )}
            </nav>
            <div className="flex flex-col gap-2">
              {role === "guest" ? (
                <>
                  <Link href="/auth?mode=signin" onClick={closeMenu} className="w-full py-2.5 text-center text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Sign In</Link>
                  <Link href="/auth?mode=signup" onClick={closeMenu} className="w-full py-2.5 text-center text-sm font-bold text-white bg-green-500 rounded-xl hover:bg-green-600 transition-colors shadow-sm">Get Started 🌱</Link>
                </>
              ) : (
                <button onClick={() => { signOut(); closeMenu(); }} className="w-full py-2.5 text-center text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {menuOpen && <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={closeMenu} aria-hidden="true" />}
    </>
  );
}