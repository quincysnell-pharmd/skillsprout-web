"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";

// ── TYPES ─────────────────────────────────────────────────────
type Level    = "seedling" | "sprout" | "bloom" | "harvest";
type Category = "all" | "cooking" | "coding" | "gardening" | "money" | "art";

type Course = {
  id: string;
  title: string;
  emoji?: string;
  category: Exclude<Category, "all">;
  level: Level;
  age_min?: number;
  age_max?: number;
  lesson_count?: number;
  description: string;
  bg?: string;
  final_project?: string;
  prerequisites?: string[];
  topics?: string[];
  is_free?: boolean;
  price_cents?: number;
  is_published?: boolean;
  slug?: string;
};

// ── FALLBACK DATA (shown until admin uploads courses) ─────────
const FALLBACK_COURSES: Course[] = [
  {
    id: "cooking-seedling", title: "Kitchen Basics", emoji: "🍳",
    category: "cooking", level: "seedling", age_min: 6, age_max: 9,
    lesson_count: 6, is_free: true, price_cents: 0,
    description: "Your very first kitchen adventure! Learn to stay safe, use basic tools, and cook real food.",
    bg: "from-yellow-50 to-orange-100",
    final_project: "Cook a 2-course meal for your family!",
    prerequisites: ["No cooking experience needed!"],
    topics: ["Kitchen safety", "Basic knife skills", "Boiling water & pasta", "Simple salad", "Scrambled eggs", "Final project"],
  },
  {
    id: "coding-seedling", title: "My First Code", emoji: "💻",
    category: "coding", level: "seedling", age_min: 7, age_max: 10,
    lesson_count: 8, is_free: true, price_cents: 0,
    description: "Discover coding with Scratch! Build your first animated story and game.",
    bg: "from-blue-50 to-indigo-100",
    final_project: "Build a game in Scratch!",
    prerequisites: ["No coding experience needed"],
    topics: ["What is code?", "Scratch basics", "Make characters move", "Add sounds", "Build a game", "Final project"],
  },
  {
    id: "gardening-seedling", title: "Grow Your Own Garden", emoji: "🌱",
    category: "gardening", level: "seedling", age_min: 6, age_max: 10,
    lesson_count: 6, is_free: true, price_cents: 0,
    description: "Start your very own garden and watch something you grew come to life.",
    bg: "from-green-50 to-emerald-100",
    final_project: "Grow an herb and cook with it!",
    prerequisites: ["No gardening experience needed"],
    topics: ["What plants need", "Types of soil", "Seeds vs. seedlings", "Planting herbs", "Watering tips", "Final project"],
  },
  {
    id: "money-sprout", title: "Money Smarts", emoji: "💰",
    category: "money", level: "sprout", age_min: 9, age_max: 13,
    lesson_count: 7, is_free: false, price_cents: 499,
    description: "Learn the basics of money — where it comes from and how to save it.",
    bg: "from-yellow-50 to-amber-100",
    final_project: "Create your personal budget and savings plan!",
    prerequisites: ["Basic math skills"],
    topics: ["What is money?", "Earning", "Needs vs wants", "Budgeting", "Saving", "Goals", "Final project"],
  },
  {
    id: "art-seedling", title: "Color & Creativity", emoji: "🎨",
    category: "art", level: "seedling", age_min: 6, age_max: 10,
    lesson_count: 6, is_free: true, price_cents: 0,
    description: "Explore color, shape, and your imagination! Create your first illustrated storybook.",
    bg: "from-violet-50 to-purple-100",
    final_project: "Create a 6-page illustrated storybook!",
    prerequisites: ["No art experience needed"],
    topics: ["Primary colors", "Color mixing", "Shapes in art", "Watercolor", "Storytelling", "Final project"],
  },
];

// ── LEVEL CONFIG ──────────────────────────────────────────────
const LEVEL_CONFIG: Record<Level, { label: string; emoji: string; color: string; bg: string; description: string }> = {
  seedling: { label: "Seedling", emoji: "🌱", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", description: "Complete beginner" },
  sprout:   { label: "Sprout",   emoji: "🌿", color: "text-green-700",   bg: "bg-green-50 border-green-200",     description: "Some experience" },
  bloom:    { label: "Bloom",    emoji: "🌸", color: "text-sky-700",     bg: "bg-sky-50 border-sky-200",         description: "Getting confident" },
  harvest:  { label: "Harvest",  emoji: "🌻", color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",     description: "Advanced learner" },
};

const CATEGORY_FILTERS: { key: Category; label: string }[] = [
  { key: "all",       label: "All Courses" },
  { key: "cooking",   label: "🍳 Cooking"   },
  { key: "coding",    label: "💻 Coding"    },
  { key: "gardening", label: "🌱 Gardening" },
  { key: "money",     label: "💰 Money"     },
  { key: "art",       label: "🎨 Art"       },
];

// ── SUB-COMPONENTS ────────────────────────────────────────────
function LevelPill({ level }: { level: Level }) {
  const cfg = LEVEL_CONFIG[level];
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold ${cfg.bg} ${cfg.color}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

function CourseCard({ course, enrolled, onClick }: { course: Course; enrolled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border-2 border-transparent bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-emerald-100 hover:shadow-lg"
    >
      <div className={`flex h-32 items-center justify-center bg-gradient-to-br ${course.bg ?? "from-slate-50 to-slate-100"}`}>
        <span className="text-6xl">{course.emoji ?? "📚"}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <LevelPill level={course.level} />
          {course.is_free && <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Free</span>}
          {enrolled && <span className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">Enrolled ✓</span>}
        </div>
        <h3 className="font-display mt-3 text-lg font-bold text-emerald-900">{course.title}</h3>
        <p className="mt-1.5 flex-1 text-sm font-semibold leading-relaxed text-slate-500">{course.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {course.age_min && <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">Ages {course.age_min}–{course.age_max}</span>}
          {course.lesson_count && <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{course.lesson_count} lessons</span>}
          {!course.is_free && course.price_cents && <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">${(course.price_cents / 100).toFixed(2)}</span>}
        </div>
        <div className="mt-4 text-sm font-bold text-emerald-600 group-hover:text-emerald-800">View course →</div>
      </div>
    </button>
  );
}

function CourseDetail({ course, enrolled, onEnroll, onBack }: { course: Course; enrolled: boolean; onEnroll: () => void; onBack: () => void }) {
  const cfg = LEVEL_CONFIG[course.level];
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-emerald-50">
        ← Back to Courses
      </button>
      <div className={`flex flex-col items-center rounded-3xl bg-gradient-to-br p-10 text-center ${course.bg ?? "from-slate-50 to-slate-100"}`}>
        <span className="text-8xl">{course.emoji ?? "📚"}</span>
        <h1 className="font-display mt-4 text-4xl font-bold text-emerald-900">{course.title}</h1>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <LevelPill level={course.level} />
          {course.age_min && <span className="rounded-lg bg-white/70 px-3 py-1 text-xs font-bold text-slate-600">Ages {course.age_min}–{course.age_max}</span>}
          {course.lesson_count && <span className="rounded-lg bg-white/70 px-3 py-1 text-xs font-bold text-slate-600">{course.lesson_count} lessons</span>}
          {course.is_free
            ? <span className="rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Free!</span>
            : course.price_cents && <span className="rounded-lg bg-white/70 px-3 py-1 text-xs font-bold text-slate-600">${(course.price_cents / 100).toFixed(2)}</span>
          }
        </div>
        <p className="mt-4 max-w-lg text-base font-semibold leading-relaxed text-slate-600">{course.description}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {course.prerequisites && (
          <div className={`rounded-2xl border-2 p-6 ${cfg.bg}`}>
            <h2 className={`font-display text-xl font-bold ${cfg.color}`}>{cfg.emoji} {cfg.label} Level</h2>
            <ul className="mt-3 space-y-2">
              {course.prerequisites.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                  <span className="text-emerald-500">✓</span>{p}
                </li>
              ))}
            </ul>
          </div>
        )}
        {course.final_project && (
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6">
            <h2 className="font-display text-xl font-bold text-amber-800">🏆 Final Project</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-700">{course.final_project}</p>
          </div>
        )}
      </div>

      {course.topics && (
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-emerald-900">What You'll Learn</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {course.topics.map((topic, i) => (
              <div key={topic} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{i + 1}</div>
                <span className="text-sm font-semibold text-slate-700">{topic}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <button
          onClick={onEnroll}
          disabled={enrolled}
          className="rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-bold text-white shadow-sm hover:bg-emerald-700 disabled:bg-emerald-300 transition"
        >
          {enrolled ? "✓ Already Enrolled" : course.is_free ? "Enroll Free 🌱" : `Enroll — $${((course.price_cents ?? 0) / 100).toFixed(2)}`}
        </button>
        <button onClick={onBack} className="rounded-xl border-2 border-emerald-200 bg-white px-8 py-3.5 text-base font-bold text-emerald-800 hover:bg-emerald-50">
          Browse More
        </button>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function CoursesPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [courses, setCourses]       = useState<Course[]>([]);
  const [loading, setLoading]       = useState(true);
  const [category, setCategory]     = useState<Category>("all");
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [childId, setChildId]       = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
    loadEnrollments();
  }, []);

  async function loadCourses() {
    setLoading(true);
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: true });

    console.log("Courses data:", data, "Error:", error);

    if (error || !data || data.length === 0) {
      console.log("Falling back to hardcoded courses");
      setCourses(FALLBACK_COURSES);
    } else {
      setCourses(data as Course[]);
    }
    setLoading(false);
  }

  async function loadEnrollments() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: childRow } = await supabase
      .from("child_profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (!childRow) return;
    setChildId(childRow.id);
    const { data: enrollments } = await supabase
      .from("enrollments").select("course_id").eq("child_id", childRow.id);
    setEnrolledIds(new Set((enrollments ?? []).map((e: { course_id: string }) => e.course_id)));
  }

  async function handleEnroll(course: Course) {
    if (!childId) { window.location.href = "/auth"; return; }
    if (enrolledIds.has(course.id)) return;
    await supabase.from("enrollments").insert({
      child_id: childId,
      course_id: course.id,
      progress_pct: 0,
    });
    setEnrolledIds((prev) => new Set([...prev, course.id]));
  }

  const filtered = courses.filter((c) => category === "all" || c.category === category);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-emerald-100/50 blur-3xl" />
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">📚 Project-based courses</span>
        <h1 className="font-display mt-4 text-4xl font-bold text-emerald-900 md:text-5xl">Browse Courses</h1>
        <p className="mt-2 max-w-xl text-base font-semibold text-slate-500">From Seedling to Harvest — find the right level for you!</p>
      </section>

      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((f) => (
          <button key={f.key} onClick={() => setCategory(f.key)}
            className={`rounded-xl border-2 px-4 py-2 text-sm font-bold transition ${category === f.key ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-4xl animate-bounce">📚</div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} enrolled={enrolledIds.has(course.id)} onClick={() => router.push(`/courses/${course.id}`)} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 rounded-2xl border border-slate-100 bg-white p-12 text-center">
              <div className="text-5xl">🌱</div>
              <p className="mt-3 font-display text-lg font-bold text-slate-400">More courses coming soon!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}