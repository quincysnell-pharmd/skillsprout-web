"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────
interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  video_url?: string;
  content?: string;
  xp_reward: number;
  quiz_question_count: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c?: string;
  option_d?: string;
  correct: "a" | "b" | "c" | "d";
  explanation?: string;
}

interface LessonFile {
  id: string;
  name: string;
  url: string;
  file_type: string;
  size_bytes: number;
}

interface LessonImage {
  id: string;
  url: string;
  caption?: string;
  order_index: number;
}

interface QuizAttempt {
  attempt_num: number;
  passed: boolean;
  must_rewatch: boolean;
}

type Phase = "lesson" | "quiz" | "results" | "must_rewatch";

// ── Shuffle helper ────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Markdown renderer (simple) ────────────────────────────────
function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="prose prose-sm max-w-none space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-bold text-slate-900 mt-4">{line.slice(3)}</h2>;
        if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold text-slate-900 mt-4">{line.slice(2)}</h1>;
        if (line.startsWith("- ")) return <li key={i} className="ml-4 text-sm font-semibold text-slate-700 list-disc">{line.slice(2)}</li>;
        if (/^\d+\. /.test(line)) return <li key={i} className="ml-4 text-sm font-semibold text-slate-700 list-decimal">{line.replace(/^\d+\. /, "")}</li>;
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <p key={i} className="text-sm font-semibold text-slate-700 leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

// ── Quiz component ────────────────────────────────────────────
function QuizView({
  questions, onComplete, attemptNum, maxAttempts,
}: {
  questions: QuizQuestion[];
  onComplete: (score: number, passed: boolean) => void;
  attemptNum: number;
  maxAttempts: number;
}) {
  const [current, setCurrent]   = useState(0);
  const [answers, setAnswers]   = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const q = questions[current];
  const options = (["a","b","c","d"] as const).filter((o) => q[`option_${o}` as keyof QuizQuestion]);
  const selected = answers[q.id];
  const isLast = current === questions.length - 1;

  function select(opt: string) {
    if (revealed) return;
    setAnswers((a) => ({ ...a, [q.id]: opt }));
  }

  function check() { setRevealed(true); }

  function next() {
    setRevealed(false);
    if (isLast) {
      // Calculate score
      const correct = questions.filter((q) => answers[q.id] === q.correct).length;
      const score = Math.round((correct / questions.length) * 100);
      onComplete(score, score >= 90);
    } else {
      setCurrent((c) => c + 1);
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-bold text-slate-500">
          <span>Question {current + 1} of {questions.length}</span>
          <span>Attempt {attemptNum} of {maxAttempts}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="rounded-2xl border-2 border-violet-100 bg-violet-50 p-6">
        <p className="font-bold text-slate-900 text-base leading-relaxed">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {options.map((opt) => {
          const val = q[`option_${opt}` as keyof QuizQuestion] as string;
          const isSelected = selected === opt;
          const isCorrect = q.correct === opt;

          let cls = "w-full flex items-center gap-3 rounded-2xl border-2 p-4 text-left font-bold text-sm transition-all ";
          if (!revealed) {
            cls += isSelected
              ? "border-violet-400 bg-violet-50 text-violet-800"
              : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50";
          } else {
            if (isCorrect) cls += "border-emerald-400 bg-emerald-50 text-emerald-800";
            else if (isSelected && !isCorrect) cls += "border-rose-400 bg-rose-50 text-rose-800";
            else cls += "border-slate-100 bg-white text-slate-400";
          }

          return (
            <button key={opt} onClick={() => select(opt)} disabled={revealed} className={cls}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 text-xs font-black ${
                revealed && isCorrect ? "border-emerald-400 bg-emerald-400 text-white"
                : revealed && isSelected && !isCorrect ? "border-rose-400 bg-rose-400 text-white"
                : isSelected ? "border-violet-400 bg-violet-400 text-white"
                : "border-slate-200 bg-white text-slate-500"
              }`}>
                {opt.toUpperCase()}
              </div>
              {val}
              {revealed && isCorrect && <span className="ml-auto text-emerald-500">✓</span>}
              {revealed && isSelected && !isCorrect && <span className="ml-auto text-rose-500">✗</span>}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {revealed && q.explanation && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-bold text-sky-800">💡 {q.explanation}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!revealed ? (
          <button onClick={check} disabled={!selected}
            className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-40 transition">
            Check Answer
          </button>
        ) : (
          <button onClick={next}
            className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700 transition">
            {isLast ? "See Results →" : "Next Question →"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function LessonPlayerPage() {
  const params   = useParams();
  const router   = useRouter();
  const supabase = supabaseBrowser();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  const [lesson, setLesson]       = useState<Lesson | null>(null);
  const [files, setFiles]         = useState<LessonFile[]>([]);
  const [images, setImages]       = useState<LessonImage[]>([]);
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [childId, setChildId]     = useState<string | null>(null);
  const [phase, setPhase]         = useState<Phase>("lesson");
  const [loading, setLoading]     = useState(true);
  const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(null);
  const [attemptNum, setAttemptNum] = useState(1);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null);
  const [awardedXP, setAwardedXP] = useState(false);

  useEffect(() => { if (lessonId) loadData(); }, [lessonId]);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth"); return; }

    const { data: childRow } = await supabase
      .from("child_profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (!childRow) { router.replace("/auth"); return; }
    setChildId(childRow.id);

    const [
      { data: lessonData },
      { data: fileData },
      { data: imageData },
      { data: questionData },
    ] = await Promise.all([
      supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle(),
      supabase.from("lesson_files").select("*").eq("lesson_id", lessonId),
      supabase.from("lesson_images").select("*").eq("lesson_id", lessonId).order("order_index"),
      supabase.from("quiz_questions").select("*").eq("lesson_id", lessonId),
    ]);

    const lessonObj = lessonData as Lesson;
    setLesson(lessonObj);
    setFiles((fileData as LessonFile[]) ?? []);
    setImages((imageData as LessonImage[]) ?? []);
    setAllQuestions((questionData as QuizQuestion[]) ?? []);

    // Load latest attempt
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("child_id", childRow.id)
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: false })
      .limit(1);

    const latest = attempts?.[0] as QuizAttempt | undefined;
    if (latest) {
      setLastAttempt(latest);
      if (latest.must_rewatch) setPhase("must_rewatch");
    }

    // Count attempts since last rewatch
    const { data: recentAttempts } = await supabase
      .from("quiz_attempts")
      .select("id")
      .eq("child_id", childRow.id)
      .eq("lesson_id", lessonId)
      .eq("must_rewatch", false);
    setAttemptNum((recentAttempts?.length ?? 0) + 1);

    // Load next lesson
    if (lessonObj) {
      const { data: nextData } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", lessonObj.course_id)
        .eq("is_published", true)
        .gt("order_index", lessonObj.order_index)
        .order("order_index")
        .limit(1)
        .maybeSingle();
      setNextLesson(nextData as Lesson ?? null);
    }

    setLoading(false);
  }

  function startQuiz() {
    if (!lesson) return;
    const count = lesson.quiz_question_count ?? 5;
    const picked = shuffle(allQuestions).slice(0, Math.min(count, allQuestions.length));
    setQuizQuestions(picked);
    setPhase("quiz");
  }

  async function handleQuizComplete(score: number, passed: boolean) {
    if (!childId || !lesson) return;
    setQuizScore(score);

    const attemptsUsed = attemptNum;
    const mustRewatch = !passed && attemptsUsed >= 3;

    // Save attempt
    await supabase.from("quiz_attempts").insert({
      child_id: childId,
      lesson_id: lessonId,
      score,
      passed,
      attempt_num: attemptsUsed,
      must_rewatch: mustRewatch,
    });

    if (passed) {
      // Mark lesson complete
      await supabase.from("lesson_progress").upsert({
        child_id: childId,
        lesson_id: lessonId,
        completed: true,
        quiz_score: score,
        completed_at: new Date().toISOString(),
      }, { onConflict: "child_id,lesson_id" });

      // Award XP
      if (!awardedXP) {
        const { data: childRow } = await supabase
          .from("child_profiles").select("xp").eq("id", childId).maybeSingle();
        if (childRow) {
          await supabase.from("child_profiles")
            .update({ xp: (childRow.xp ?? 0) + lesson.xp_reward })
            .eq("id", childId);
          setAwardedXP(true);
        }
      }

      // Update enrollment progress
      const { data: allLessons } = await supabase
        .from("lessons").select("id").eq("course_id", lesson.course_id).eq("is_published", true);
      const { data: completedLessons } = await supabase
        .from("lesson_progress").select("id").eq("child_id", childId).eq("completed", true)
        .in("lesson_id", (allLessons ?? []).map((l: { id: string }) => l.id));
      const pct = Math.round(((completedLessons?.length ?? 0) / (allLessons?.length ?? 1)) * 100);
      await supabase.from("enrollments")
        .update({ progress_pct: pct, updated_at: new Date().toISOString() })
        .eq("child_id", childId).eq("course_id", lesson.course_id);
    }

    setAttemptNum((n) => n + 1);
    setPhase("results");
  }

  function retryQuiz() {
    setAttemptNum((n) => n + 1);
    startQuiz();
  }

  function rewatchLesson() {
    setPhase("lesson");
    setAttemptNum(1);
  }

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-5xl animate-bounce">📖</div>
    </div>
  );

  if (!lesson) return (
    <div className="text-center py-20">
      <p className="font-bold text-slate-400">Lesson not found.</p>
      <button onClick={() => router.push(`/courses/${courseId}`)} className="mt-4 text-emerald-600 font-bold hover:underline">← Back to course</button>
    </div>
  );

  const attemptsLeft = 3 - (attemptNum - 1);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/courses/${courseId}`)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
          ← Back
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-black text-slate-900 truncate">{lesson.title}</h1>
          {lesson.description && <p className="text-xs font-semibold text-slate-400 mt-0.5">{lesson.description}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">⭐ {lesson.xp_reward} XP</span>
      </div>

      {/* ── MUST REWATCH ── */}
      {phase === "must_rewatch" && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-8 text-center space-y-4">
          <div className="text-5xl">🎬</div>
          <h2 className="font-display text-xl font-bold text-amber-900">Time to rewatch!</h2>
          <p className="text-sm font-semibold text-amber-700">You've used all 3 attempts. Watch the lesson again before trying the quiz!</p>
          <button onClick={rewatchLesson}
            className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-white hover:bg-amber-600 transition">
            Rewatch Lesson 🎬
          </button>
        </div>
      )}

      {/* ── LESSON CONTENT ── */}
      {phase === "lesson" && (
        <div className="space-y-5">
          {/* Video */}
          {lesson.video_url && (
            <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-black">
              {lesson.video_url.includes("youtube.com") || lesson.video_url.includes("youtu.be") ? (
                <iframe
                  src={lesson.video_url.replace("watch?v=", "embed/")}
                  className="w-full aspect-video"
                  allowFullScreen
                />
              ) : lesson.video_url.includes("vimeo.com") ? (
                <iframe
                  src={lesson.video_url.replace("vimeo.com/", "player.vimeo.com/video/")}
                  className="w-full aspect-video"
                  allowFullScreen
                />
              ) : (
                <video src={lesson.video_url} controls className="w-full aspect-video" />
              )}
            </div>
          )}

          {/* Written content */}
          {lesson.content && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-slate-900 mb-4">📝 Lesson Notes</h2>
              <SimpleMarkdown content={lesson.content} />
            </div>
          )}

          {/* Image gallery */}
          {images.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-slate-900 mb-4">🖼️ Images</h2>
              <div className="grid grid-cols-2 gap-3">
                {images.map((img) => (
                  <div key={img.id} className="space-y-1">
                    <img src={img.url} alt={img.caption ?? ""} className="w-full rounded-xl object-cover aspect-video border border-slate-100" />
                    {img.caption && <p className="text-xs font-semibold text-slate-400 text-center">{img.caption}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Downloadable files */}
          {files.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-slate-900 mb-4">📎 Downloads</h2>
              <div className="space-y-2">
                {files.map((f) => (
                  <a key={f.id} href={f.url} target="_blank"
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition">
                    <span className="text-2xl">{f.file_type === "pdf" ? "📄" : "📁"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">{f.name}</div>
                      <div className="text-xs font-semibold text-slate-400">{(f.size_bytes / 1024).toFixed(1)} KB</div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">Download ↓</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Start quiz button */}
          {allQuestions.length > 0 ? (
            <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-6 text-center space-y-3">
              <div className="text-4xl">⚡</div>
              <h2 className="font-display text-lg font-bold text-violet-900">Ready for the quiz?</h2>
              <p className="text-sm font-semibold text-violet-700">
                {lesson.quiz_question_count} random questions · 90% to pass · {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining
              </p>
              <button onClick={startQuiz}
                className="rounded-xl bg-violet-600 px-8 py-3 font-bold text-white hover:bg-violet-700 transition">
                Start Quiz ⚡
              </button>
            </div>
          ) : (
            // No quiz — mark complete directly
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
              <div className="text-4xl">✅</div>
              <h2 className="font-display text-lg font-bold text-emerald-900">You've finished this lesson!</h2>
              <button onClick={async () => {
                if (!childId) return;
                await supabase.from("lesson_progress").upsert({
                  child_id: childId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString(),
                }, { onConflict: "child_id,lesson_id" });
                if (nextLesson) router.push(`/courses/${courseId}/lessons/${nextLesson.id}`);
                else router.push(`/courses/${courseId}`);
              }} className="rounded-xl bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-700 transition">
                {nextLesson ? "Next Lesson →" : "Complete Course 🎉"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── QUIZ ── */}
      {phase === "quiz" && quizQuestions.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-6">⚡ Quiz Time!</h2>
          <QuizView
            questions={quizQuestions}
            onComplete={handleQuizComplete}
            attemptNum={attemptNum}
            maxAttempts={3}
          />
        </div>
      )}

      {/* ── RESULTS ── */}
      {phase === "results" && quizScore !== null && (
        <div className="space-y-5">
          {quizScore >= 90 ? (
            /* PASSED */
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-8 text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <h2 className="font-display text-2xl font-black text-emerald-900">You passed!</h2>
              <div className="text-4xl font-black text-emerald-600">{quizScore}%</div>
              <p className="text-sm font-semibold text-emerald-700">+{lesson.xp_reward} XP earned!</p>
              {nextLesson ? (
                <button onClick={() => router.push(`/courses/${courseId}/lessons/${nextLesson.id}`)}
                  className="rounded-xl bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-700 transition">
                  Next Lesson → {nextLesson.title}
                </button>
              ) : (
                <button onClick={() => router.push(`/courses/${courseId}`)}
                  className="rounded-xl bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-700 transition">
                  🏆 Complete Course!
                </button>
              )}
            </div>
          ) : (
            /* FAILED */
            <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-8 text-center space-y-4">
              <div className="text-5xl">{attemptsLeft > 1 ? "😅" : "😬"}</div>
              <h2 className="font-display text-xl font-bold text-rose-900">Not quite!</h2>
              <div className="text-3xl font-black text-rose-600">{quizScore}%</div>
              <p className="text-sm font-semibold text-rose-700">You need 90% to pass. {attemptsLeft > 1 ? `You have ${attemptsLeft - 1} attempt${attemptsLeft - 1 !== 1 ? "s" : ""} left!` : "You've used all 3 attempts — time to rewatch the lesson!"}</p>
              {attemptsLeft > 1 ? (
                <div className="flex justify-center gap-3">
                  <button onClick={retryQuiz}
                    className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-700 transition">
                    Try Again ⚡
                  </button>
                  <button onClick={() => setPhase("lesson")}
                    className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 hover:bg-slate-50 transition">
                    Review Lesson
                  </button>
                </div>
              ) : (
                <button onClick={rewatchLesson}
                  className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-white hover:bg-amber-600 transition">
                  Rewatch Lesson 🎬
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}