"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";

// ── TYPES ─────────────────────────────────────────────────────
type Level    = "seedling" | "sprout" | "bloom" | "harvest" | string;
type Category = "all" | "cooking" | "coding" | "gardening" | "money" | "art";
type UserRole = "child" | "parent" | "unknown";

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

// ── FALLBACK DATA ─────────────────────────────────────────────
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
    id: "money-sprout", title: "Money Smarts", emoji: "💰",
    category: "money", level: "sprout", age_min: 9, age_max: 13,
    lesson_count: 7, is_free: false, price_cents: 499,
    description: "Learn the basics of money — where it comes from and how to save it.",
    bg: "from-yellow-50 to-amber-100",
    final_project: "Create your personal budget and savings plan!",
    prerequisites: ["Basic math skills"],
    topics: ["What is money?", "Earning", "Needs vs wants", "Budgeting", "Saving", "Goals", "Final project"],
  },
];

// ── LEVEL CONFIG ──────────────────────────────────────────────
const LEVEL_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string; description: string }> = {
  seedling:  { label: "Seedling",  emoji: "🌱", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", description: "Complete beginner" },
  sprout:    { label: "Sprout",    emoji: "🌿", color: "text-green-700",   bg: "bg-green-50 border-green-200",     description: "Some experience" },
  bloom:     { label: "Bloom",     emoji: "🌸", color: "text-sky-700",     bg: "bg-sky-50 border-sky-200",         description: "Getting confident" },
  harvest:   { label: "Harvest",   emoji: "🌻", color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",     description: "Advanced learner" },
  seed:      { label: "Seed",      emoji: "🌱", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", description: "Complete beginner" },
  sapling:   { label: "Sapling",   emoji: "🌿", color: "text-green-700",   bg: "bg-green-50 border-green-200",     description: "Some experience" },
  tree:      { label: "Tree",      emoji: "🌳", color: "text-sky-700",     bg: "bg-sky-50 border-sky-200",         description: "Getting confident" },
  forest:    { label: "Forest",    emoji: "🌲", color: "text-teal-700",    bg: "bg-teal-50 border-teal-200",       description: "Advanced learner" },
  ecosystem: { label: "Ecosystem", emoji: "🌍", color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",     description: "Expert" },
};

const FALLBACK_LEVEL = { label: "Beginner", emoji: "📚", color: "text-slate-700", bg: "bg-slate-50 border-slate-200", description: "" };

const CATEGORY_FILTERS: { key: Category; label: string }[] = [
  { key: "all",       label: "All Courses" },
  { key: "cooking",   label: "🍳 Cooking"   },
  { key: "coding",    label: "💻 Coding"    },
  { key: "gardening", label: "🌱 Gardening" },
  { key: "money",     label: "💰 Money"     },
  { key: "art",       label: "🎨 Art"       },
];

// ── COMPONENTS ────────────────────────────────────────────────
function LevelPill({ level }: { level: Level }) {
  const cfg = LEVEL_CONFIG[level] ?? FALLBACK_LEVEL;
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold ${cfg.bg} ${cfg.color}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

function CourseCard({
  course, enrolled, paid, requested, role, onRequest, onClick,
}: {
  course: Course;
  enrolled: boolean;
  paid: boolean;
  requested: boolean;
  role: UserRole;
  onRequest: () => void;
  onClick: () => void;
}) {
  const price = ((course.price_cents ?? 0) / 100).toFixed(2);
  const isLocked = role === "child" && !paid;

  return (
    <button
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border-2 border-transparent bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-emerald-100 hover:shadow-lg"
    >
      <div className={`relative flex h-32 items-center justify-center bg-gradient-to-br ${course.bg ?? "from-slate-50 to-slate-100"}`}>
        <span className="text-6xl">{course.emoji ?? "📚"}</span>
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-t-2xl">
            <span className="text-3xl">🔒</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <LevelPill level={course.level} />
          {paid && <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">✅ Unlocked</span>}
          {role === "child" && !paid && requested && <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">⏳ Requested</span>}
          {role === "parent" && <span className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">Preview</span>}
        </div>
        <h3 className="font-display mt-3 text-lg font-bold text-emerald-900">{course.title}</h3>
        <p className="mt-1.5 flex-1 text-sm font-semibold leading-relaxed text-slate-500">{course.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {course.age_min && <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">Ages {course.age_min}–{course.age_max}</span>}
          {course.lesson_count && <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{course.lesson_count} lessons</span>}
          {(course.price_cents ?? 0) > 0
            ? <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">${price}</span>
            : <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Free</span>}
        </div>

        {/* Child: request button if not paid */}
        {role === "child" && !paid && (
          <button
            onClick={(e) => { e.stopPropagation(); onRequest(); }}
            disabled={requested}
            className={`mt-4 w-full rounded-xl py-2.5 text-sm font-bold transition ${
              requested
                ? "bg-amber-100 text-amber-600 cursor-default"
                : "bg-violet-600 text-white hover:bg-violet-700"
            }`}
          >
            {requested ? "⏳ Request Sent" : "🙋 Request This Course"}
          </button>
        )}

        {/* Parent: view details */}
        {role === "parent" && (
          <div className="mt-4 text-sm font-bold text-violet-600 group-hover:text-violet-800">Preview course →</div>
        )}

        {/* Child: paid */}
        {role === "child" && paid && (
          <div className="mt-4 text-sm font-bold text-emerald-600 group-hover:text-emerald-800">
            {enrolled ? "Continue learning →" : "Start course →"}
          </div>
        )}
      </div>
    </button>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function CoursesPage() {
  const supabase = supabaseBrowser();
  const router   = useRouter();

  const [courses, setCourses]         = useState<Course[]>([]);
  const [loading, setLoading]         = useState(true);
  const [category, setCategory]       = useState<Category>("all");
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [paidIds, setPaidIds]         = useState<Set<string>>(new Set());
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [childId, setChildId]         = useState<string | null>(null);
  const [isLinked, setIsLinked]       = useState(false);
  const [role, setRole]               = useState<UserRole>("unknown");
  const [requestMsg, setRequestMsg]   = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
    detectUserAndLoad();
  }, []);

  async function loadCourses() {
    setLoading(true);
    const { data, error } = await supabase
      .from("courses").select("*").eq("is_published", true).order("created_at", { ascending: true });
    if (error || !data || data.length === 0) {
      setCourses(FALLBACK_COURSES);
    } else {
      setCourses(data as Course[]);
    }
    setLoading(false);
  }

  async function detectUserAndLoad() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if parent
    const { data: parentRow } = await supabase
      .from("parents").select("id").eq("user_id", user.id).maybeSingle();
    if (parentRow) {
      setRole("parent");
      return;
    }

    // Check if child
    const { data: childRow } = await supabase
      .from("child_profiles").select("id, parent_id").eq("user_id", user.id).maybeSingle();
    if (!childRow) return;

    setRole("child");
    setChildId(childRow.id);
    setIsLinked(!!childRow.parent_id);

    // Load enrollments + paid status
    const { data: enrollments } = await supabase
      .from("enrollments").select("course_id, paid").eq("child_id", childRow.id);
    const enrolled = new Set<string>();
    const paid     = new Set<string>();
    (enrollments ?? []).forEach((e: { course_id: string; paid: boolean }) => {
      enrolled.add(e.course_id);
      if (e.paid) paid.add(e.course_id);
    });
    setEnrolledIds(enrolled);
    setPaidIds(paid);

    // Load course requests
    const { data: requests } = await supabase
      .from("course_requests").select("course_id").eq("child_id", childRow.id).eq("status", "pending");
    setRequestedIds(new Set((requests ?? []).map((r: { course_id: string }) => r.course_id)));
  }

  async function handleRequest(courseId: string) {
    if (!childId) { router.push("/auth"); return; }

    if (!isLinked) {
      setRequestMsg("You need to be linked to a parent account before you can request courses. Ask your parent to link you!");
      setTimeout(() => setRequestMsg(null), 4000);
      return;
    }

    await supabase.from("course_requests").upsert(
      { child_id: childId, course_id: courseId, status: "pending", updated_at: new Date().toISOString() },
      { onConflict: "child_id,course_id" }
    );
    setRequestedIds(prev => new Set([...prev, courseId]));
    setRequestMsg("✅ Request sent! Your parent will be notified.");
    setTimeout(() => setRequestMsg(null), 3000);
  }

  function handleCourseClick(course: Course) {
    // Always navigate — course detail page handles the gate for unpaid kids
    router.push(`/courses/${course.id}`);
  }

  const filtered = courses.filter((c) => category === "all" || c.category === category);

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-emerald-100/50 blur-3xl" />
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">📚 Project-based courses</span>
        <h1 className="font-display mt-4 text-4xl font-bold text-emerald-900 md:text-5xl">Browse Courses</h1>
        <p className="mt-2 max-w-xl text-base font-semibold text-slate-500">
          From Seedling to Harvest — find the right level for you!
        </p>
        {role === "parent" && (
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <p className="text-sm font-semibold text-violet-700">You're browsing as a parent. Unlock courses from your dashboard.</p>
            <button
              onClick={() => router.push("/dashboard/parent")}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition"
            >
              Go to Parent Dashboard →
            </button>
          </div>
        )}
      </section>

      {/* Request message */}
      {requestMsg && (
        <div className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
          requestMsg.startsWith("✅") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          {requestMsg}
        </div>
      )}

      {/* Child not linked banner */}
      {role === "child" && !isLinked && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 flex items-start gap-4">
          <span className="text-3xl">🔗</span>
          <div>
            <p className="font-bold text-amber-900">You're not linked to a parent account yet</p>
            <p className="text-sm font-semibold text-amber-700 mt-0.5">Ask your parent to link your account so they can unlock courses for you.</p>
          </div>
        </div>
      )}

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((f) => (
          <button key={f.key} onClick={() => setCategory(f.key)}
            className={`rounded-xl border-2 px-4 py-2 text-sm font-bold transition ${
              category === f.key
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Course grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-4xl animate-bounce">📚</div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              enrolled={enrolledIds.has(course.id)}
              paid={paidIds.has(course.id)}
              requested={requestedIds.has(course.id)}
              role={role}
              onRequest={() => handleRequest(course.id)}
              onClick={() => handleCourseClick(course)}
            />
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