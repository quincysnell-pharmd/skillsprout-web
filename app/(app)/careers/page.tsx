"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";

interface Career {
  id: string;
  title: string;
  emoji: string;
  image_url?: string;
  brief: string;
  description: string;
  salary_avg: number;
  salary_min: number;
  salary_max: number;
  outlook: string;
  pros: string[];
  cons: string[];
  required_skills: string[];
  course_ids: string[];
  is_published: boolean;
  order_index: number;
}

interface Course {
  id: string;
  title: string;
  emoji?: string;
  level?: string;
}

const OUTLOOK_CONFIG: Record<string, { label: string; color: string }> = {
  growing:   { label: "📈 Growing",   color: "bg-emerald-100 text-emerald-700" },
  stable:    { label: "📊 Stable",    color: "bg-sky-100 text-sky-700"         },
  declining: { label: "📉 Declining", color: "bg-rose-100 text-rose-700"       },
};

function formatSalary(n: number) {
  if (!n) return null;
  return "$" + n.toLocaleString();
}

// ── Career Card ────────────────────────────────────────────────
function CareerCard({ career, saved, onSave, onOpen }: {
  career: Career; saved: boolean; onSave: () => void; onOpen: () => void;
}) {
  const outlook = OUTLOOK_CONFIG[career.outlook] ?? OUTLOOK_CONFIG.stable;
  const avgSalary = career.salary_avg || Math.round((career.salary_min + career.salary_max) / 2);

  return (
    <div className="flex flex-col rounded-2xl border-2 border-transparent bg-white shadow-sm transition hover:-translate-y-1 hover:border-emerald-100 hover:shadow-lg overflow-hidden">
      {/* Image or emoji hero */}
      {career.image_url ? (
        <div className="h-40 w-full overflow-hidden">
          <img src={career.image_url} alt={career.title} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
          <span className="text-7xl">{career.emoji ?? "💼"}</span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-6">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-xl font-bold text-emerald-900">{career.title}</h3>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${outlook.color}`}>{outlook.label}</span>
        </div>
        <p className="mt-2 flex-1 text-sm font-semibold leading-relaxed text-slate-500">{career.brief}</p>

        {avgSalary > 0 && (
          <div className="mt-3 text-sm font-bold text-emerald-700">💰 ~{formatSalary(avgSalary)}/yr</div>
        )}

        {career.required_skills?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {career.required_skills.slice(0, 3).map(s => (
              <span key={s} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{s}</span>
            ))}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={onOpen}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition">
            Learn More →
          </button>
          <button onClick={onSave}
            className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${
              saved ? "border-emerald-500 bg-emerald-500 text-white" : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
            }`}>
            {saved ? "★" : "☆"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Career Detail ──────────────────────────────────────────────
function CareerDetail({ career, saved, onSave, onBack, courses }: {
  career: Career; saved: boolean; onSave: () => void; onBack: () => void; courses: Course[];
}) {
  const outlook = OUTLOOK_CONFIG[career.outlook] ?? OUTLOOK_CONFIG.stable;
  const avgSalary = career.salary_avg || Math.round((career.salary_min + career.salary_max) / 2);
  const linkedCourses = courses.filter(c => career.course_ids?.includes(c.id));

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <button onClick={onBack}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 transition">
        ← Back to Careers
      </button>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 to-sky-50 border border-emerald-100 shadow-sm">
        {career.image_url ? (
          <img src={career.image_url} alt={career.title} className="w-full h-56 object-cover" />
        ) : (
          <div className="flex items-center justify-center h-40">
            <span className="text-8xl">{career.emoji ?? "💼"}</span>
          </div>
        )}
        <div className="p-8 text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap mb-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${outlook.color}`}>{outlook.label}</span>
            {avgSalary > 0 && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">💰 ~{formatSalary(avgSalary)}/yr</span>}
          </div>
          <h1 className="font-display text-4xl font-bold text-emerald-900">{career.title}</h1>
          <p className="mt-3 max-w-lg mx-auto text-base font-semibold leading-relaxed text-slate-500">{career.brief}</p>
          <button onClick={onSave}
            className={`mt-5 rounded-xl border-2 px-6 py-2.5 text-sm font-bold transition ${
              saved ? "border-emerald-500 bg-emerald-500 text-white" : "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
            }`}>
            {saved ? "★ Saved to Profile!" : "☆ Save to Profile"}
          </button>
        </div>
      </div>

      {/* Description */}
      {career.description && (
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-emerald-900 mb-3">About This Career</h2>
          <div className="text-sm font-semibold leading-relaxed text-slate-600 whitespace-pre-line">{career.description}</div>
        </div>
      )}

      {/* Pros & Cons */}
      {(career.pros?.length > 0 || career.cons?.length > 0) && (
        <div className="grid gap-5 md:grid-cols-2">
          {career.pros?.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h2 className="font-display text-xl font-bold text-emerald-800">👍 The Good Stuff</h2>
              <ul className="mt-4 space-y-3">
                {career.pros.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                    <span className="mt-0.5 font-bold text-emerald-600">✓</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {career.cons?.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
              <h2 className="font-display text-xl font-bold text-rose-800">⚠️ The Hard Parts</h2>
              <ul className="mt-4 space-y-3">
                {career.cons.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                    <span className="mt-0.5 font-bold text-rose-500">✗</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Required Skills */}
      {career.required_skills?.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-xl font-bold text-slate-900 mb-3">🛠️ Skills You'll Need</h2>
          <div className="flex flex-wrap gap-2">
            {career.required_skills.map((s, i) => (
              <span key={i} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Linked Courses */}
      {linkedCourses.length > 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-emerald-900">🌱 Try It Out</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">These courses will give you a real taste of what this career feels like!</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {linkedCourses.map(c => (
              <a key={c.id} href={`/courses/${c.id}`}
                className="flex items-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100 transition">
                <span>{c.emoji ?? "📚"}</span>
                <span>{c.title}</span>
                {c.level && <span className="rounded-lg bg-white px-2 py-0.5 text-xs font-bold text-emerald-600 capitalize">{c.level}</span>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function CareersPage() {
  const supabase = supabaseBrowser();
  const [careers, setCareers]   = useState<Career[]>([]);
  const [courses, setCourses]   = useState<Course[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Career | null>(null);
  const [saved, setSaved]       = useState<Set<string>>(new Set());

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: careerData }, { data: courseData }] = await Promise.all([
      supabase.from("careers").select("*").eq("is_published", true).order("order_index"),
      supabase.from("courses").select("id, title, emoji, level").eq("is_published", true),
    ]);
    setCareers((careerData as Career[]) ?? []);
    setCourses((courseData as Course[]) ?? []);

    // Load saved careers from localStorage
    try {
      const s = JSON.parse(localStorage.getItem("saved_careers") ?? "[]");
      setSaved(new Set(s));
    } catch { setSaved(new Set()); }

    setLoading(false);
  }

  function toggleSave(careerId: string) {
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(careerId)) next.delete(careerId);
      else next.add(careerId);
      try { localStorage.setItem("saved_careers", JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  if (selected) {
    return (
      <CareerDetail
        career={selected}
        saved={saved.has(selected.id)}
        onSave={() => toggleSave(selected.id)}
        onBack={() => setSelected(null)}
        courses={courses}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-sky-100/50 blur-3xl" />
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">🚀 Discover real careers</span>
        <h1 className="font-display mt-4 text-4xl font-bold text-emerald-900 md:text-5xl">Careers</h1>
        <p className="mt-2 max-w-xl text-base font-semibold text-slate-500">
          See what real people do every day — the exciting parts AND the hard parts. Save the ones you love to your profile!
        </p>
        <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm">
          <span className="font-bold text-slate-800">Saved:</span>
          <span className="font-bold text-emerald-700">{saved.size} career{saved.size !== 1 ? "s" : ""}</span>
        </div>
      </section>

      {/* Career grid */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="text-4xl animate-bounce">💼</div></div>
      ) : careers.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center">
          <div className="text-5xl mb-3">💼</div>
          <p className="font-bold text-slate-400">No careers added yet — check back soon!</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {careers.map(career => (
            <CareerCard
              key={career.id}
              career={career}
              saved={saved.has(career.id)}
              onSave={() => toggleSave(career.id)}
              onOpen={() => setSelected(career)}
            />
          ))}
        </div>
      )}
    </div>
  );
}