import "./globals.css";
import { Nunito, Fredoka } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";

const bodyFont = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "600", "700", "800"],
});

const displayFont = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
});

export const metadata = {
  title: "SkillSprout",
  description: "Where skills grow.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {/* Background glow */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-40 left-[-10%] h-[520px] w-[520px] rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="absolute top-[-160px] right-[-10%] h-[560px] w-[560px] rounded-full bg-lime-200/30 blur-3xl" />
        </div>

        <SiteHeader />

        {/* MAIN */}
        <main className="mx-auto max-w-6xl px-6 py-10">
          {children}
        </main>

        {/* FOOTER */}
        <footer className="border-t border-emerald-100 bg-white/70">
          <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate-500">
            © {new Date().getFullYear()} SkillSprout • Where skills grow.
          </div>
        </footer>
      </body>
    </html>
  );
}