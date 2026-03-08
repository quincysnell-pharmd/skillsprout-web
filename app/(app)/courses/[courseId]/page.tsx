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

export default function CourseOverviewPage() {
  const params   = useParams();
  const router   = useRouter();
  const supabase = supabaseBrowser();
  const courseId = params.courseId as string;

  const [course, setCourse]           = useState<Course | null>(null);
  const [lessons, setLessons]         = useState<Lesson[]>([]);
  const [progress, setProgress]       = useState<Map<string, LessonProgress>>(new Map());
  const [childId, setChildId]         = useState<string | null>(null);
  const [isLinked, setIsLinked]       = useState(false);
  const [enrollment, setEnrollment]   = useState<EnrollmentRow | null>(null);
  const [loading, setLoading]         = useState(true);

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
      const { data: childRow } = await supabase
        .from("child_profiles").select("id, parent_id").eq("user_id", user.id).maybeSingle();
      if (childRow) {
        setChildId(childRow.id);
        setIsLinked(!!childRow.parent_id);

        // Check enrollment (includes paid status)
        const { data: enrollRow } = await supabase
          .from("enrollments")
          .select("id, paid, progress_pct")
          .eq("child_id", childRow.id)
          .eq("course_id", courseId)
          .maybeSingle();
        setEnrollment(enrollRow as EnrollmentRow ?? null);

        // Load lesson progress
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

  function isLocked(lesson: Lesson, index: number): boolean {
    if (!enrollment?.paid) return true; // whole course locked if not paid
    if (index === 0) return false;
    const prev = lessons[index - 1];
    const prevProgress = progress.get(prev.id);
    return !prevProgress?.completed;
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

  const isPaid  = enrollment?.paid === true;
  const pct     = lessons.length > 0 ? Math.round((completedCount() / lessons.length) * 100) : 0;
  const totalXP = lessons.reduce((sum, l) => sum + (l.xp_reward ?? 0), 0);
  const price   = ((course.price_cents ?? 999) / 100).toFixed(2);

  // ── PAYMENT GATE ──────────────────────────────────────────────
  if (!isPaid) {
    // Not linked to a parent at all
    if (!isLinked) {
      return (
        <div className="max-w-md mx-auto mt-16 px-4 space-y-4">
          <button onClick={() => router.push("/courses")}
            className="text-sm font-bold text-slate-500 hover:text-emerald-600 transition">← Back to Courses</button>
          <div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-8 text-center space-y-5">
            <div className="text-6xl">🔗</div>
            <h2 className="font-display text-2xl font-black text-amber-900">Almost there!</h2>
            <p className="text-sm font-semibold text-amber-700 leading-relaxed">
              To unlock <span className="font-black">{course.title}</span>, you need to be linked to a parent account first.
            </p>
            <div className="rounded-2xl border border-amber-200 bg-white p-5 text-left space-y-2">
              <p className="text-xs font-black text-amber-800 uppercase tracking-wide">Ask your parent to:</p>
              <div className="space-y-1.5 text-sm font-semibold text-amber-700">
                <p>1. Create a SkillSprout parent account</p>
                <p>2. Link your profile to their account</p>
                <p>3. Unlock this course for you</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Linked but not paid
    return (
      <div className="max-w-md mx-auto mt-16 px-4 space-y-4">
        <button onClick={() => router.push("/courses")}
          className="text-sm font-bold text-slate-500 hover:text-emerald-600 transition">← Back to Courses</button>
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${course.bg ?? "from-emerald-400 to-teal-600"} p-8 text-white text-center space-y-3 shadow-lg`}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="text-6xl">{course.emoji ?? "📚"}</div>
          <h2 className="font-display text-2xl font-black">{course.title}</h2>
          {course.description && <p className="text-white/80 text-sm font-semibold">{course.description}</p>}
          <div className="flex justify-center flex-wrap gap-2 mt-2">
            {course.level && <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold capitalize">{course.level}</span>}
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{lessons.length} lessons</span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">⭐ {totalXP} XP total</span>
          </div>
        </div>
        <div className="rounded-3xl border-2 border-violet-300 bg-violet-50 p-8 text-center space-y-5">
          <div className="text-5xl">🔒</div>
          <h3 className="font-display text-xl font-black text-violet-900">Course Locked</h3>
          <div className="rounded-2xl border border-violet-200 bg-white px-6 py-4 inline-block">
            <span className="text-3xl font-black text-violet-800">${price}</span>
            <span className="text-sm font-bold text-violet-500 ml-1">one-time</span>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-white p-5 text-left space-y-2">
            <p className="text-xs font-black text-violet-800 uppercase tracking-wide">Ask your parent to:</p>
            <div className="space-y-1.5 text-sm font-semibold text-violet-700">
              <p>1. Sign in to their SkillSprout account</p>
              <p>2. Go to their Parent Dashboard → Courses tab</p>
              <p>3. Click "Unlock" next to <span className="font-black">{course.title}</span></p>
            </div>
          </div>
          <p className="text-xs font-semibold text-violet-400">Your progress will be saved once unlocked 🌱</p>
        </div>
      </div>
    );
  }

  // ── FULL COURSE VIEW (paid) ───────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      {/* Back */}
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
            const locked = isLocked(lesson, i);
            const status = getStatus(lesson);
            const p = progress.get(lesson.id);

            return (
              <button
                key={lesson.id}
                onClick={() => {
                  if (locked) return;
                  router.push(`/courses/${courseId}/lessons/${lesson.id}`);
                }}
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

                {!locked && status !== "completed" && (
                  <div className="shrink-0 text-emerald-600 font-bold text-sm">Start →</div>
                )}
                {status === "completed" && (
                  <div className="shrink-0 text-xs font-bold text-emerald-600">Review →</div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}