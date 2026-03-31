"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";
import { AddToPortfolioForm, PortfolioAddedBanner } from "@/components/portfolio/AddToPortfolioForm";
import { CommunityPostForm, PostSubmittedBanner } from "@/components/community/CommunityPostForm";

// ── Types ─────────────────────────────────────────────────────
type StepType = "text"|"video"|"pdf"|"image"|"audio"|"quiz"|"poll"|"matching"|"checklist"|"reflection"|"interactive"|"portfolio"|"journal"|"table"|"worksheet";

interface Step {
  id: string;
  order_index: number;
  type: StepType;
  title?: string;
  content?: string;
  video_url?: string;
  pdf_url?: string;
  image_url?: string;
  audio_url?: string;
  image_caption?: string;
}

interface QuizQuestion {
  id: string; question: string;
  option_a: string; option_b: string; option_c?: string; option_d?: string;
  correct: "a"|"b"|"c"|"d"; explanation?: string;
}

interface PollOption { id: string; label: string; order_index: number; vote_count: number; }
interface ChecklistItem { id: string; label: string; order_index: number; }
interface MatchingPair { id: string; left_item: string; right_item: string; order_index: number; }

interface LessonResource {
  id: string; title: string; type: string;
  url?: string; note_content?: string;
}

interface LessonNote {
  id?: string;
  child_id: string;
  lesson_id: string;
  content: string;
}

interface CourseLessonWithNotes {
  id: string;
  title: string;
  order_index: number;
  notes: string;
  journalEntries: { prompt: string; response: string; step_id: string }[];
}

interface Lesson {
  id: string; course_id: string; title: string;
  description?: string; xp_reward: number; quiz_question_count: number;
  video_url?: string; content?: string; order_index: number;
}

// ── Fallback content renderer (no steps) ─────────────────────
function LessonFallbackView({ lesson, nextLesson, onComplete }: {
  lesson: Lesson;
  nextLesson: { id: string; title: string } | null;
  onComplete: () => void;
}) {
  return (
    <div className="space-y-5">
      {lesson.video_url && (
        <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-black">
          {lesson.video_url.includes("youtube") || lesson.video_url.includes("youtu.be")
            ? <iframe src={lesson.video_url.replace("watch?v=","embed/")} className="w-full aspect-video" allowFullScreen/>
            : lesson.video_url.includes("vimeo")
            ? <iframe src={lesson.video_url.replace("vimeo.com/","player.vimeo.com/video/")} className="w-full aspect-video" allowFullScreen/>
            : <video src={lesson.video_url} controls className="w-full aspect-video"/>}
        </div>
      )}
      {lesson.content && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-4">📝 Lesson Notes</h2>
          <div className="prose prose-sm max-w-none space-y-2">
            {lesson.content.split("\n").map((line, i) => {
              if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-bold text-slate-900 mt-4">{line.slice(3)}</h2>;
              if (line.startsWith("# "))  return <h1 key={i} className="text-xl font-bold text-slate-900 mt-4">{line.slice(2)}</h1>;
              if (line.startsWith("- "))  return <li key={i} className="ml-4 text-sm font-semibold text-slate-700 list-disc">{line.slice(2)}</li>;
              if (line.trim() === "")     return <div key={i} className="h-2"/>;
              return <p key={i} className="text-sm font-semibold text-slate-700 leading-relaxed">{line}</p>;
            })}
          </div>
        </div>
      )}
      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
        <div className="text-4xl">✅</div>
        <h2 className="font-display text-lg font-bold text-emerald-900">You've finished this lesson!</h2>
        <button onClick={onComplete} className="rounded-xl bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-700 transition">
          {nextLesson ? `Next Lesson → ${nextLesson.title}` : "Complete Course 🎉"}
        </button>
      </div>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a;
}

// ── Markdown renderer ─────────────────────────────────────────
function SimpleMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none space-y-2">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-bold text-slate-900 mt-4">{line.slice(3)}</h2>;
        if (line.startsWith("# "))  return <h1 key={i} className="text-xl font-bold text-slate-900 mt-4">{line.slice(2)}</h1>;
        if (line.startsWith("- "))  return <li key={i} className="ml-4 text-sm font-semibold text-slate-700 list-disc">{line.slice(2)}</li>;
        if (/^\d+\. /.test(line))   return <li key={i} className="ml-4 text-sm font-semibold text-slate-700 list-decimal">{line.replace(/^\d+\. /,"")}</li>;
        if (line.trim()==="")       return <div key={i} className="h-2"/>;
        return <p key={i} className="text-sm font-semibold text-slate-700 leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

// ── Quiz Step ─────────────────────────────────────────────────
function QuizStep({ lessonId, childId, onPass }: { lessonId: string; childId: string; onPass: () => void; }) {
  const supabase = supabaseBrowser();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent]     = useState(0);
  const [answers, setAnswers]     = useState<Record<string, string>>({});
  const [revealed, setRevealed]   = useState(false);
  const [score, setScore]         = useState<number | null>(null);
  const [attempts, setAttempts]   = useState(0);
  const [loading, setLoading]     = useState(true);

  useEffect(() => { loadQuestions(); }, [lessonId]);

  async function loadQuestions() {
    const { data } = await supabase.from("quiz_questions").select("*").eq("lesson_id", lessonId);
    const { data: lesson } = await supabase.from("lessons").select("quiz_question_count").eq("id", lessonId).maybeSingle();
    const count = lesson?.quiz_question_count ?? 5;
    setQuestions(shuffle((data as QuizQuestion[]) ?? []).slice(0, count));
    setLoading(false);
  }

  function startOver() {
    setCurrent(0); setAnswers({}); setRevealed(false); setScore(null);
    loadQuestions();
  }

  async function finish() {
    const correct = questions.filter(q => answers[q.id] === q.correct).length;
    const s = Math.round((correct / questions.length) * 100);
    setScore(s);
    const passed = s >= 90;
    setAttempts(a => a + 1);
    await supabase.from("quiz_attempts").insert({ child_id: childId, lesson_id: lessonId, score: s, passed, attempt_num: attempts + 1, must_rewatch: false });
    if (passed) setTimeout(onPass, 1500);
  }

  if (loading) return <div className="text-center py-8"><div className="text-3xl animate-bounce">❓</div></div>;

  if (score !== null) {
    const passed = score >= 90;
    return (
      <div className={`rounded-2xl border-2 p-8 text-center space-y-4 ${passed ? "border-emerald-300 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
        <div className="text-5xl">{passed ? "🎉" : "😅"}</div>
        <div className={`text-4xl font-black ${passed ? "text-emerald-600" : "text-rose-600"}`}>{score}%</div>
        <p className={`text-sm font-bold ${passed ? "text-emerald-700" : "text-rose-700"}`}>
          {passed ? "You passed! Moving on..." : "You need 90% to pass. Try again!"}
        </p>
        {!passed && (
          <button onClick={startOver} className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition">Try Again ⚡</button>
        )}
      </div>
    );
  }

  const q = questions[current];
  if (!q) return null;
  const options = (["a","b","c","d"] as const).filter(o => q[`option_${o}` as keyof QuizQuestion]);
  const selected = answers[q.id];
  const isLast = current === questions.length - 1;

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold text-slate-500">
          <span>Question {current + 1} of {questions.length}</span>
          <span>Need 90% to pass</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
      </div>
      <div className="rounded-2xl border-2 border-violet-100 bg-violet-50 p-5">
        <p className="font-bold text-slate-900 leading-relaxed">{q.question}</p>
      </div>
      <div className="space-y-2.5">
        {options.map(opt => {
          const val = q[`option_${opt}` as keyof QuizQuestion] as string;
          const isSel = selected === opt; const isC = q.correct === opt;
          let cls = "w-full flex items-center gap-3 rounded-2xl border-2 p-4 text-left font-bold text-sm transition-all ";
          if (!revealed) cls += isSel ? "border-violet-400 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-700 hover:border-violet-200";
          else if (isC) cls += "border-emerald-400 bg-emerald-50 text-emerald-800";
          else if (isSel) cls += "border-rose-400 bg-rose-50 text-rose-800";
          else cls += "border-slate-100 bg-white text-slate-400";
          return (
            <button key={opt} onClick={() => { if (!revealed) setAnswers(a => ({ ...a, [q.id]: opt })); }} disabled={revealed} className={cls}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 text-xs font-black ${revealed&&isC?"border-emerald-400 bg-emerald-400 text-white":revealed&&isSel?"border-rose-400 bg-rose-400 text-white":isSel?"border-violet-400 bg-violet-400 text-white":"border-slate-200 bg-white text-slate-500"}`}>{opt.toUpperCase()}</div>
              {val}
              {revealed&&isC&&<span className="ml-auto">✓</span>}
              {revealed&&isSel&&!isC&&<span className="ml-auto">✗</span>}
            </button>
          );
        })}
      </div>
      {revealed && q.explanation && <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4"><p className="text-sm font-bold text-sky-800">💡 {q.explanation}</p></div>}
      <div className="flex gap-3">
        {!revealed
          ? <button onClick={() => setRevealed(true)} disabled={!selected} className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-40 transition">Check Answer</button>
          : <button onClick={() => { setRevealed(false); if (isLast) finish(); else setCurrent(c => c + 1); }}
              className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700 transition">{isLast ? "Finish Quiz →" : "Next →"}</button>}
      </div>
    </div>
  );
}

// ── Poll Step ─────────────────────────────────────────────────
function PollStep({ step, childId, onComplete }: { step: Step; childId: string; onComplete: () => void; }) {
  const supabase = supabaseBrowser();
  const [options, setOptions]   = useState<PollOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const { data: opts } = await supabase.from("lesson_step_poll_options").select("*").eq("step_id", step.id).order("order_index");
      setOptions((opts as PollOption[]) ?? []);
      const { data: prog } = await supabase.from("lesson_step_progress").select("poll_choice").eq("child_id", childId).eq("step_id", step.id).maybeSingle();
      if (prog?.poll_choice) { setSelected(prog.poll_choice); setSubmitted(true); }
      setLoading(false);
    }
    load();
  }, [step.id, childId]);

  async function submit() {
    if (!selected) return;
    await supabase.from("lesson_step_poll_options").update({ vote_count: (options.find(o => o.id === selected)?.vote_count ?? 0) + 1 }).eq("id", selected);
    await supabase.from("lesson_step_progress").upsert({ child_id: childId, step_id: step.id, completed: true, poll_choice: selected, updated_at: new Date().toISOString() }, { onConflict: "child_id,step_id" });
    const { data: updated } = await supabase.from("lesson_step_poll_options").select("*").eq("step_id", step.id).order("order_index");
    setOptions((updated as PollOption[]) ?? []);
    setSubmitted(true);
    setTimeout(onComplete, 500);
  }

  if (loading) return <div className="text-center py-8"><div className="text-3xl animate-bounce">📊</div></div>;

  const total = options.reduce((s, o) => s + (o.vote_count ?? 0), 0);

  return (
    <div className="space-y-4">
      {step.content && <p className="font-bold text-slate-900 text-lg">{step.content}</p>}
      <div className="space-y-3">
        {options.map(opt => {
          const pct = total > 0 ? Math.round((opt.vote_count / total) * 100) : 0;
          return (
            <button key={opt.id} onClick={() => !submitted && setSelected(opt.id)} disabled={submitted}
              className={`w-full rounded-2xl border-2 p-4 text-left transition-all relative overflow-hidden ${
                selected === opt.id ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-200"
              }`}>
              {submitted && <div className="absolute inset-0 bg-indigo-100 transition-all" style={{ width: `${pct}%`, opacity: 0.4 }} />}
              <div className="relative flex items-center justify-between">
                <span className="font-bold text-slate-800">{opt.label}</span>
                {submitted && <span className="text-sm font-black text-indigo-600">{pct}%</span>}
              </div>
              {submitted && <div className="relative text-xs font-semibold text-slate-400 mt-0.5">{opt.vote_count} vote{opt.vote_count !== 1 ? "s" : ""}</div>}
            </button>
          );
        })}
      </div>
      {!submitted ? (
        <button onClick={submit} disabled={!selected} className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-40 transition">Submit Vote 📊</button>
      ) : (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <p className="text-sm font-bold text-indigo-700">✅ Thanks for voting! Here's how everyone answered.</p>
        </div>
      )}
    </div>
  );
}

// ── Checklist Step ────────────────────────────────────────────
function ChecklistStep({ step, childId, onComplete }: { step: Step; childId: string; onComplete: () => void; }) {
  const supabase = supabaseBrowser();
  const [items, setItems]     = useState<ChecklistItem[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: its } = await supabase.from("lesson_step_checklist_items").select("*").eq("step_id", step.id).order("order_index");
      setItems((its as ChecklistItem[]) ?? []);
      const { data: prog } = await supabase.from("lesson_step_checklist_progress").select("item_id").eq("child_id", childId).eq("checked", true);
      setChecked(new Set((prog ?? []).map((p: { item_id: string }) => p.item_id)));
      setLoading(false);
    }
    load();
  }, [step.id, childId]);

  async function toggle(itemId: string) {
    const nowChecked = !checked.has(itemId);
    await supabase.from("lesson_step_checklist_progress").upsert({ child_id: childId, item_id: itemId, checked: nowChecked }, { onConflict: "child_id,item_id" });
    setChecked(prev => { const s = new Set(prev); nowChecked ? s.add(itemId) : s.delete(itemId); return s; });
  }

  const allDone = items.length > 0 && items.every(it => checked.has(it.id));
  useEffect(() => { if (allDone) onComplete(); }, [allDone]);

  if (loading) return <div className="text-center py-8"><div className="text-3xl animate-bounce">✅</div></div>;

  return (
    <div className="space-y-4">
      {step.content && <p className="font-bold text-slate-900">{step.content}</p>}
      <div className="space-y-2.5">
        {items.map(item => (
          <button key={item.id} onClick={() => toggle(item.id)}
            className={`w-full flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
              checked.has(item.id) ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-200"
            }`}>
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border-2 transition-all ${
              checked.has(item.id) ? "border-emerald-400 bg-emerald-400 text-white" : "border-slate-300 bg-white"
            }`}>
              {checked.has(item.id) && <span className="text-sm font-black">✓</span>}
            </div>
            <span className={`font-bold text-sm ${checked.has(item.id) ? "line-through text-slate-400" : "text-slate-800"}`}>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${(checked.size / items.length) * 100}%` }} />
        </div>
        <span className="text-sm font-black text-emerald-600">{checked.size}/{items.length}</span>
      </div>
      {allDone && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">🎉 All done! Great work!</div>}
    </div>
  );
}

// ── Matching Step ─────────────────────────────────────────────
function MatchingStep({ step, onComplete }: { step: Step; onComplete: () => void; }) {
  const supabase = supabaseBrowser();
  const [pairs, setPairs]       = useState<MatchingPair[]>([]);
  const [selected, setSelected] = useState<{ side: "left"|"right"; id: string; value: string } | null>(null);
  const [matched, setMatched]   = useState<Set<string>>(new Set());
  const [wrong, setWrong]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [leftItems, setLeftItems] = useState<{id:string;value:string}[]>([]);
  const [rightItems, setRightItems] = useState<{id:string;value:string}[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("lesson_step_matching_pairs").select("*").eq("step_id", step.id).order("order_index");
      const ps = (data as MatchingPair[]) ?? [];
      setPairs(ps);
      setLeftItems(shuffle(ps.map(p => ({ id: p.id, value: p.left_item }))));
      setRightItems(shuffle(ps.map(p => ({ id: p.id, value: p.right_item }))));
      setLoading(false);
    }
    load();
  }, [step.id]);

  function select(side: "left"|"right", id: string, value: string) {
    if (matched.has(id)) return;
    if (!selected) { setSelected({ side, id, value }); return; }
    if (selected.side === side) { setSelected({ side, id, value }); return; }
    const leftId = selected.side === "left" ? selected.id : id;
    const rightValue = selected.side === "right" ? selected.value : value;
    const leftPair = pairs.find(p => p.id === leftId);
    const isCorrect = leftPair && leftPair.right_item === rightValue;
    if (isCorrect) {
      setMatched(prev => new Set([...prev, leftId, (selected.side === "right" ? selected.id : id)]));
      setSelected(null);
      setWrong(null);
    } else {
      setWrong(id + selected.id);
      setTimeout(() => { setWrong(null); setSelected(null); }, 800);
    }
  }

  const allMatched = pairs.length > 0 && matched.size >= pairs.length * 2;
  useEffect(() => { if (allMatched) setTimeout(onComplete, 800); }, [allMatched]);

  if (loading) return <div className="text-center py-8"><div className="text-3xl animate-bounce">🔢</div></div>;

  return (
    <div className="space-y-4">
      {step.content && <p className="font-bold text-slate-900">{step.content}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-xs font-black text-slate-400 text-center">LEFT</p>
          {leftItems.map(item => (
            <button key={item.id} onClick={() => select("left", item.id, item.value)}
              className={`w-full rounded-2xl border-2 p-3 text-sm font-bold transition-all ${
                matched.has(item.id) ? "border-emerald-400 bg-emerald-50 text-emerald-700 opacity-60"
                : selected?.id === item.id && selected.side === "left" ? "border-teal-400 bg-teal-50 text-teal-800 scale-105"
                : wrong?.includes(item.id) ? "border-rose-400 bg-rose-50"
                : "border-slate-200 bg-white hover:border-teal-200 text-slate-800"
              }`}>{item.value}</button>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-black text-slate-400 text-center">RIGHT</p>
          {rightItems.map(item => (
            <button key={item.id} onClick={() => select("right", item.id, item.value)}
              className={`w-full rounded-2xl border-2 p-3 text-sm font-bold transition-all ${
                matched.has(item.id) ? "border-emerald-400 bg-emerald-50 text-emerald-700 opacity-60"
                : selected?.id === item.id && selected.side === "right" ? "border-teal-400 bg-teal-50 text-teal-800 scale-105"
                : wrong?.includes(item.id) ? "border-rose-400 bg-rose-50"
                : "border-slate-200 bg-white hover:border-teal-200 text-slate-800"
              }`}>{item.value}</button>
          ))}
        </div>
      </div>
      {allMatched && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">🎉 Perfect! All matched!</div>}
    </div>
  );
}

// ── Journal Step ─────────────────────────────────────────────
function JournalStep({ step, childId, lessonId, courseId, onComplete, isCompleted }: {
  step: Step; childId: string; lessonId: string; courseId: string; onComplete: () => void; isCompleted: boolean;
}) {
  const supabase = supabaseBrowser();
  const [text, setText]   = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("journal_entries")
      .select("response").eq("child_id", childId).eq("step_id", step.id).maybeSingle()
      .then(({ data }) => { if (data?.response) { setText(data.response); setSaved(true); } });
  }, [step.id, childId]);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    await supabase.from("journal_entries").upsert({
      child_id: childId, step_id: step.id, lesson_id: lessonId, course_id: courseId,
      prompt: step.content, response: text.trim(), updated_at: new Date().toISOString(),
    }, { onConflict: "child_id,step_id" });
    setSaved(true);
    setSaving(false);
    if (!isCompleted) onComplete();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 flex items-center gap-2">
        <span>✏️</span>
        <p className="text-xs font-bold text-yellow-800">Private journal — only you can see this. It will be saved to your journal.</p>
      </div>
      {step.content && <p className="text-sm font-bold text-slate-700">{step.content}</p>}
      <textarea rows={5} value={text} onChange={e => { setText(e.target.value); setSaved(false); }}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition resize-none"
        placeholder="Write your thoughts here..." />
      {saved ? (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-bold text-yellow-800">✅ Saved to your private journal!</div>
      ) : (
        <button onClick={save} disabled={!text.trim() || saving}
          className="rounded-xl bg-yellow-500 px-6 py-3 font-bold text-white hover:bg-yellow-600 disabled:opacity-40 transition">
          {saving ? "Saving..." : "Save to Journal ✏️"}
        </button>
      )}
    </div>
  );
}

// ── Reflection Step ───────────────────────────────────────────
function ReflectionStep({ step, childId, courseId, lessonId, onComplete }: {
  step: Step; childId: string; courseId: string; lessonId: string; onComplete: () => void;
}) {
  const supabase = supabaseBrowser();
  const [text, setText]         = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sharing, setSharing]   = useState(false);
  const [shared, setShared]     = useState(false);

  useEffect(() => {
    supabase.from("lesson_step_progress").select("reflection, completed").eq("child_id", childId).eq("step_id", step.id).maybeSingle()
      .then(({ data }) => { if (data?.reflection) { setText(data.reflection); setSubmitted(true); } });
  }, [step.id, childId]);

  async function submit() {
    await supabase.from("lesson_step_progress").upsert({ child_id: childId, step_id: step.id, completed: true, reflection: text.trim(), updated_at: new Date().toISOString() }, { onConflict: "child_id,step_id" });
    setSubmitted(true);
    setTimeout(onComplete, 500);
  }

  return (
    <div className="space-y-4">
      {step.content && <p className="font-bold text-slate-900 text-lg">{step.content}</p>}
      <textarea value={text} onChange={e => setText(e.target.value)} disabled={submitted} rows={5}
        placeholder="Write your thoughts here..."
        className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100 transition resize-none disabled:bg-slate-50 disabled:text-slate-500" />
      {!submitted ? (
        <button onClick={submit} disabled={!text.trim()}
          className="rounded-xl bg-pink-600 px-6 py-3 font-bold text-white hover:bg-pink-700 disabled:opacity-40 transition">
          Save Reflection 💬
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold text-pink-700">✅ Reflection saved to your profile!</div>
          {!shared && (
            <button onClick={() => setSharing(true)}
              className="rounded-xl border-2 border-pink-200 bg-white px-5 py-2.5 text-sm font-bold text-pink-600 hover:bg-pink-50 transition">
              🌱 Share with Community (optional)
            </button>
          )}
          {sharing && !shared && (
            <CommunityPostForm childId={childId} courseId={courseId} lessonId={lessonId}
              onClose={() => setSharing(false)}
              onSubmitted={() => { setSharing(false); setShared(true); }} />
          )}
          {shared && <div className="text-xs font-bold text-emerald-600">🌱 Shared to community feed (pending review)!</div>}
        </div>
      )}
    </div>
  );
}

// ── Worksheet Step ────────────────────────────────────────────
function WorksheetStep({ step, childId, lessonId, courseId, onComplete, isCompleted }: {
  step: Step; childId: string; lessonId: string; courseId: string; onComplete: () => void; isCompleted: boolean;
}) {
  const supabase = supabaseBrowser();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved data and send to iframe when it's ready
  useEffect(() => {
    async function loadSaved() {
      const { data } = await supabase.from("worksheet_responses")
        .select("response_data").eq("child_id", childId).eq("step_id", step.id).maybeSingle();
      if (data?.response_data) {
        // Wait for iframe to signal ready, then send data
        const sendData = () => {
          iframeRef.current?.contentWindow?.postMessage(
            { type: "LOAD_WORKSHEET_DATA", data: data.response_data }, "*"
          );
        };
        // Try immediately and also on a delay as fallback
        sendData();
        setTimeout(sendData, 1000);
        setTimeout(sendData, 2500);
      }
    }
    loadSaved();
  }, [step.id, childId]);

  // Listen for data from iframe
  useEffect(() => {
    async function handleMessage(e: MessageEvent) {
      if (e.data?.type === "WORKSHEET_READY") {
        // Iframe loaded - re-send saved data
        const { data } = await supabase.from("worksheet_responses")
          .select("response_data").eq("child_id", childId).eq("step_id", step.id).maybeSingle();
        if (data?.response_data) {
          iframeRef.current?.contentWindow?.postMessage(
            { type: "LOAD_WORKSHEET_DATA", data: data.response_data }, "*"
          );
        }
      }
      if (e.data?.type === "WORKSHEET_DATA") {
        // Debounce save
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
          setSaving(true);
          await supabase.from("worksheet_responses").upsert({
            child_id: childId, step_id: step.id, lesson_id: lessonId, course_id: courseId,
            response_data: e.data.data, updated_at: new Date().toISOString(),
          }, { onConflict: "child_id,step_id" });
          setLastSaved(new Date().toLocaleTimeString());
          setSaving(false);
        }, 500);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [childId, step.id, lessonId, courseId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <span>📋</span>
          <p className="text-xs font-bold text-emerald-800">Your work is automatically saved as you type.</p>
        </div>
        <div className="text-xs font-semibold text-slate-400">
          {saving ? "Saving..." : lastSaved ? `Saved ${lastSaved}` : ""}
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <iframe
          ref={iframeRef}
          srcDoc={step.content ?? ""}
          className="w-full"
          style={{ height: "80vh", border: "none" }}
          sandbox="allow-scripts allow-same-origin allow-forms"
          title="Worksheet"
        />
      </div>
      {!isCompleted && (
        <button onClick={onComplete}
          className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition">
          ✅ Mark as Complete & Continue
        </button>
      )}
      {isCompleted && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 text-center">
          ✅ Completed! Your work is saved.
        </div>
      )}
    </div>
  );
}

// ── Step renderer ─────────────────────────────────────────────
function StepContent({ step, childId, courseId, lessonId, onComplete, isCompleted }: {
  step: Step; childId: string; courseId: string; lessonId: string;
  onComplete: () => void; isCompleted: boolean;
}) {
  const [showPortfolioForm, setShowPortfolioForm]   = useState(false);
  const [portfolioAdded, setPortfolioAdded]         = useState(false);
  const [addedTicker, setAddedTicker]               = useState("");
  const [addedPrice, setAddedPrice]                 = useState(0);
  const [showCommunityForm, setShowCommunityForm]   = useState(false);
  const [communitySubmitted, setCommunitySubmitted] = useState(false);
  const supabase = supabaseBrowser();

  // Mark non-interactive steps as complete on view
  useEffect(() => {
    if (["text","video","pdf","image","audio"].includes(step.type) && !isCompleted) {
      supabase.from("lesson_step_progress").upsert({ child_id: childId, step_id: step.id, completed: true, updated_at: new Date().toISOString() }, { onConflict: "child_id,step_id" });
    }
  }, [step.id]);

  return (
    <div className="space-y-5">
      {/* Title */}
      {step.title && <h2 className="font-display text-2xl font-black text-slate-900">{step.title}</h2>}

      {/* TEXT */}
      {step.type === "text" && step.content && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <SimpleMarkdown content={step.content} />
        </div>
      )}

      {/* VIDEO */}
      {step.type === "video" && step.video_url && (
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-black">
            {step.video_url.includes("youtube")||step.video_url.includes("youtu.be")
              ?<iframe src={step.video_url.replace("watch?v=","embed/")} className="w-full aspect-video" allowFullScreen/>
              :step.video_url.includes("vimeo")
              ?<iframe src={step.video_url.replace("vimeo.com/","player.vimeo.com/video/")} className="w-full aspect-video" allowFullScreen/>
              :<video src={step.video_url} controls className="w-full aspect-video"/>}
          </div>
          {step.content && <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><SimpleMarkdown content={step.content} /></div>}
        </div>
      )}

      {/* PDF */}
      {step.type === "pdf" && step.pdf_url && (
        <div className="space-y-3">
          {step.content && <p className="text-sm font-semibold text-slate-700">{step.content}</p>}
          <a href={step.pdf_url} target="_blank"
            className="flex items-center gap-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 hover:bg-amber-100 transition">
            <span className="text-4xl">📄</span>
            <div>
              <div className="font-bold text-amber-900">Open PDF</div>
              <div className="text-xs font-semibold text-amber-700 mt-0.5">Click to open in a new tab</div>
            </div>
            <span className="ml-auto font-bold text-amber-600">Open ↗</span>
          </a>
        </div>
      )}

      {/* IMAGE */}
      {step.type === "image" && step.image_url && (
        <div className="space-y-3">
          <img src={step.image_url} alt={step.image_caption ?? ""} className="w-full rounded-2xl border border-slate-100 shadow-sm object-cover" />
          {step.image_caption && <p className="text-sm font-semibold text-slate-500 text-center">{step.image_caption}</p>}
          {step.content && <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><SimpleMarkdown content={step.content} /></div>}
        </div>
      )}

      {/* AUDIO */}
      {step.type === "audio" && step.audio_url && (
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-white text-2xl">🎤</div>
              <div>
                <div className="font-bold text-purple-900">{step.title || "Audio"}</div>
                <div className="text-xs font-semibold text-purple-600">Listen along!</div>
              </div>
            </div>
            <audio src={step.audio_url} controls className="w-full" />
          </div>
          {step.content && <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><p className="text-xs font-bold text-slate-400 mb-2">📝 Notes / Transcript</p><SimpleMarkdown content={step.content} /></div>}
        </div>
      )}

      {/* QUIZ */}
      {step.type === "quiz" && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          {step.content && <p className="text-sm font-semibold text-slate-600 mb-4">{step.content}</p>}
          <QuizStep lessonId={lessonId} childId={childId} onPass={onComplete} />
        </div>
      )}

      {/* POLL */}
      {step.type === "poll" && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <PollStep step={step} childId={childId} onComplete={onComplete} />
        </div>
      )}

      {/* MATCHING */}
      {step.type === "matching" && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <MatchingStep step={step} onComplete={onComplete} />
        </div>
      )}

      {/* CHECKLIST */}
      {step.type === "checklist" && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <ChecklistStep step={step} childId={childId} onComplete={onComplete} />
        </div>
      )}

      {/* REFLECTION */}
      {step.type === "reflection" && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <ReflectionStep step={step} childId={childId} courseId={courseId} lessonId={lessonId} onComplete={onComplete} />
        </div>
      )}

      {/* JOURNAL */}
      {step.type === "journal" && (
        <JournalStep step={step} childId={childId} lessonId={lessonId} courseId={courseId} onComplete={onComplete} isCompleted={isCompleted} />
      )}

      {/* TABLE */}
      {step.type === "table" && step.content && (
        <div className="space-y-3">
          {(() => {
            try {
              const tableData = JSON.parse(step.content) as { headers: string[]; rows: string[][]; before?: string; after?: string };
              return (
                <>
                  {tableData.before && <p className="text-sm font-semibold text-slate-700 leading-relaxed">{tableData.before}</p>}
                  <div className="overflow-x-auto rounded-2xl border border-emerald-100 shadow-sm">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-emerald-500 to-teal-500">
                          {tableData.headers.map((h, i) => (
                            <th key={i} className="px-5 py-3 text-left text-xs font-black text-white uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.rows.map((row, ri) => (
                          <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-emerald-50/50"}>
                            {row.map((cell, ci) => (
                              <td key={ci} className={`px-5 py-3 text-sm font-semibold border-b border-slate-100 ${ci === 0 ? "text-emerald-800 font-bold" : "text-slate-700"}`}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {tableData.after && <p className="text-sm font-semibold text-slate-700 leading-relaxed">{tableData.after}</p>}
                </>
              );
            } catch {
              return <p className="p-4 text-sm text-slate-400">Table data could not be loaded.</p>;
            }
          })()}
        </div>
      )}

      {/* WORKSHEET */}
      {step.type === "worksheet" && (
        <WorksheetStep step={step} childId={childId} lessonId={lessonId} courseId={courseId} onComplete={onComplete} isCompleted={isCompleted} />
      )}

      {/* PORTFOLIO */}
      {step.type === "portfolio" && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 text-center space-y-4">
          <div className="text-4xl">📈</div>
          <h3 className="font-display text-lg font-bold text-emerald-900">Skill Lab: Add to Your Portfolio!</h3>
          <p className="text-sm font-semibold text-emerald-700">{step.content || "Pick a company you believe in and add it to your practice portfolio!"}</p>
          {portfolioAdded
            ? <PortfolioAddedBanner ticker={addedTicker} price={addedPrice} onClose={onComplete} />
            : <button onClick={() => setShowPortfolioForm(true)} className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700 transition">➕ Add to My Portfolio</button>}
          {showPortfolioForm && (
            <AddToPortfolioForm childId={childId} courseId={courseId} lessonId={lessonId}
              onClose={() => setShowPortfolioForm(false)}
              onAdded={() => { setShowPortfolioForm(false); setPortfolioAdded(true); onComplete(); }} />
          )}
        </div>
      )}

      {/* INTERACTIVE (Community Post) — kept for backward compat */}
      {step.type === "interactive" && (
        <div className="rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 p-6 text-center space-y-4">
          <div className="text-4xl">🌱</div>
          <h3 className="font-display text-lg font-bold text-orange-900">Share with the Community!</h3>
          <p className="text-sm font-semibold text-orange-700">{step.content || "Share what you learned or made with the SkillSprout community!"}</p>
          {communitySubmitted
            ? <PostSubmittedBanner onClose={onComplete} />
            : <button onClick={() => setShowCommunityForm(true)} className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600 transition">🌱 Share with Community</button>}
          {showCommunityForm && (
            <CommunityPostForm childId={childId} courseId={courseId} lessonId={lessonId}
              onClose={() => setShowCommunityForm(false)}
              onSubmitted={() => { setShowCommunityForm(false); setCommunitySubmitted(true); onComplete(); }} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Player Page ──────────────────────────────────────────
export default function LessonStepPlayerPage() {
  const params   = useParams();
  const router   = useRouter();
  const supabase = supabaseBrowser();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  const [lesson, setLesson]         = useState<Lesson | null>(null);
  const [steps, setSteps]           = useState<Step[]>([]);
  const [childId, setChildId]       = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted]   = useState<Set<string>>(new Set());
  const [loading, setLoading]       = useState(true);
  const [nextLesson, setNextLesson] = useState<{ id: string; title: string } | null>(null);
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [showResources, setShowResources] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [activeNoteLesson, setActiveNoteLesson] = useState<string | null>(null);
  const [courseLessonsWithNotes, setCourseLessonsWithNotes] = useState<CourseLessonWithNotes[]>([]);
  const [currentNoteContent, setCurrentNoteContent] = useState("");
  const [editingJournalEntry, setEditingJournalEntry] = useState<{ step_id: string; content: string } | null>(null);
  const noteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { loadData(); }, [lessonId]);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth"); return; }
    const { data: cr } = await supabase.from("child_profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (!cr) { router.replace("/auth"); return; }
    setChildId(cr.id);

    const [{ data: lessonData }, { data: stepsData }] = await Promise.all([
      supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle(),
      supabase.from("lesson_steps").select("*").eq("lesson_id", lessonId).order("order_index"),
    ]);

    const lo = lessonData as Lesson;
    const st = (stepsData as Step[]) ?? [];
    setLesson(lo);
    setSteps(st);

    const [{ data: prog }, { data: savedPos }] = await Promise.all([
      supabase.from("lesson_step_progress").select("step_id").eq("child_id", cr.id).eq("completed", true).in("step_id", st.map(s => s.id)),
      supabase.from("lesson_progress").select("current_step_index").eq("child_id", cr.id).eq("lesson_id", lessonId).maybeSingle(),
    ]);
    setCompleted(new Set((prog ?? []).map((p: { step_id: string }) => p.step_id)));
    if (savedPos?.current_step_index && savedPos.current_step_index < st.length) {
      setCurrentIdx(savedPos.current_step_index);
    }

    // Load resources
    const { data: resData } = await supabase.from("lesson_resources").select("*").eq("lesson_id", lessonId).order("order_index");
    setResources((resData as LessonResource[]) ?? []);

    // Load all lessons in course with their notes and journal entries for this child
    if (lo && cr) {
      const { data: allLessons } = await supabase
        .from("lessons").select("id, title, order_index")
        .eq("course_id", lo.course_id).order("order_index");

      const lessonIds = (allLessons ?? []).map((l: { id: string }) => l.id);

      const [{ data: allNotes }, { data: allJournals }] = await Promise.all([
        supabase.from("lesson_notes").select("lesson_id, content").eq("child_id", cr.id).in("lesson_id", lessonIds),
        supabase.from("journal_entries").select("lesson_id, step_id, prompt, response").eq("child_id", cr.id).in("lesson_id", lessonIds),
      ]);

      const notesMap: Record<string, string> = {};
      (allNotes ?? []).forEach((n: { lesson_id: string; content: string }) => { notesMap[n.lesson_id] = n.content; });

      const journalMap: Record<string, { prompt: string; response: string; step_id: string }[]> = {};
      (allJournals ?? []).forEach((j: { lesson_id: string; step_id: string; prompt: string; response: string }) => {
        if (!journalMap[j.lesson_id]) journalMap[j.lesson_id] = [];
        journalMap[j.lesson_id].push({ prompt: j.prompt, response: j.response, step_id: j.step_id });
      });

      const withNotes: CourseLessonWithNotes[] = (allLessons ?? []).map((l: { id: string; title: string; order_index: number }) => ({
        id: l.id, title: l.title, order_index: l.order_index,
        notes: notesMap[l.id] ?? "",
        journalEntries: journalMap[l.id] ?? [],
      }));

      setCourseLessonsWithNotes(withNotes);
      setCurrentNoteContent(notesMap[lessonId] ?? "");
      setActiveNoteLesson(lessonId);
    }

    if (lo) {
      const { data: nd } = await supabase.from("lessons").select("id, title").eq("course_id", lo.course_id).eq("is_published", true).gt("order_index", lo.order_index).order("order_index").limit(1).maybeSingle();
      setNextLesson(nd as { id: string; title: string } ?? null);
    }

    setLoading(false);
  }

  function markComplete(stepId: string) {
    setCompleted(prev => new Set([...prev, stepId]));
    // Also save to lesson_step_progress
    if (childId) {
      supabaseBrowser().from("lesson_step_progress").upsert(
        { child_id: childId, step_id: stepId, completed: true, updated_at: new Date().toISOString() },
        { onConflict: "child_id,step_id" }
      );
    }
  }

  useEffect(() => {
    if (!childId || !lessonId) return;
    supabase.from("lesson_progress").upsert(
      { child_id: childId, lesson_id: lessonId, current_step_index: currentIdx, completed: false },
      { onConflict: "child_id,lesson_id" }
    );
  }, [currentIdx, childId]);

  async function saveNote(lessonIdToSave: string, noteContent: string) {
    if (!childId) return;
    await supabase.from("lesson_notes").upsert({
      child_id: childId, lesson_id: lessonIdToSave,
      course_id: lesson?.course_id, content: noteContent,
      updated_at: new Date().toISOString(),
    }, { onConflict: "child_id,lesson_id" });
    // Update local state
    setCourseLessonsWithNotes(prev => prev.map(l =>
      l.id === lessonIdToSave ? { ...l, notes: noteContent } : l
    ));
  }

  function handleNoteChange(val: string) {
    setCurrentNoteContent(val);
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
    noteSaveTimer.current = setTimeout(() => saveNote(lessonId, val), 800);
  }

  async function saveJournalEdit(stepId: string, newResponse: string) {
    if (!childId) return;
    await supabase.from("journal_entries").update({
      response: newResponse, updated_at: new Date().toISOString()
    }).eq("child_id", childId).eq("step_id", stepId);
    setCourseLessonsWithNotes(prev => prev.map(l => ({
      ...l,
      journalEntries: l.journalEntries.map(j =>
        j.step_id === stepId ? { ...j, response: newResponse } : j
      )
    })));
    setEditingJournalEntry(null);
  }

  async function finishLesson() {
    if (!childId || !lesson) return;
    await supabase.from("lesson_progress").upsert({ child_id: childId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() }, { onConflict: "child_id,lesson_id" });
    const { data: cr } = await supabase.from("child_profiles").select("xp").eq("id", childId).maybeSingle();
    if (cr) await supabase.from("child_profiles").update({ xp: (cr.xp ?? 0) + lesson.xp_reward }).eq("id", childId);
    const { data: allL } = await supabase.from("lessons").select("id").eq("course_id", lesson.course_id).eq("is_published", true);
    const { data: doneL } = await supabase.from("lesson_progress").select("id").eq("child_id", childId).eq("completed", true).in("lesson_id", (allL ?? []).map((l: { id: string }) => l.id));
    const pct = Math.round(((doneL?.length ?? 0) / (allL?.length ?? 1)) * 100);
    await supabase.from("enrollments").update({ progress_pct: pct, updated_at: new Date().toISOString() }).eq("child_id", childId).eq("course_id", lesson.course_id);
    if (nextLesson) router.push(`/courses/${courseId}/lessons/${nextLesson.id}`);
    else router.push(`/courses/${courseId}`);
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="text-5xl animate-bounce">📖</div></div>;
  if (!lesson) return <div className="text-center py-20"><p className="font-bold text-slate-400">Lesson not found.</p></div>;

  if (steps.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-5 py-6 px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/courses/${courseId}`)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">← Back</button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-black text-slate-900 truncate">{lesson.title}</h1>
            {lesson.description && <p className="text-xs font-semibold text-slate-400 mt-0.5">{lesson.description}</p>}
          </div>
          <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">⭐ {lesson.xp_reward} XP</span>
        </div>
        <LessonFallbackView lesson={lesson} nextLesson={nextLesson} onComplete={finishLesson} />
      </div>
    );
  }

  const currentStep = steps[currentIdx];
  const isLastStep  = currentIdx === steps.length - 1;
  const currentDone = currentStep ? completed.has(currentStep.id) : false;
  const quizTypes   = ["quiz", "matching", "poll"];
  const needsAction = currentStep && quizTypes.includes(currentStep.type) && !currentDone;
  const canGoNext   = currentDone || (currentStep && !quizTypes.includes(currentStep.type));

  return (
    <div className="max-w-2xl mx-auto space-y-5 py-6 px-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/courses/${courseId}`)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">← Back</button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-black text-slate-900 truncate">{lesson.title}</h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">Step {currentIdx + 1} of {steps.length}</p>
        </div>
        <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">⭐ {lesson.xp_reward} XP</span>
      </div>

      <div className="flex gap-1.5">
        {steps.map((s, i) => (
          <button key={s.id} onClick={() => { if (i <= currentIdx || completed.has(s.id)) setCurrentIdx(i); }}
            className={`flex-1 h-2.5 rounded-full transition-all ${
              completed.has(s.id) ? "bg-emerald-400"
              : i === currentIdx ? "bg-violet-400"
              : "bg-slate-200"
            } ${i <= currentIdx || completed.has(s.id) ? "cursor-pointer" : "cursor-not-allowed"}`} />
        ))}
      </div>

      {/* Resources tab */}
      {resources.length > 0 && (
        <div>
          <button onClick={() => setShowResources(r => !r)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              showResources ? "bg-violet-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}>
            📚 Resources {showResources ? "▲" : "▼"}
            <span className={`rounded-full px-1.5 py-0.5 text-xs ${showResources ? "bg-white/20 text-white" : "bg-violet-100 text-violet-700"}`}>
              {resources.length}
            </span>
          </button>
          {showResources && (
            <div className="mt-2 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-500">📚 Lesson Resources</p>
              </div>
              <div className="divide-y divide-slate-50">
                {resources.map(r => (
                  <div key={r.id} className="px-4 py-3">
                    {r.type === "note" ? (
                      <div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1">📝 {r.title}</p>
                        <p className="text-sm font-semibold text-slate-700 leading-relaxed">{r.note_content}</p>
                      </div>
                    ) : (
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 hover:bg-slate-50 rounded-xl p-1 -m-1 transition group">
                        <span className="text-xl shrink-0">
                          {r.type === "pdf" ? "📄" : r.type === "video" ? "🎬" : "🔗"}
                        </span>
                        <span className="text-sm font-bold text-slate-800 group-hover:text-violet-700 transition">{r.title}</span>
                        <span className="ml-auto text-xs font-semibold text-slate-400 group-hover:text-violet-500">Open ↗</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes tab */}
      {childId && courseLessonsWithNotes.length > 0 && (
        <div>
          <button onClick={() => setShowNotes(n => !n)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              showNotes ? "bg-amber-500 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}>
            📓 My Notes {showNotes ? "▲" : "▼"}
          </button>
          {showNotes && (
            <div className="mt-2 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              {/* Lesson tabs */}
              <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50 gap-0.5 p-1">
                {courseLessonsWithNotes.map((l, i) => (
                  <button key={l.id}
                    onClick={() => {
                      setActiveNoteLesson(l.id);
                      if (l.id === lessonId) setCurrentNoteContent(l.notes);
                    }}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition whitespace-nowrap ${
                      activeNoteLesson === l.id
                        ? l.id === lessonId ? "bg-amber-500 text-white" : "bg-violet-600 text-white"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}>
                    {i + 1}. {l.title.length > 20 ? l.title.slice(0, 20) + "…" : l.title}
                    {l.id === lessonId && <span className="ml-1 text-[10px] opacity-75">(current)</span>}
                  </button>
                ))}
              </div>

              {/* Active lesson notes */}
              {courseLessonsWithNotes.filter(l => l.id === activeNoteLesson).map(l => (
                <div key={l.id} className="p-4 space-y-4">
                  {/* Free-form notes */}
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-2">✏️ My Notes</p>
                    {l.id === lessonId ? (
                      <textarea
                        value={currentNoteContent}
                        onChange={e => handleNoteChange(e.target.value)}
                        rows={4}
                        placeholder="Jot down anything you want to remember from this lesson..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 transition resize-none"
                      />
                    ) : (
                      l.notes ? (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {l.notes}
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-slate-400 italic">No notes for this lesson yet.</p>
                      )
                    )}
                  </div>

                  {/* Journal prompt responses */}
                  {l.journalEntries.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-wide">📓 Journal Responses</p>
                      {l.journalEntries.map(j => (
                        <div key={j.step_id} className="rounded-xl border border-yellow-100 bg-yellow-50 p-3 space-y-2">
                          {j.prompt && (
                            <p className="text-xs font-bold text-yellow-800">Prompt: {j.prompt}</p>
                          )}
                          {editingJournalEntry?.step_id === j.step_id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingJournalEntry.content}
                                onChange={e => setEditingJournalEntry({ step_id: j.step_id, content: e.target.value })}
                                rows={3}
                                className="w-full rounded-xl border border-yellow-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-amber-400 resize-none"
                              />
                              <div className="flex gap-2">
                                <button onClick={() => saveJournalEdit(j.step_id, editingJournalEntry.content)}
                                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 transition">
                                  Save
                                </button>
                                <button onClick={() => setEditingJournalEntry(null)}
                                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <p className="flex-1 text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">{j.response}</p>
                              <button onClick={() => setEditingJournalEntry({ step_id: j.step_id, content: j.response })}
                                className="shrink-0 rounded-lg border border-yellow-200 px-2 py-1 text-xs font-bold text-yellow-700 hover:bg-yellow-100 transition">
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {l.notes === "" && l.journalEntries.length === 0 && l.id !== lessonId && (
                    <p className="text-xs font-semibold text-slate-400 italic text-center py-4">No notes or journal entries for this lesson yet.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {currentStep && childId && (
        <StepContent
          step={currentStep}
          childId={childId}
          courseId={courseId}
          lessonId={lessonId}
          onComplete={() => markComplete(currentStep.id)}
          isCompleted={completed.has(currentStep.id)}
        />
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={() => setCurrentIdx(i => i - 1)} disabled={currentIdx === 0}
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition">
          ← Previous
        </button>
        {isLastStep ? (
          <button onClick={finishLesson} disabled={!canGoNext}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40 transition">
            {nextLesson ? `Next Lesson: ${nextLesson.title} →` : "Complete Lesson 🎉"}
          </button>
        ) : (
          <button onClick={() => setCurrentIdx(i => i + 1)} disabled={!canGoNext}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 transition">
            Next Step →
          </button>
        )}
      </div>

      {needsAction && (
        <p className="text-center text-xs font-bold text-amber-600">⚠️ Complete this step to continue</p>
      )}
    </div>
  );
}