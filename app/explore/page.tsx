"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/app/lib/supabase/client";

// ── TYPES ─────────────────────────────────────────────────────
type ChallengeType = "hands-on" | "word-scramble" | "riddle" | "trivia" | "wordsearch";

// ── DATA ──────────────────────────────────────────────────────
const SCRAMBLES = [
  { scrambled: "GNIDRNAEG", answer: "GARDENING",   hint: "Something you do to grow plants and vegetables" },
  { scrambled: "GNIKOOC",   answer: "COOKING",     hint: "Making food in the kitchen" },
  { scrambled: "GNIDOC",    answer: "CODING",      hint: "Writing instructions for computers" },
  { scrambled: "EYNMO",     answer: "MONEY",       hint: "You use this to buy things" },
  { scrambled: "GNITNVIES", answer: "INVESTING",   hint: "Growing your money over time" },
  { scrambled: "CNEECIS",   answer: "SCIENCE",     hint: "Experiments and discovery" },
  { scrambled: "CISUM",     answer: "MUSIC",       hint: "Sounds that make you want to dance" },
];

const RIDDLES = [
  { q: "I have branches but no leaves, no trunk, and no fruit. What am I?", options: ["A river", "A bank", "A library", "A cloud"], answer: 1, explain: "A bank has 'branches' — just like a bank building has branch locations!" },
  { q: "The more you take, the more you leave behind. What am I?", options: ["Cookies", "Time", "Footsteps", "Money"], answer: 2, explain: "Footsteps! Every step you take, you leave one behind." },
  { q: "I speak without a mouth and hear without ears. I come alive with wind. What am I?", options: ["A ghost", "An echo", "A whisper", "A song"], answer: 1, explain: "An echo 'speaks' your words back and travels on sound waves." },
  { q: "What has keys but no locks, space but no room, and you can enter but can't go inside?", options: ["A house", "A keyboard", "A map", "A diary"], answer: 1, explain: "A keyboard has keys, a space bar, and an Enter key!" },
  { q: "I am always in front of you but can never be seen. What am I?", options: ["Your shadow", "The future", "Your reflection", "The sky"], answer: 1, explain: "The future is always ahead of you, but you can never actually see it!" },
  { q: "What gets wetter the more it dries?", options: ["A sponge", "A towel", "A cloud", "Wet paint"], answer: 1, explain: "A towel gets wetter the more things it dries!" },
];

const TRIVIA = [
  { cat: "🌱 Science", q: "What do plants use sunlight to make?", opts: ["Sugar (food)", "Oxygen only", "Water", "Soil"], a: 0 },
  { cat: "💻 Tech", q: 'What does "www" stand for in a website address?', opts: ["World Wide Web", "Worldwide Wireless Wi-fi", "Web Window World", "Wide World Websites"], a: 0 },
  { cat: "💰 Money", q: "If you save $5 each week, how much after 4 weeks?", opts: ["$15", "$25", "$20", "$10"], a: 2 },
  { cat: "🍳 Cooking", q: "At what temperature does water boil?", opts: ["50°C / 122°F", "100°C / 212°F", "75°C / 167°F", "0°C / 32°F"], a: 1 },
  { cat: "🌍 World", q: "Which is the longest river in the world?", opts: ["Amazon", "Mississippi", "Nile", "Yangtze"], a: 2 },
];

const WS_WORDS = ["COOK", "CODE", "GROW", "ART", "MUSIC", "READ"];
const WS_SIZE  = 8;

const INTERESTS = [
  { icon: "🍳", label: "Cooking",     sub: "Recipes & food science" },
  { icon: "💻", label: "Coding",      sub: "Build apps & games" },
  { icon: "🌱", label: "Gardening",   sub: "Grow your own food" },
  { icon: "💰", label: "Investing",   sub: "Money & finance" },
  { icon: "🎨", label: "Art & Design",sub: "Create & express" },
  { icon: "🎵", label: "Music",       sub: "Instruments & theory" },
  { icon: "📸", label: "Photography", sub: "Capture the world" },
  { icon: "🔬", label: "Science",     sub: "Experiments & discovery" },
  { icon: "🐾", label: "Animal Care", sub: "Pets & wildlife" },
  { icon: "🏋️", label: "Fitness",     sub: "Health & movement" },
  { icon: "✍️", label: "Writing",     sub: "Stories & journalism" },
  { icon: "🛠️", label: "Building",    sub: "Woodwork & making" },
];

const CHALLENGE_LABELS: Record<ChallengeType, string> = {
  "hands-on":     "🌿 Hands-On",
  "word-scramble":"🔤 Word Scramble",
  "riddle":       "🧩 Riddle",
  "trivia":       "🧠 Trivia",
  "wordsearch":   "🔍 Word Search",
};

const XP_PER_CHALLENGE = 10;

// ── WORD SEARCH GENERATOR ─────────────────────────────────────
function buildWordSearch(): { grid: string[][] } {
  const grid: string[][] = Array.from({ length: WS_SIZE }, () => Array(WS_SIZE).fill(""));

  function canPlace(word: string, row: number, col: number, dir: number) {
    for (let i = 0; i < word.length; i++) {
      const r = row + (dir === 1 || dir === 2 ? i : 0);
      const c = col + (dir === 0 || dir === 2 ? i : 0);
      if (r >= WS_SIZE || c >= WS_SIZE) return false;
      if (grid[r][c] && grid[r][c] !== word[i]) return false;
    }
    return true;
  }

  function placeWord(word: string, row: number, col: number, dir: number) {
    for (let i = 0; i < word.length; i++) {
      const r = row + (dir === 1 || dir === 2 ? i : 0);
      const c = col + (dir === 0 || dir === 2 ? i : 0);
      grid[r][c] = word[i];
    }
  }

  for (const word of WS_WORDS) {
    let placed = false, tries = 0;
    while (!placed && tries < 200) {
      const dir = Math.floor(Math.random() * 3);
      const row = Math.floor(Math.random() * WS_SIZE);
      const col = Math.floor(Math.random() * WS_SIZE);
      if (canPlace(word, row, col, dir)) { placeWord(word, row, col, dir); placed = true; }
      tries++;
    }
  }

  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < WS_SIZE; r++)
    for (let c = 0; c < WS_SIZE; c++)
      if (!grid[r][c]) grid[r][c] = alpha[Math.floor(Math.random() * 26)];

  return { grid };
}

// ── TAB BUTTON ────────────────────────────────────────────────
function TabBtn({ active, done, onClick, children }: { active: boolean; done: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`relative rounded-xl border-2 px-4 py-2 text-sm font-bold transition ${
        active ? "border-emerald-500 bg-emerald-500 text-white"
        : done  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
      }`}>
      {children}
      {done && <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-xs">✓</span>}
    </button>
  );
}

// ── HANDS-ON CHALLENGE ────────────────────────────────────────
function HandsOnChallenge({ onComplete, done }: { onComplete: () => void; done: boolean }) {
  const steps = [
    "Gather a small pot, some soil, and one herb seed — basil, mint, or chives work great!",
    "Plant your seed following the packet instructions, then water it gently.",
    "Write one sentence about what your herb needs to grow — light, water, or warmth?",
    "Take a photo and post it to your Showcase for your parent to approve!",
  ];
  const [checked, setChecked] = useState<boolean[]>(steps.map(() => false));
  const allDone = checked.every(Boolean);

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6">
      <h3 className="font-display text-xl font-bold text-amber-800">🌿 Herb Science Challenge</h3>
      <p className="mt-1 text-sm font-semibold text-amber-700">Complete all steps to mark this challenge done!</p>
      {done && <div className="mt-3 rounded-xl bg-emerald-100 border border-emerald-300 px-4 py-2 text-sm font-bold text-emerald-700">✓ Completed today!</div>}
      <div className="mt-4 space-y-3">
        {steps.map((step, i) => (
          <button key={i} disabled={done} onClick={() => setChecked((d) => d.map((v, j) => j === i ? !v : v))}
            className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition ${checked[i] ? "border-emerald-300 bg-emerald-50" : "border-white bg-white hover:border-emerald-200"} shadow-sm`}>
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${checked[i] ? "bg-emerald-500 text-white" : "bg-emerald-600 text-white"}`}>
              {checked[i] ? "✓" : i + 1}
            </div>
            <p className="text-sm font-semibold leading-relaxed text-slate-700">{step}</p>
          </button>
        ))}
      </div>
      {!done && (
        <button onClick={onComplete} disabled={!allDone}
          className={`mt-6 w-full rounded-xl py-3 text-base font-bold transition ${allDone ? "bg-emerald-600 text-white hover:bg-emerald-700" : "cursor-not-allowed bg-slate-200 text-slate-400"}`}>
          {allDone ? "✅ Mark as Complete!" : `Complete all ${checked.filter(Boolean).length}/${steps.length} steps first`}
        </button>
      )}
    </div>
  );
}

// ── WORD SCRAMBLE ─────────────────────────────────────────────
function WordScramble({ onComplete, done }: { onComplete: () => void; done: boolean }) {
  const [idx, setIdx]           = useState(0);
  const [input, setInput]       = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [streak, setStreak]     = useState(0);
  const current = SCRAMBLES[idx];

  function check() {
    if (input.trim().toUpperCase() === current.answer) {
      setFeedback("correct");
      const next = streak + 1;
      setStreak(next);
      if (next >= 3) onComplete();
    } else { setFeedback("wrong"); }
  }

  function next() { setIdx((i) => (i + 1) % SCRAMBLES.length); setInput(""); setFeedback(null); }

  return (
    <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-6">
      <h3 className="font-display text-xl font-bold text-violet-800">🔤 Word Scramble</h3>
      <p className="mt-1 text-sm font-semibold text-violet-600">Solve 3 in a row to complete today's challenge!</p>
      {done && <div className="mt-3 rounded-xl bg-emerald-100 border border-emerald-300 px-4 py-2 text-sm font-bold text-emerald-700">✓ Completed today!</div>}
      <div className="mt-5 rounded-xl bg-white p-6 text-center shadow-sm">
        <div className="font-display text-5xl font-bold tracking-widest text-violet-700">{current.scrambled}</div>
        <p className="mt-2 text-sm font-semibold text-slate-400">💡 {current.hint}</p>
        <input value={input} onChange={(e) => { setInput(e.target.value.toUpperCase()); setFeedback(null); }}
          onKeyDown={(e) => e.key === "Enter" && check()} disabled={done}
          placeholder="YOUR ANSWER" maxLength={12}
          className="mt-4 w-full max-w-xs rounded-xl border-2 border-violet-200 bg-white px-4 py-3 text-center font-display text-xl font-bold uppercase tracking-widest outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
        {feedback && <p className={`mt-2 text-sm font-bold ${feedback === "correct" ? "text-emerald-600" : "text-rose-600"}`}>{feedback === "correct" ? "🎉 Correct!" : "❌ Not quite — try again!"}</p>}
        {!done && (
          <div className="mt-4 flex justify-center gap-3">
            <button onClick={check} className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700">Check ✓</button>
            <button onClick={next} className="rounded-xl border-2 border-violet-200 bg-white px-6 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-50">Next Word →</button>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
        <div>
          <div className="text-sm font-bold text-slate-800">Scramble Streak</div>
          <div className="text-xs font-semibold text-slate-400">Solve 3 in a row to complete!</div>
        </div>
        <div className="font-display text-2xl font-bold text-amber-500">{streak} 🔥</div>
      </div>
    </div>
  );
}

// ── RIDDLE ────────────────────────────────────────────────────
function RiddleChallenge({ onComplete, done }: { onComplete: () => void; done: boolean }) {
  const [idx, setIdx]       = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [solved, setSolved] = useState(0);
  const riddle = RIDDLES[idx % RIDDLES.length];
  const answered = chosen !== null;

  function pick(i: number) {
    if (answered || done) return;
    setChosen(i);
    if (i === riddle.answer) {
      const next = solved + 1;
      setSolved(next);
      if (next >= 2) onComplete();
    }
  }

  function nextRiddle() { setIdx((i) => i + 1); setChosen(null); }

  function optionClass(i: number) {
    if (!answered) return "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50";
    if (i === riddle.answer) return "border-emerald-400 bg-emerald-50 text-emerald-800";
    if (i === chosen) return "border-rose-400 bg-rose-50 text-rose-700";
    return "border-slate-200 bg-white opacity-50";
  }

  return (
    <div className="rounded-2xl border-2 border-teal-200 bg-teal-50 p-6">
      <h3 className="font-display text-xl font-bold text-teal-800">🧩 Daily Riddle</h3>
      <p className="mt-1 text-sm font-semibold text-teal-600">Solve 2 riddles to complete today's challenge! <span className="text-amber-600">({solved}/2 solved)</span></p>
      {done && <div className="mt-3 rounded-xl bg-emerald-100 border border-emerald-300 px-4 py-2 text-sm font-bold text-emerald-700">✓ Completed today!</div>}
      <div className="mt-5 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-base font-bold leading-relaxed text-slate-800">"{riddle.q}"</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {riddle.options.map((opt, i) => (
            <button key={i} onClick={() => pick(i)} disabled={answered || done}
              className={`rounded-xl border-2 p-3 text-left text-sm font-bold transition ${optionClass(i)}`}>
              {opt}
            </button>
          ))}
        </div>
        {answered && <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">{chosen === riddle.answer ? "🎉 Correct! " : `💡 The answer was: ${riddle.options[riddle.answer]}. `}{riddle.explain}</div>}
        {answered && !done && <button onClick={nextRiddle} className="mt-4 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-teal-700">Next Riddle →</button>}
      </div>
    </div>
  );
}

// ── TRIVIA QUIZ ───────────────────────────────────────────────
function TriviaQuiz({ onComplete, done }: { onComplete: () => void; done: boolean }) {
  const [idx, setIdx]           = useState(0);
  const [score, setScore]       = useState(0);
  const [chosen, setChosen]     = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const q = TRIVIA[idx];
  const answered = chosen !== null;

  function pick(i: number) {
    if (answered || done) return;
    setChosen(i);
    if (i === q.a) setScore((s) => s + 1);
  }

  function next() {
    if (idx + 1 >= TRIVIA.length) { setFinished(true); onComplete(); }
    else { setIdx((i) => i + 1); setChosen(null); }
  }

  function optionClass(i: number) {
    if (!answered) return "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50";
    if (i === q.a) return "border-emerald-400 bg-emerald-50 text-emerald-800";
    if (i === chosen) return "border-rose-400 bg-rose-50 text-rose-700";
    return "border-slate-200 bg-white opacity-50";
  }

  if (finished) return (
    <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-6 text-center">
      <div className="text-5xl">{score === 5 ? "🏆" : score >= 3 ? "🌟" : "💪"}</div>
      <h3 className="font-display mt-3 text-2xl font-bold text-sky-800">You scored {score}/5!</h3>
      <p className="mt-2 text-sm font-semibold text-sky-600">{score === 5 ? "Perfect score! 🎉" : score >= 3 ? "Great job — keep practicing!" : "Good try! You'll do better tomorrow!"}</p>
      {done && <div className="mt-3 rounded-xl bg-emerald-100 border border-emerald-300 px-4 py-2 text-sm font-bold text-emerald-700">✓ XP awarded for today!</div>}
    </div>
  );

  return (
    <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-6">
      <h3 className="font-display text-xl font-bold text-sky-800">🧠 Trivia Quiz — 5 Questions</h3>
      <p className="mt-1 text-sm font-semibold text-sky-600">Answer all 5 to complete today's brain challenge!</p>
      {done && <div className="mt-3 rounded-xl bg-emerald-100 border border-emerald-300 px-4 py-2 text-sm font-bold text-emerald-700">✓ Completed today!</div>}
      <div className="mt-4 flex gap-2">
        {TRIVIA.map((_, i) => <div key={i} className={`h-3 w-3 rounded-full transition ${i < idx ? "bg-emerald-500" : i === idx ? "bg-amber-400" : "bg-slate-200"}`} />)}
      </div>
      <div className="mt-4 rounded-xl bg-white p-5 shadow-sm">
        <span className="inline-block rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{q.cat}</span>
        <p className="mt-3 text-base font-bold leading-relaxed text-slate-800">Q{idx + 1} of {TRIVIA.length}: {q.q}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {q.opts.map((opt, i) => (
            <button key={i} onClick={() => pick(i)} disabled={answered || done}
              className={`rounded-xl border-2 p-3 text-left text-sm font-bold transition ${optionClass(i)}`}>
              {opt}
            </button>
          ))}
        </div>
        {answered && <div className="mt-3 text-sm font-semibold text-slate-600">{chosen === q.a ? "✅ Correct!" : `❌ The correct answer was: ${q.opts[q.a]}`}</div>}
        {answered && !done && <button onClick={next} className="mt-4 rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-sky-700">{idx + 1 >= TRIVIA.length ? "See Results 🏆" : "Next Question →"}</button>}
      </div>
    </div>
  );
}

// ── WORD SEARCH ───────────────────────────────────────────────
function WordSearch({ onComplete, done }: { onComplete: () => void; done: boolean }) {
  const [{ grid }]              = useState(() => buildWordSearch());
  const [found, setFound]       = useState<string[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [startCell, setStartCell] = useState<{ r: number; c: number } | null>(null);
  const [selected, setSelected] = useState<{ r: number; c: number }[]>([]);
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const allFound = found.length === WS_WORDS.length;

  function getCellsInLine(from: { r: number; c: number }, to: { r: number; c: number }) {
    const dr = to.r - from.r, dc = to.c - from.c;
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    if (steps === 0) return [from];
    if (Math.abs(dr) !== 0 && Math.abs(dc) !== 0 && Math.abs(dr) !== Math.abs(dc)) return [from];
    const sr = dr === 0 ? 0 : dr / Math.abs(dr);
    const sc = dc === 0 ? 0 : dc / Math.abs(dc);
    return Array.from({ length: steps + 1 }, (_, i) => ({ r: from.r + sr * i, c: from.c + sc * i }));
  }

  function cellStyle(r: number, c: number) {
    if (foundCells.has(`${r}-${c}`)) return "bg-emerald-200 text-emerald-900";
    if (selected.some((s) => s.r === r && s.c === c)) return "bg-amber-200 text-amber-900";
    return "bg-white text-slate-800 hover:bg-emerald-50";
  }

  function onMouseDown(r: number, c: number) { if (done) return; setSelecting(true); setStartCell({ r, c }); setSelected([{ r, c }]); }
  function onMouseEnter(r: number, c: number) { if (!selecting || !startCell) return; setSelected(getCellsInLine(startCell, { r, c })); }

  function onMouseUp() {
    setSelecting(false);
    const letters = selected.map(({ r, c }) => grid[r][c]).join("");
    const rev = letters.split("").reverse().join("");
    const match = WS_WORDS.find((w) => w === letters || w === rev);
    if (match && !found.includes(match)) {
      const newFound = [...found, match];
      setFound(newFound);
      const newCells = new Set(foundCells);
      selected.forEach(({ r, c }) => newCells.add(`${r}-${c}`));
      setFoundCells(newCells);
      if (newFound.length === WS_WORDS.length) onComplete();
    }
    setSelected([]); setStartCell(null);
  }

  return (
    <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-6">
      <h3 className="font-display text-xl font-bold text-rose-800">🔍 Word Search</h3>
      <p className="mt-1 text-sm font-semibold text-rose-600">Find all {WS_WORDS.length} hidden skill words!</p>
      {done && <div className="mt-3 rounded-xl bg-emerald-100 border border-emerald-300 px-4 py-2 text-sm font-bold text-emerald-700">✓ Completed today!</div>}
      <div className="mt-4 overflow-x-auto rounded-xl bg-white p-4 shadow-sm">
        <div className="inline-grid gap-1 select-none" style={{ gridTemplateColumns: `repeat(${WS_SIZE}, 2rem)` }}
          onMouseLeave={() => { if (selecting) { setSelecting(false); setSelected([]); } }}>
          {grid.map((row, r) => row.map((letter, c) => (
            <div key={`${r}-${c}`} onMouseDown={() => onMouseDown(r, c)} onMouseEnter={() => onMouseEnter(r, c)} onMouseUp={onMouseUp}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg font-display text-sm font-bold transition ${cellStyle(r, c)}`}>
              {letter}
            </div>
          )))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {WS_WORDS.map((word) => (
            <span key={word} className={`rounded-lg px-3 py-1 text-xs font-bold transition ${found.includes(word) ? "bg-emerald-100 text-emerald-700 line-through" : "bg-slate-100 text-slate-600"}`}>
              {word}
            </span>
          ))}
        </div>
        {allFound && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-center">
            <div className="text-3xl">🎉</div>
            <p className="font-display mt-2 text-lg font-bold text-emerald-800">You found them all!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function ExplorePage() {
  const supabase = supabaseBrowser();
  const router   = useRouter();

  const [activeTab, setActiveTab]     = useState<ChallengeType>("trivia");
  const [childId, setChildId]         = useState<string | null>(null);
  const [streak, setStreak]           = useState(0);
  const [xp, setXp]                   = useState(0);
  const [completedToday, setCompletedToday] = useState<Set<ChallengeType>>(new Set());
  const [loading, setLoading]         = useState(true);
  const [justCompleted, setJustCompleted] = useState<ChallengeType | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: childRow } = await supabase
      .from("child_profiles").select("id, streak_count, xp").eq("user_id", user.id).maybeSingle();
    if (!childRow) { setLoading(false); return; }

    setChildId(childRow.id);
    setStreak(childRow.streak_count ?? 0);
    setXp(childRow.xp ?? 0);

    // Load today's completions
    const today = new Date().toISOString().split("T")[0];
    const { data: completions } = await supabase
      .from("daily_challenge_completions")
      .select("challenge_type")
      .eq("child_id", childRow.id)
      .eq("completed_date", today);

    setCompletedToday(new Set((completions ?? []).map((c: { challenge_type: string }) => c.challenge_type as ChallengeType)));
    setLoading(false);
  }

  async function handleComplete(type: ChallengeType) {
    if (completedToday.has(type)) return;
    if (!childId) return;

    const today = new Date().toISOString().split("T")[0];

    // Insert completion — unique constraint prevents duplicates
    const { error } = await supabase.from("daily_challenge_completions").insert({
      child_id: childId,
      completed_date: today,
      challenge_type: type,
      xp_awarded: XP_PER_CHALLENGE,
    });
    if (error) return; // Already completed today (constraint violation)

    // Update completedToday state
    setCompletedToday((prev) => new Set([...prev, type]));
    setJustCompleted(type);
    setTimeout(() => setJustCompleted(null), 3000);

    // Award XP
    const newXp = xp + XP_PER_CHALLENGE;
    setXp(newXp);

    // Update streak — check if yesterday was completed
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const { data: yesterdayData } = await supabase
      .from("daily_challenge_completions")
      .select("id")
      .eq("child_id", childId)
      .eq("completed_date", yesterdayStr)
      .limit(1);

    // Check if this is first completion today
    const { data: todayData } = await supabase
      .from("daily_challenge_completions")
      .select("id")
      .eq("child_id", childId)
      .eq("completed_date", today);

    const isFirstToday = (todayData?.length ?? 0) === 1;

    let newStreak = streak;
    if (isFirstToday) {
      // If yesterday had a completion, increment streak; otherwise reset to 1
      newStreak = (yesterdayData && yesterdayData.length > 0) ? streak + 1 : 1;
      setStreak(newStreak);
    }

    // Update child_profiles
    await supabase.from("child_profiles").update({ xp: newXp, streak_count: newStreak }).eq("id", childId);
  }

  const allDoneToday = completedToday.size >= 5;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-emerald-100/50 blur-3xl" />
        <div className="font-display mb-1 text-4xl font-bold text-emerald-900 md:text-5xl">Explore 🔍</div>
        <p className="max-w-xl text-base font-semibold text-slate-500">Pick your challenge style — complete one every day to keep your streak alive! 🔥</p>
        <div className="mt-4 flex items-center gap-4">
          {loading ? (
            <div className="h-9 w-32 rounded-xl bg-slate-100 animate-pulse" />
          ) : (
            <>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm">
                <span className="font-bold text-slate-900">Streak:</span>{" "}
                <span className="text-slate-700">🔥 {streak} day{streak !== 1 ? "s" : ""}</span>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm">
                <span className="font-bold text-slate-900">Today:</span>{" "}
                <span className="text-slate-700">{completedToday.size}/5 challenges done</span>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-sm">
                <span className="font-bold text-slate-900">XP:</span>{" "}
                <span className="text-slate-700">⭐ {xp}</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Challenge Section */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-emerald-900">⚡ Today's Daily Challenges</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Each challenge type can be completed once per day for {XP_PER_CHALLENGE} XP!</p>
        </div>

        {/* Just completed banner */}
        {justCompleted && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 animate-pulse">
            <span className="text-2xl">🎉</span>
            <div>
              <div className="font-bold text-emerald-800">+{XP_PER_CHALLENGE} XP earned!</div>
              <div className="text-sm font-semibold text-emerald-600">{CHALLENGE_LABELS[justCompleted]} completed for today!</div>
            </div>
          </div>
        )}

        {allDoneToday && (
          <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <span className="text-2xl">🏆</span>
            <div>
              <div className="font-bold text-violet-800">All challenges complete for today!</div>
              <div className="text-sm font-semibold text-violet-600">Amazing work! Come back tomorrow for more. 🌱</div>
            </div>
          </div>
        )}

        {!childId && !loading && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-sm font-bold text-amber-800">Sign in to save your progress and streak!</p>
            <a href="/auth" className="mt-2 inline-block rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 transition">Sign In →</a>
          </div>
        )}

        {/* Tab buttons */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CHALLENGE_LABELS) as ChallengeType[]).map((type) => (
            <TabBtn key={type} active={activeTab === type} done={completedToday.has(type)} onClick={() => setActiveTab(type)}>
              {CHALLENGE_LABELS[type]}
            </TabBtn>
          ))}
        </div>

        {/* Challenge panels */}
        {activeTab === "hands-on"      && <HandsOnChallenge  onComplete={() => handleComplete("hands-on")}      done={completedToday.has("hands-on")} />}
        {activeTab === "word-scramble" && <WordScramble      onComplete={() => handleComplete("word-scramble")} done={completedToday.has("word-scramble")} />}
        {activeTab === "riddle"        && <RiddleChallenge   onComplete={() => handleComplete("riddle")}        done={completedToday.has("riddle")} />}
        {activeTab === "trivia"        && <TriviaQuiz        onComplete={() => handleComplete("trivia")}        done={completedToday.has("trivia")} />}
        {activeTab === "wordsearch"    && <WordSearch        onComplete={() => handleComplete("wordsearch")}    done={completedToday.has("wordsearch")} />}
      </section>

      {/* Interest Grid */}
      <section>
        <h2 className="font-display text-2xl font-bold text-emerald-900">🌎 Explore Interests</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Tap any topic to find courses and career paths!</p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {INTERESTS.map((item) => (
            <Link key={item.label} href="/courses"
              className="flex flex-col items-center rounded-2xl border-2 border-transparent bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md">
              <span className="text-4xl">{item.icon}</span>
              <span className="font-display mt-2 text-base font-bold text-emerald-900">{item.label}</span>
              <span className="mt-1 text-xs font-semibold text-slate-400">{item.sub}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-emerald-900">Want to save your streak and unlock more?</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Profiles are free. Parents choose privacy settings.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Create / Sign in</Link>
            <Link href="/" className="rounded-xl border-2 border-emerald-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 hover:bg-emerald-50">Back to Home</Link>
          </div>
        </div>
      </section>
    </div>
  );
}