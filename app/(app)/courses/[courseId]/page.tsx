"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";

interface Course {
  id: string;
  title: string;
  emoji?: string;
  description?: string;
  category?: string;
  level?: string;
  bg?: string;
  price_cents: number;
  stripe_price_id?: string;
  topics?: string[];
  prerequisites?: string[];
  final_project?: string;
  age_min?: number;
  age_max?: number;
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  xp_reward: number;
  is_published: boolean;
  video_url?: string;
  content?: string;
  quiz_question_count?: number;
}

interface LessonProgress {
  lesson_id: string;
  completed: boolean;
  quiz_score?: number;
}

interface EnrollmentRow {
  id?: string;
  paid: boolean;
  progress_pct: number;
}

type UserRole = "child" | "parent" | "unknown";

export default function CourseOverviewPage() {
  const params   = useParams();
  const router   = useRouter();
  const supabase = supabaseBrowser();
  const courseId = params.courseId as string;

  const [course, setCourse]         = useState<Course | null>(null);
  const [lessons, setLessons]       = useState<Lesson[]>([]);
  const [progress, setProgress]     = useState<Map<string, LessonProgress>>(new Map());
  const [childId, setChildId]       = useState<string | null>(null);
  const [parentId, setParentId]     = useState<string | null>(null);
  const [isLinked, setIsLinked]     = useState(false);
  const [role, setRole]             = useState<UserRole>("unknown");
  const [enrollment, setEnrollment] = useState<EnrollmentRow | null>(null);
  const [loading, setLoading]       = useState(true);
  const [unlocking, setUnlocking]   = useState(false);
  const [children, setChildren]     = useState<{ id: string; display_name: string }[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");

  useEffect(() => { if (courseId) loadData(); }, [courseId]);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const [{ data: courseData }, { data: lessonData }] = await Promise.all([
      supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
      supabase.from("lessons").select("*").eq("course_id", courseId).eq("is_published", true).order("order_index"),
    ]);

    setCourse(courseData as Course);
    setLessons((lessonData as Lesson[]) ?? []);

    if (user) {
      // Check if parent
      const { data: parentRow } = await supabase
        .from("parents").select("id").eq("user_id", user.id).maybeSingle();
      if (parentRow) {
        setRole("parent");
        setParentId(parentRow.id);
        // Load parent's children
        const { data: childRows } = await supabase
          .from("child_profiles").select("id, display_name").eq("parent_id", parentRow.id);
        const kids = (childRows ?? []) as { id: string; display_name: string }[];
        setChildren(kids);
        if (kids.length === 1) setSelectedChild(kids[0].id);
        setLoading(false);
        return;
      }

      // Check if child
      const { data: childRow } = await supabase
        .from("child_profiles").select("id, parent_id").eq("user_id", user.id).maybeSingle();
      if (childRow) {
        setRole("child");
        setChildId(childRow.id);
        setIsLinked(!!childRow.parent_id);

        const { data: enrollRow } = await supabase
          .from("enrollments")
          .select("id, paid, progress_pct")
          .eq("child_id", childRow.id)
          .eq("course_id", courseId)
          .maybeSingle();
        setEnrollment(enrollRow as EnrollmentRow ?? null);

        const { data: progressData } = await supabase
          .from("lesson_progress").select("*").eq("child_id", childRow.id)
          .in("lesson_id", (lessonData ?? []).map((l: Lesson) => l.id));

        const map = new Map<string, LessonProgress>();
        (progressData ?? []).forEach((p: LessonProgress) => map.set(p.lesson_id, p));
        setProgress(map);
      }
    }
    setLoading(false);
  }

  async function handleParentUnlock() {
    if (!course || !parentId) return;
    const targetChild = selectedChild || (children[0]?.id ?? null);
    if (!targetChild && children.length > 0) {
      alert("Please select a child to unlock this course for.");
      return;
    }
    setUnlocking(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, childId: targetChild, parentId }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { alert("Error: " + (data.error ?? "Something went wrong. Please try again.")); }
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : "Something went wrong."));
    }
    setUnlocking(false);
  }

  function isLessonLocked(lesson: Lesson, index: number): boolean {
    if (!enrollment?.paid) return true;
    if (index === 0) return false;
    const prev = lessons[index - 1];
    return !progress.get(prev.id)?.completed;
  }

  function getStatus(lesson: Lesson) {
    const p = progress.get(lesson.id);
    if (!p) return "not_started";
    if (p.completed) return "completed";
    return "in_progress";
  }

  function completedCount() {
    return lessons.filter((l) => progress.get(l.id)?.completed).length;
  }

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-5xl animate-bounce">📚</div>
    </div>
  );

  if (!course) return (
    <div className="text-center py-20">
      <p className="font-bold text-slate-400">Course not found.</p>
      <button onClick={() => router.push("/courses")} className="mt-4 text-emerald-600 font-bold hover:underline">← Back to courses</button>
    </div>
  );

  const isPaid    = role === "child" && enrollment?.paid === true;
  const pct       = lessons.length > 0 ? Math.round((completedCount() / lessons.length) * 100) : 0;
  const totalXP   = lessons.reduce((sum, l) => sum + (l.xp_reward ?? 0), 0);
  const price     = ((course.price_cents ?? 999) / 100).toFixed(2);
  const isFree    = (course.price_cents ?? 0) === 0;

  // ── PREVIEW VIEW (parents + unpaid/unlinked kids) ─────────────
  if (!isPaid) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
        <button onClick={() => router.push("/courses")}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition">
          ← Back to Courses
        </button>

        {/* Hero */}
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${course.bg ?? "from-emerald-400 to-teal-600"} p-8 text-white shadow-lg`}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="text-6xl mb-4">{course.emoji ?? "📚"}</div>
          <h1 className="font-display text-3xl font-black">{course.title}</h1>
          {course.description && <p className="mt-2 text-white/80 font-semibold text-sm max-w-md">{course.description}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {course.category && <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold capitalize">{course.category}</span>}
            {course.level && <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold capitalize">{course.level}</span>}
            {course.age_min && <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">Ages {course.age_min}–{course.age_max}</span>}
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{lessons.length} lessons</span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">⭐ {totalXP} XP to earn</span>
          </div>
        </div>

        {/* What you'll learn */}
        {course.topics && course.topics.length > 0 && (
          <div className="rounded-2xl border-2 border-emerald-100 bg-white p-6 space-y-3">
            <h2 className="font-display text-lg font-black text-emerald-900">✅ What you'll learn</h2>
            <ul className="space-y-2">
              {course.topics.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                  <span className="text-emerald-500 mt-0.5">•</span> {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Good to know before starting */}
        {course.prerequisites && course.prerequisites.length > 0 && (
          <div className="rounded-2xl border-2 border-amber-100 bg-amber-50 p-6 space-y-3">
            <h2 className="font-display text-lg font-black text-amber-900">🌱 Good to know before starting</h2>
            <ul className="space-y-2">
              {course.prerequisites.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm font-semibold text-amber-800">
                  <span className="mt-0.5">→</span> {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Final project */}
        {course.final_project && (
          <div className="rounded-2xl border-2 border-violet-100 bg-violet-50 p-6">
            <h2 className="font-display text-lg font-black text-violet-900">🏆 Final Project</h2>
            <p className="mt-2 text-sm font-semibold text-violet-700">{course.final_project}</p>
          </div>
        )}

        {/* Lesson list (titles only, all locked) */}
        <div className="space-y-3">
          <h2 className="font-display text-xl font-bold text-slate-900">Lessons in this course</h2>
          {lessons.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
              <p className="font-bold text-slate-400">Lessons coming soon!</p>
            </div>
          ) : (
            lessons.map((lesson, i) => (
              <div key={lesson.id}
                className="flex items-center gap-4 rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 opacity-75">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-400 font-black text-sm">
                  🔒
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-600">Lesson {i + 1}: {lesson.title}</div>
                  {lesson.description && <div className="text-xs font-semibold text-slate-400 mt-0.5 truncate">{lesson.description}</div>}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-amber-500">⭐ {lesson.xp_reward} XP</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Unlock / gate section */}
        {role === "parent" ? (
          <div className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-8 space-y-5">
            <div className="text-center space-y-1">
              <div className="text-4xl">🔓</div>
              <h3 className="font-display text-xl font-black text-emerald-900">Unlock for your child</h3>
              {isFree
                ? <p className="text-sm font-semibold text-emerald-700">This course is free!</p>
                : <div className="inline-flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black text-emerald-800">${price}</span>
                    <span className="text-sm font-bold text-emerald-500">one-time</span>
                  </div>
              }
            </div>

            {children.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center space-y-3">
                <p className="text-sm font-bold text-amber-800">You don't have any children linked yet.</p>
                <button onClick={() => router.push("/dashboard/parent")}
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition">
                  Go to Dashboard to Link a Child →
                </button>
              </div>
            ) : (
              <>
                {children.length > 1 && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-emerald-800">Unlock for:</label>
                    <select
                      value={selectedChild}
                      onChange={(e) => setSelectedChild(e.target.value)}
                      className="w-full rounded-xl border-2 border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 focus:border-emerald-400 focus:outline-none"
                    >
                      <option value="">Select a child...</option>
                      {children.map((c) => (
                        <option key={c.id} value={c.id}>{c.display_name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {children.length === 1 && (
                  <p className="text-center text-sm font-semibold text-emerald-700">
                    Unlocking for <span className="font-black">{children[0].display_name}</span>
                  </p>
                )}
                <button
                  onClick={handleParentUnlock}
                  disabled={unlocking || (children.length > 1 && !selectedChild)}
                  className="w-full rounded-2xl bg-emerald-600 py-4 text-base font-black text-white hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {unlocking ? "Redirecting to checkout..." : isFree ? "Unlock Free Course 🎉" : `Unlock for $${price} →`}
                </button>
                <p className="text-center text-xs font-semibold text-slate-400">Secure payment via Stripe</p>
              </>
            )}
          </div>
        ) : role === "child" && !isLinked ? (
          <div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-8 text-center space-y-4">
            <div className="text-5xl">🔗</div>
            <h3 className="font-display text-xl font-black text-amber-900">Link a parent account first</h3>
            <p className="text-sm font-semibold text-amber-700 leading-relaxed">
              Ask your parent to create a SkillSprout account and link you so they can unlock courses.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-violet-200 bg-violet-50 p-8 text-center space-y-4">
            <div className="text-5xl">🔒</div>
            <h3 className="font-display text-xl font-black text-violet-900">Ask your parent to unlock this</h3>
            <div className="rounded-2xl border border-violet-200 bg-white px-6 py-3 inline-block">
              <span className="text-2xl font-black text-violet-800">${price}</span>
              <span className="text-sm font-bold text-violet-500 ml-1">one-time</span>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-white p-4 text-left space-y-1.5">
              <p className="text-xs font-black text-violet-700 uppercase tracking-wide">Tell your parent to:</p>
              <p className="text-sm font-semibold text-violet-600">1. Sign in to their SkillSprout account</p>
              <p className="text-sm font-semibold text-violet-600">2. Go to this course page</p>
              <p className="text-sm font-semibold text-violet-600">3. Click "Unlock" and pay once</p>
            </div>
            <p className="text-xs font-semibold text-slate-400">Your progress will be saved once unlocked 🌱</p>
          </div>
        )}
      </div>
    );
  }

  // ── FULL COURSE VIEW (paid child only) ────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      <button onClick={() => router.push("/courses")}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition">
        ← Back to Courses
      </button>

      {/* Course hero */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${course.bg ?? "from-emerald-400 to-teal-600"} p-8 text-white shadow-lg`}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="text-6xl mb-4">{course.emoji ?? "📚"}</div>
        <h1 className="font-display text-3xl font-black">{course.title}</h1>
        {course.description && <p className="mt-2 text-white/80 font-semibold text-sm max-w-md">{course.description}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {course.category && <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold capitalize">{course.category}</span>}
          {course.level && <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold capitalize">{course.level}</span>}
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{lessons.length} lessons</span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">⭐ {totalXP} XP total</span>
        </div>

        {lessons.length > 0 && (
          <div className="mt-5">
            <div className="flex justify-between text-xs font-bold text-white/80 mb-1.5">
              <span>{completedCount()} of {lessons.length} lessons complete</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Lessons list */}
      <div className="space-y-3">
        <h2 className="font-display text-xl font-bold text-slate-900">Lessons</h2>
        {lessons.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center">
            <div className="text-4xl mb-3">🔜</div>
            <p className="font-bold text-slate-400">Lessons coming soon!</p>
          </div>
        ) : (
          lessons.map((lesson, i) => {
            const locked = isLessonLocked(lesson, i);
            const status = getStatus(lesson);
            const p = progress.get(lesson.id);

            return (
              <button
                key={lesson.id}
                onClick={() => { if (!locked) router.push(`/courses/${courseId}/lessons/${lesson.id}`); }}
                disabled={locked}
                className={`w-full flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                  locked
                    ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                    : status === "completed"
                    ? "border-emerald-200 bg-emerald-50 hover:shadow-md hover:-translate-y-0.5"
                    : "border-slate-200 bg-white hover:border-emerald-200 hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${
                  locked ? "bg-slate-200 text-slate-400"
                  : status === "completed" ? "bg-emerald-500 text-white"
                  : "bg-violet-100 text-violet-700"
                }`}>
                  {locked ? "🔒" : status === "completed" ? "✓" : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900">{lesson.title}</div>
                  {lesson.description && <div className="text-xs font-semibold text-slate-400 mt-0.5 truncate">{lesson.description}</div>}
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {lesson.video_url && <span className="text-xs font-semibold text-slate-500">🎬 Video</span>}
                    {lesson.content && <span className="text-xs font-semibold text-slate-500">📝 Reading</span>}
                    {(lesson.quiz_question_count ?? 0) > 0 && <span className="text-xs font-semibold text-slate-500">⚡ {lesson.quiz_question_count}-question quiz</span>}
                    <span className="text-xs font-bold text-amber-600">⭐ {lesson.xp_reward} XP</span>
                    {status === "completed" && p?.quiz_score !== undefined && (
                      <span className="text-xs font-bold text-emerald-600">Quiz: {p.quiz_score}%</span>
                    )}
                  </div>
                </div>
                {!locked && status !== "completed" && <div className="shrink-0 text-emerald-600 font-bold text-sm">Start →</div>}
                {status === "completed" && <div className="shrink-0 text-xs font-bold text-emerald-600">Review →</div>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}