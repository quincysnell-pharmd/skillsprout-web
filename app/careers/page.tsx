"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";

// ── TYPES ─────────────────────────────────────────────────────
type Career = {
  id?: string;
  slug: string;
  icon?: string;
  emoji?: string;
  title: string;
  snippet?: string;
  description?: string;
  what?: string;
  day?: string;
  pros?: string[];
  cons?: string[];
  salary?: string;
  fun_fact?: string;
  education?: string;
  skills?: string;
  tags?: string[];
  is_published?: boolean;
  relatedCourses?: { id: string; title: string; emoji: string; level: string }[];
};

// ── FALLBACK DATA ─────────────────────────────────────────────
const FALLBACK_CAREERS: Career[] = [
  {
    slug: "chef", emoji: "👨‍🍳", title: "Chef",
    snippet: "Creates dishes that bring people joy — in restaurants, hotels, or their own business.",
    what: "Chefs plan menus, prepare food, lead kitchen teams, and make sure every dish is delicious.",
    day: "A typical day starts at noon prepping ingredients, then a busy dinner service. After service, plan tomorrow's specials.",
    pros: ["Incredibly creative", "Huge variety of settings", "Can be your own boss", "Travel opportunities"],
    cons: ["Long hours, especially nights", "Hot kitchen environments", "Stressful during service", "Starting salaries are low"],
    salary: "$35,000 – $100,000+", education: "Culinary school or apprenticeships",
    tags: ["Creative", "Hands-on", "Leadership", "Food"],
    relatedCourses: [{ id: "cooking-seedling", title: "Kitchen Basics", emoji: "🍳", level: "Seedling" }],
  },
  {
    slug: "software-engineer", emoji: "👩‍💻", title: "Software Engineer",
    snippet: "Builds the apps, websites, and games we use every day.",
    what: "Software engineers design and build the digital world — apps, websites, games, and more.",
    day: "Morning team meeting, writing and reviewing code, debugging issues, collaborating on new features.",
    pros: ["Very high earning potential", "Can work remotely", "Your work reaches millions", "High job security"],
    cons: ["Long periods sitting", "Debugging can be frustrating", "Technology changes fast", "Competitive"],
    salary: "$80,000 – $200,000+", education: "Computer science degree or self-taught",
    tags: ["Logic", "Creativity", "Problem-solving", "Remote"],
    relatedCourses: [{ id: "coding-seedling", title: "My First Code", emoji: "💻", level: "Seedling" }],
  },
  {
    slug: "landscape-architect", emoji: "🌳", title: "Landscape Architect",
    snippet: "Designs parks, gardens, and outdoor spaces that people love to visit.",
    what: "Landscape architects combine environmental science, art, and urban planning to create beautiful outdoor spaces.",
    day: "Designing plans on software, visiting sites, meeting with clients and city officials.",
    pros: ["Work outside in nature", "See your designs become real", "Combines art and science", "Growing field"],
    cons: ["Requires 4–5 year degree", "Physical outdoor work", "Projects take years", "Competitive"],
    salary: "$55,000 – $110,000+", education: "Bachelor's in Landscape Architecture + licensing",
    tags: ["Outdoors", "Creative", "Science", "Design"],
    relatedCourses: [{ id: "gardening-seedling", title: "Grow Your Own Garden", emoji: "🌱", level: "Seedling" }],
  },
  {
    slug: "financial-advisor", emoji: "📊", title: "Financial Advisor",
    snippet: "Helps people plan for their futures — saving for college, a home, or retirement.",
    what: "Financial advisors help people plan for their financial futures and turn complex money concepts into clear action plans.",
    day: "Client meetings, reviewing portfolios, researching market trends, creating financial plans.",
    pros: ["Help people achieve real goals", "Strong income potential", "Intellectually stimulating", "Can run own practice"],
    cons: ["Heavy responsibility", "Requires certifications", "Stressful during market downturns", "Building clients takes years"],
    salary: "$60,000 – $150,000+", education: "Finance degree + CFP certification",
    tags: ["Math", "Helping people", "Strategy", "Finance"],
    relatedCourses: [{ id: "money-sprout", title: "Money Smarts", emoji: "💰", level: "Sprout" }],
  },
  {
    slug: "photographer", emoji: "📷", title: "Photographer",
    snippet: "Captures moments that last forever — from wildlife to weddings to journalism.",
    what: "Photographers capture the world through images across weddings, wildlife, journalism, fashion, and fine art.",
    day: "Editing photos, planning shoots, doing portrait sessions in golden hour light.",
    pros: ["Enormous creative freedom", "Huge variety of work", "Can travel the world", "Can be a side business"],
    cons: ["Income can be irregular", "Competitive", "Equipment is expensive", "Business side is demanding"],
    salary: "$35,000 – $100,000+", education: "Portfolio matters most — many are self-taught",
    tags: ["Creative", "Travel", "Art", "Storytelling"],
    relatedCourses: [{ id: "art-seedling", title: "Color & Creativity", emoji: "🎨", level: "Seedling" }],
  },
  {
    slug: "veterinarian", emoji: "🐾", title: "Veterinarian",
    snippet: "Takes care of animals — from puppies and kittens to horses and exotic wildlife.",
    what: "Vets care for animal health — diagnosing illness, performing surgery, and advising owners.",
    day: "Morning appointments, vaccinations, dental cleanings, possibly an emergency surgery.",
    pros: ["Work with animals every day", "Deep sense of purpose", "Wide variety of specialties", "Strong income"],
    cons: ["Requires 8+ years of schooling", "High student loan debt", "Emotionally challenging", "Physical demands"],
    salary: "$80,000 – $150,000+", education: "4-year undergrad + 4-year DVM program",
    tags: ["Animals", "Science", "Medicine", "Care"],
    relatedCourses: [{ id: "gardening-seedling", title: "Grow Your Own Garden", emoji: "🌱", level: "Seedling" }],
  },
];

// ── HELPERS ───────────────────────────────────────────────────
function getTags(career: Career): string[] {
  if (Array.isArray(career.tags) && career.tags.length > 0) return career.tags;
  if (typeof career.skills === "string" && career.skills.length > 0)
    return career.skills.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function getEmoji(career: Career) { return career.icon ?? career.emoji ?? "🚀"; }
function getSnippet(career: Career) { return career.snippet ?? career.description ?? ""; }

// ── CAREER CARD ───────────────────────────────────────────────
function CareerCard({ career, saved, onSave, onOpen }: { career: Career; saved: boolean; onSave: () => void; onOpen: () => void }) {
  const tags = getTags(career);
  return (
    <div className="flex flex-col rounded-2xl border-2 border-transparent bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-100 hover:shadow-lg">
      <div className="text-5xl">{getEmoji(career)}</div>
      <h3 className="font-display mt-3 text-xl font-bold text-emerald-900">{career.title}</h3>
      <p className="mt-2 flex-1 text-sm font-semibold leading-relaxed text-slate-500">{getSnippet(career)}</p>
      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{tag}</span>
          ))}
        </div>
      )}
      {career.fun_fact && (
        <p className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs font-semibold text-amber-700">💡 {career.fun_fact}</p>
      )}
      <div className="mt-5 flex gap-2">
        <button onClick={onOpen} className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition">Learn More →</button>
        <button onClick={onSave}
          className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${saved ? "border-emerald-500 bg-emerald-500 text-white" : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"}`}
          title={saved ? "Saved!" : "Save this career"}
        >
          {saved ? "★" : "☆"}
        </button>
      </div>
    </div>
  );
}

// ── CAREER DETAIL ─────────────────────────────────────────────
function CareerDetail({ career, saved, onSave, onBack }: { career: Career; saved: boolean; onSave: () => void; onBack: () => void }) {
  const tags = getTags(career);
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-emerald-50">← Back to Careers</button>

      <div className="flex flex-col items-center rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-sky-50 p-10 text-center shadow-sm">
        <div className="text-8xl">{getEmoji(career)}</div>
        <h1 className="font-display mt-4 text-4xl font-bold text-emerald-900">{career.title}</h1>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-lg border border-emerald-200 bg-white/70 px-3 py-1 text-xs font-bold text-emerald-700">{tag}</span>
            ))}
          </div>
        )}
        <p className="mt-3 max-w-lg text-base font-semibold leading-relaxed text-slate-500">
          {career.what ?? getSnippet(career)}
        </p>
        <button onClick={onSave}
          className={`mt-5 rounded-xl border-2 px-6 py-2.5 text-sm font-bold transition ${saved ? "border-emerald-500 bg-emerald-500 text-white" : "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"}`}>
          {saved ? "★ Saved to Profile!" : "☆ Save to Profile"}
        </button>
      </div>

      {career.day && (
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-emerald-900">⏰ A Day in the Life</h2>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">{career.day}</p>
        </div>
      )}

      {(career.pros || career.cons) && (
        <div className="grid gap-5 md:grid-cols-2">
          {career.pros && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h2 className="font-display text-xl font-bold text-emerald-800">👍 The Good Stuff</h2>
              <ul className="mt-4 space-y-3">
                {career.pros.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm font-semibold text-slate-700"><span className="text-emerald-600 mt-0.5">✓</span>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {career.cons && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
              <h2 className="font-display text-xl font-bold text-rose-800">⚠️ The Hard Parts</h2>
              <ul className="mt-4 space-y-3">
                {career.cons.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-sm font-semibold text-slate-700"><span className="text-rose-500 mt-0.5">✗</span>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {career.salary && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
            <h3 className="font-display text-lg font-bold text-emerald-900">💵 Typical Salary</h3>
            <p className="mt-2 text-base font-bold text-slate-800">{career.salary}</p>
          </div>
        )}
        {career.education && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="font-display text-lg font-bold text-amber-900">🎓 Education Path</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">{career.education}</p>
          </div>
        )}
      </div>

      {career.relatedCourses && career.relatedCourses.length > 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-emerald-900">🌱 Want to Try It? Start Here</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {career.relatedCourses.map((c) => (
              <a key={c.id} href="/courses" className="flex items-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100 transition">
                <span>{c.emoji}</span><span>{c.title}</span>
                <span className="rounded-lg bg-white px-2 py-0.5 text-xs font-bold text-emerald-600">{c.level}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function CareersPage() {
  const supabase = supabaseBrowser();
  const [careers, setCareers]       = useState<Career[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Career | null>(null);
  const [savedTitles, setSavedTitles] = useState<Set<string>>(new Set());
  const [childId, setChildId]       = useState<string | null>(null);

  useEffect(() => { loadCareers(); loadSaved(); }, []);

  async function loadCareers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("career_interests")
      .select("*")
      .eq("is_published", true)
      .order("title");

    // Fall back to hardcoded data if table is empty or doesn't exist yet
    setCareers((!error && data && data.length > 0) ? data as Career[] : FALLBACK_CAREERS);
    setLoading(false);
  }

  async function loadSaved() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: childRow } = await supabase
      .from("child_profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (!childRow) return;
    setChildId(childRow.id);
    const { data: saved } = await supabase
      .from("career_interests_saved").select("career_title").eq("child_id", childRow.id);
    setSavedTitles(new Set((saved ?? []).map((s: { career_title: string }) => s.career_title)));
  }

  async function handleSave(career: Career) {
    if (!childId) { window.location.href = "/auth"; return; }
    const key = career.title;
    if (savedTitles.has(key)) {
      await supabase.from("career_interests_saved").delete().eq("child_id", childId).eq("career_title", key);
      setSavedTitles((prev) => { const n = new Set(prev); n.delete(key); return n; });
    } else {
      await supabase.from("career_interests_saved").insert({ child_id: childId, career_title: key });
      setSavedTitles((prev) => new Set([...prev, key]));
    }
  }

  if (selected) {
    return <CareerDetail career={selected} saved={savedTitles.has(selected.title)} onSave={() => handleSave(selected)} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-sky-100/50 blur-3xl" />
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">🚀 Discover real careers</span>
        <h1 className="font-display mt-4 text-4xl font-bold text-emerald-900 md:text-5xl">Careers</h1>
        <p className="mt-2 max-w-xl text-base font-semibold text-slate-500">See what real people do every day — the exciting parts AND the hard parts. Save the ones you love to your profile!</p>
        <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm">
          <span className="font-bold text-slate-800">Saved:</span>
          <span className="font-bold text-emerald-700">{savedTitles.size} career{savedTitles.size !== 1 ? "s" : ""}</span>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <span className="text-xl">🛡️</span>
        <p className="text-sm font-semibold text-sky-800">All career content is written for kids ages 6–17 — honest, age-appropriate, and focused on what genuinely excites you!</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="text-4xl animate-bounce">🚀</div></div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {careers.map((career) => (
            <CareerCard key={career.slug ?? career.title} career={career} saved={savedTitles.has(career.title)} onSave={() => handleSave(career)} onOpen={() => setSelected(career)} />
          ))}
        </div>
      )}

      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-emerald-900">Found something exciting?</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Save careers to your profile and find courses to try them out!</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/auth" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Sign in to save →</a>
            <a href="/courses" className="rounded-xl border-2 border-emerald-200 bg-white px-5 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-50">Browse Courses</a>
          </div>
        </div>
      </section>
    </div>
  );
}