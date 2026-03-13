"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";

type ChallengeType = "quiz" | "reflection" | "action" | "video";

interface Challenge {
  id: string;
  scheduled_date: string;
  title: string;
  description?: string;
  type: ChallengeType;
  category: string;
  xp_reward: number;
  order_index: number;
  quiz_question?: string;
  quiz_options?: string[];
  quiz_correct_index?: number;
  reflection_prompt?: string;
  min_words?: number;
  action_instruction?: string;
  action_verification?: string;
  video_url?: string;
  video_prompt?: string;
}

const TYPE_CONFIG: Record<ChallengeType, { label: string; emoji: string; bg: string; border: string; text: string }> = {
  quiz:       { label: "Quiz",       emoji: "❓", bg: "bg-violet-50",  border: "border-violet-200", text: "text-violet-700" },
  reflection: { label: "Reflection", emoji: "💬", bg: "bg-sky-50",     border: "border-sky-200",    text: "text-sky-700"    },
  action:     { label: "Action",     emoji: "⚡", bg: "bg-amber-50",   border: "border-amber-200",  text: "text-amber-700"  },
  video:      { label: "Video",      emoji: "🎬", bg: "bg-rose-50",    border: "border-rose-200",   text: "text-rose-700"   },
};

// ── Quiz Challenge ─────────────────────────────────────────────
function QuizChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (response: string) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const options = challenge.quiz_options ?? [];
  const correct = challenge.quiz_correct_index ?? 0;
  const isCorrect = selected === correct;

  function submit() {
    if (selected === null) return;
    setSubmitted(true);
    setTimeout(() => onComplete(String(selected)), 1200);
  }

  return (
    <div className="space-y-4">
      <p className="font-bold text-slate-800">{challenge.quiz_question}</p>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <button key={i} onClick={() => { if (!submitted) setSelected(i); }}
            className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition ${
              submitted
                ? i === correct ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                  : i === selected && i !== correct ? "border-rose-300 bg-rose-50 text-rose-700"
                  : "border-slate-100 bg-slate-50 text-slate-400"
                : selected === i ? "border-violet-400 bg-violet-50 text-violet-800"
                : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50"
            }`}>
            <span className="font-black mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
          </button>
        ))}
      </div>
      {submitted ? (
        <div className={`rounded-xl px-4 py-3 text-sm font-bold ${isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
          {isCorrect ? "🎉 Correct! Great job!" : `❌ Not quite — the answer was: ${options[correct]}`}
        </div>
      ) : (
        <button onClick={submit} disabled={selected === null}
          className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 transition disabled:opacity-40">
          Submit Answer
        </button>
      )}
    </div>
  );
}

// ── Reflection Challenge ───────────────────────────────────────
function ReflectionChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (response: string) => void }) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const minWords = challenge.min_words ?? 20;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const meetsMin = wordCount >= minWords;

  function submit() {
    if (!meetsMin) return;
    setSubmitted(true);
    setTimeout(() => onComplete(text), 800);
  }

  return (
    <div className="space-y-4">
      <p className="font-bold text-slate-800">{challenge.reflection_prompt}</p>
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={submitted}
          rows={5}
          placeholder="Write your thoughts here..."
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 focus:border-sky-400 focus:outline-none resize-none transition"
        />
        <div className="flex justify-between text-xs font-bold">
          <span className={wordCount >= minWords ? "text-emerald-600" : "text-slate-400"}>
            {wordCount} / {minWords} words minimum
          </span>
          {meetsMin && <span className="text-emerald-600">✓ Ready to submit!</span>}
        </div>
      </div>
      {submitted ? (
        <div className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-800">
          🌱 Reflection saved! Great thinking!
        </div>
      ) : (
        <button onClick={submit} disabled={!meetsMin}
          className="w-full rounded-xl bg-sky-600 py-3 text-sm font-bold text-white hover:bg-sky-700 transition disabled:opacity-40">
          Submit Reflection
        </button>
      )}
    </div>
  );
}

// ── Action Challenge ───────────────────────────────────────────
function ActionChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (response: string) => void }) {
  const [checked, setChecked] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function submit() {
    if (!checked) return;
    setSubmitted(true);
    setTimeout(() => onComplete("completed"), 800);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
        <p className="font-bold text-amber-900 text-sm leading-relaxed">{challenge.action_instruction}</p>
      </div>
      {challenge.action_verification && (
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          Verification: {challenge.action_verification}
        </p>
      )}
      {submitted ? (
        <div className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-800">
          ⚡ Amazing — challenge complete!
        </div>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer rounded-xl border-2 border-slate-200 bg-white p-4 hover:border-amber-300 transition">
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
              className="h-5 w-5 rounded accent-amber-500" />
            <span className="text-sm font-bold text-slate-700">I completed this challenge!</span>
          </label>
          <button onClick={submit} disabled={!checked}
            className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600 transition disabled:opacity-40">
            Mark Complete ⚡
          </button>
        </div>
      )}
    </div>
  );
}

// ── Video Challenge ────────────────────────────────────────────
function VideoChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (response: string) => void }) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const canSubmit = text.trim().length > 10;

  function submit() {
    if (!canSubmit) return;
    setSubmitted(true);
    setTimeout(() => onComplete(text), 800);
  }

  const videoUrl = challenge.video_url ?? "";
  const embedUrl = videoUrl.includes("youtube.com/watch?v=")
    ? videoUrl.replace("watch?v=", "embed/")
    : videoUrl.includes("youtu.be/")
    ? videoUrl.replace("youtu.be/", "www.youtube.com/embed/")
    : videoUrl;

  return (
    <div className="space-y-4">
      {videoUrl && (
        <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-video">
          <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Challenge video" />
        </div>
      )}
      {challenge.video_prompt && (
        <>
          <p className="font-bold text-slate-800">{challenge.video_prompt}</p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={submitted}
            rows={4}
            placeholder="Write your response here..."
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 focus:border-rose-400 focus:outline-none resize-none transition"
          />
        </>
      )}
      {submitted ? (
        <div className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-800">
          🎬 Great response! Challenge complete!
        </div>
      ) : (
        <button onClick={submit} disabled={!canSubmit}
          className="w-full rounded-xl bg-rose-500 py-3 text-sm font-bold text-white hover:bg-rose-600 transition disabled:opacity-40">
          Submit Response
        </button>
      )}
    </div>
  );
}

// ── Challenge Card ─────────────────────────────────────────────
function ChallengeCard({ challenge, completed, childId, onComplete }: {
  challenge: Challenge;
  completed: boolean;
  childId: string;
  onComplete: (challengeId: string, xp: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_CONFIG[challenge.type];

  async function handleComplete(response: string) {
    const supabase = supabaseBrowser();
    await supabase.from("challenge_completions").insert({
      child_id: childId,
      challenge_id: challenge.id,
      response,
    });
    onComplete(challenge.id, challenge.xp_reward);
  }

  return (
    <div className={`rounded-2xl border-2 bg-white overflow-hidden transition ${completed ? "border-emerald-200" : cfg.border}`}>
      {/* Header */}
      <button onClick={() => !completed && setExpanded(e => !e)}
        className="w-full flex items-center gap-4 p-5 text-left">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 text-2xl ${cfg.bg} ${cfg.border}`}>
          {completed ? "✅" : cfg.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-slate-900">{challenge.title}</span>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.bg} ${cfg.border} ${cfg.text}`}>
              {cfg.label}
            </span>
            <span className="rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">
              ⭐ {challenge.xp_reward} XP
            </span>
          </div>
          {challenge.description && <p className="text-xs font-semibold text-slate-400 mt-0.5">{challenge.description}</p>}
        </div>
        {completed ? (
          <span className="shrink-0 text-sm font-black text-emerald-600">Done ✓</span>
        ) : (
          <span className="shrink-0 text-sm font-bold text-slate-400">{expanded ? "▲" : "▼"}</span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && !completed && (
        <div className={`border-t-2 ${cfg.border} ${cfg.bg} p-5`}>
          {challenge.type === "quiz" && <QuizChallenge challenge={challenge} onComplete={handleComplete} />}
          {challenge.type === "reflection" && <ReflectionChallenge challenge={challenge} onComplete={handleComplete} />}
          {challenge.type === "action" && <ActionChallenge challenge={challenge} onComplete={handleComplete} />}
          {challenge.type === "video" && <VideoChallenge challenge={challenge} onComplete={handleComplete} />}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function DailyChallengesPage() {
  const supabase = supabaseBrowser();
  const router   = useRouter();

  const [challenges, setChallenges]   = useState<Challenge[]>([]);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [childId, setChildId]         = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [totalXP, setTotalXP]         = useState(0);
  const [xpGained, setXpGained]       = useState(0);
  const [showXP, setShowXP]           = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth"); return; }

    const { data: childRow } = await supabase
      .from("child_profiles").select("id, xp").eq("user_id", user.id).maybeSingle();
    if (!childRow) { router.replace("/auth"); return; }
    setChildId(childRow.id);
    setTotalXP(childRow.xp ?? 0);

    const [{ data: todayChallenges }, { data: completionData }] = await Promise.all([
      supabase.from("daily_challenges").select("*")
        .eq("scheduled_date", today)
        .eq("is_published", true)
        .order("order_index"),
      supabase.from("challenge_completions").select("challenge_id").eq("child_id", childRow.id),
    ]);

    setChallenges((todayChallenges as Challenge[]) ?? []);
    setCompletions(new Set((completionData ?? []).map((c: { challenge_id: string }) => c.challenge_id)));
    setLoading(false);
  }

  async function handleComplete(challengeId: string, xp: number) {
    setCompletions(prev => new Set([...prev, challengeId]));
    // Award XP
    const newXP = totalXP + xp;
    setTotalXP(newXP);
    setXpGained(xp);
    setShowXP(true);
    setTimeout(() => setShowXP(false), 3000);
    if (childId) {
      await supabase.from("child_profiles").update({ xp: newXP }).eq("id", childId);
    }
  }

  const completedCount = challenges.filter(c => completions.has(c.id)).length;
  const allDone = challenges.length > 0 && completedCount === challenges.length;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      {/* XP toast */}
      {showXP && (
        <div className="fixed top-6 right-6 z-50 rounded-2xl bg-amber-500 px-5 py-3 shadow-lg animate-bounce">
          <p className="font-display text-lg font-black text-white">+{xpGained} XP! ⭐</p>
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 p-8 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="text-5xl mb-3">⚡</div>
        <h1 className="font-display text-3xl font-black">Daily Challenges</h1>
        <p className="mt-1 text-white/80 font-semibold text-sm">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{challenges.length} challenges today</span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{completedCount} completed</span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">⭐ {totalXP} total XP</span>
        </div>
        {challenges.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs font-bold text-white/80 mb-1.5">
              <span>Today's progress</span>
              <span>{Math.round((completedCount / challenges.length) * 100)}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all duration-700"
                style={{ width: `${(completedCount / challenges.length) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* All done banner */}
      {allDone && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6 text-center space-y-2">
          <div className="text-5xl">🏆</div>
          <h2 className="font-display text-xl font-black text-emerald-900">All challenges complete!</h2>
          <p className="text-sm font-semibold text-emerald-700">Amazing work — come back tomorrow for new challenges!</p>
        </div>
      )}

      {/* Challenges */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="text-4xl animate-bounce">⚡</div>
        </div>
      ) : challenges.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center space-y-3">
          <div className="text-5xl">📅</div>
          <h2 className="font-display text-xl font-bold text-slate-600">No challenges today</h2>
          <p className="text-sm font-semibold text-slate-400">Check back tomorrow — new challenges are added daily!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map(challenge => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              completed={completions.has(challenge.id)}
              childId={childId ?? ""}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      {/* Back to dashboard */}
      <button onClick={() => router.back()}
        className="w-full rounded-2xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition">
        ← Back to Dashboard
      </button>
    </div>
  );
}