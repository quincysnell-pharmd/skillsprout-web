"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";

type ChallengeType = "quiz" | "reflection" | "action" | "video" | "unscramble" | "fill_blank" | "word_search" | "hidden_object" | "sudoku" | "memory_match" | "sort_rank";

interface Challenge {
  id: string;
  scheduled_date: string;
  title: string;
  description?: string;
  type: ChallengeType;
  category: string;
  xp_reward: number;
  order_index: number;
  // quiz
  quiz_question?: string;
  quiz_options?: string[];
  quiz_correct_index?: number;
  // reflection
  reflection_prompt?: string;
  min_words?: number;
  // action
  action_instruction?: string;
  action_verification?: string;
  // video
  video_url?: string;
  video_prompt?: string;
  // unscramble
  unscramble_word?: string;
  unscramble_hint?: string;
  // fill blank
  fill_blank_sentence?: string;
  fill_blank_answer?: string;
  fill_blank_hint?: string;
  // word search
  word_search_words?: string[];
  word_search_grid?: string[][];
  // hidden object
  hidden_object_image_url?: string;
  hidden_object_targets?: { x: number; y: number; label: string }[];
  // sudoku
  sudoku_puzzle?: number[][];
  sudoku_solution?: number[][];
  // memory match
  memory_pairs?: { a: string; b: string }[];
  // sort rank
  sort_items?: string[];
  sort_prompt?: string;
}

const TYPE_CONFIG: Record<ChallengeType, { label: string; emoji: string; bg: string; border: string; text: string }> = {
  quiz:          { label: "Quiz",          emoji: "❓", bg: "bg-violet-50",  border: "border-violet-200", text: "text-violet-700"  },
  reflection:    { label: "Reflection",    emoji: "💬", bg: "bg-sky-50",     border: "border-sky-200",    text: "text-sky-700"     },
  action:        { label: "Action",        emoji: "⚡", bg: "bg-amber-50",   border: "border-amber-200",  text: "text-amber-700"   },
  video:         { label: "Video",         emoji: "🎬", bg: "bg-rose-50",    border: "border-rose-200",   text: "text-rose-700"    },
  unscramble:    { label: "Unscramble",    emoji: "🔤", bg: "bg-orange-50",  border: "border-orange-200", text: "text-orange-700"  },
  fill_blank:    { label: "Fill in Blank", emoji: "✏️", bg: "bg-lime-50",    border: "border-lime-200",   text: "text-lime-700"    },
  word_search:   { label: "Word Search",   emoji: "🔍", bg: "bg-teal-50",    border: "border-teal-200",   text: "text-teal-700"    },
  hidden_object: { label: "Hidden Object", emoji: "👁️", bg: "bg-pink-50",    border: "border-pink-200",   text: "text-pink-700"    },
  sudoku:        { label: "Sudoku",        emoji: "🔢", bg: "bg-indigo-50",  border: "border-indigo-200", text: "text-indigo-700"  },
  memory_match:  { label: "Memory Match",  emoji: "🃏", bg: "bg-purple-50",  border: "border-purple-200", text: "text-purple-700"  },
  sort_rank:     { label: "Sort & Rank",   emoji: "📊", bg: "bg-cyan-50",    border: "border-cyan-200",   text: "text-cyan-700"    },
};

// ── Quiz ───────────────────────────────────────────────────────
function QuizChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (r: string) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const options = challenge.quiz_options ?? [];
  const correct = challenge.quiz_correct_index ?? 0;

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
              submitted ? i === correct ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                : i === selected && i !== correct ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-slate-100 bg-slate-50 text-slate-400"
              : selected === i ? "border-violet-400 bg-violet-50 text-violet-800"
              : "border-slate-200 bg-white text-slate-700 hover:border-violet-200"
            }`}>
            <span className="font-black mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
          </button>
        ))}
      </div>
      {submitted ? (
        <div className={`rounded-xl px-4 py-3 text-sm font-bold ${selected === correct ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
          {selected === correct ? "🎉 Correct!" : `❌ The answer was: ${options[correct]}`}
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

// ── Reflection ─────────────────────────────────────────────────
function ReflectionChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (r: string) => void }) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const minWords = challenge.min_words ?? 20;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <p className="font-bold text-slate-800">{challenge.reflection_prompt}</p>
      <textarea value={text} onChange={e => setText(e.target.value)} disabled={submitted} rows={5}
        placeholder="Write your thoughts here..."
        className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 focus:border-sky-400 focus:outline-none resize-none" />
      <div className="flex justify-between text-xs font-bold">
        <span className={wordCount >= minWords ? "text-emerald-600" : "text-slate-400"}>{wordCount} / {minWords} words</span>
        {wordCount >= minWords && <span className="text-emerald-600">✓ Ready!</span>}
      </div>
      {submitted ? (
        <div className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-800">🌱 Reflection saved!</div>
      ) : (
        <button onClick={() => { setSubmitted(true); setTimeout(() => onComplete(text), 800); }}
          disabled={wordCount < minWords}
          className="w-full rounded-xl bg-sky-600 py-3 text-sm font-bold text-white hover:bg-sky-700 transition disabled:opacity-40">
          Submit Reflection
        </button>
      )}
    </div>
  );
}

// ── Action ─────────────────────────────────────────────────────
function ActionChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (r: string) => void }) {
  const [checked, setChecked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
        <p className="font-bold text-amber-900 text-sm leading-relaxed">{challenge.action_instruction}</p>
      </div>
      {challenge.action_verification && <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Verification: {challenge.action_verification}</p>}
      {submitted ? (
        <div className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-800">⚡ Challenge complete!</div>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer rounded-xl border-2 border-slate-200 bg-white p-4 hover:border-amber-300 transition">
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="h-5 w-5 rounded accent-amber-500" />
            <span className="text-sm font-bold text-slate-700">I completed this challenge!</span>
          </label>
          <button onClick={() => { setSubmitted(true); setTimeout(() => onComplete("completed"), 800); }} disabled={!checked}
            className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600 transition disabled:opacity-40">
            Mark Complete ⚡
          </button>
        </div>
      )}
    </div>
  );
}

// ── Video ──────────────────────────────────────────────────────
function VideoChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (r: string) => void }) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const videoUrl = challenge.video_url ?? "";
  const embedUrl = videoUrl.includes("youtube.com/watch?v=") ? videoUrl.replace("watch?v=", "embed/")
    : videoUrl.includes("youtu.be/") ? videoUrl.replace("youtu.be/", "www.youtube.com/embed/") : videoUrl;
  return (
    <div className="space-y-4">
      {videoUrl && <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-video">
        <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Challenge video" />
      </div>}
      {challenge.video_prompt && <>
        <p className="font-bold text-slate-800">{challenge.video_prompt}</p>
        <textarea value={text} onChange={e => setText(e.target.value)} disabled={submitted} rows={4}
          placeholder="Write your response..." className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 focus:border-rose-400 focus:outline-none resize-none" />
      </>}
      {submitted ? (
        <div className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-800">🎬 Great response!</div>
      ) : (
        <button onClick={() => { setSubmitted(true); setTimeout(() => onComplete(text), 800); }} disabled={text.trim().length < 10 && !!challenge.video_prompt}
          className="w-full rounded-xl bg-rose-500 py-3 text-sm font-bold text-white hover:bg-rose-600 transition disabled:opacity-40">
          Submit Response
        </button>
      )}
    </div>
  );
}

// ── Word Unscramble ────────────────────────────────────────────
function UnscrambleChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (r: string) => void }) {
  const word = (challenge.unscramble_word ?? "").toUpperCase();
  const [letters, setLetters] = useState<string[]>(() => word.split("").sort(() => Math.random() - 0.5));
  const [answer, setAnswer] = useState<string[]>([]);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);

  function pickLetter(i: number) {
    if (result) return;
    setAnswer(a => [...a, letters[i]]);
    setLetters(l => l.filter((_, idx) => idx !== i));
  }

  function removeLetter(i: number) {
    if (result) return;
    setLetters(l => [...l, answer[i]]);
    setAnswer(a => a.filter((_, idx) => idx !== i));
  }

  function check() {
    const isCorrect = answer.join("") === word;
    setResult(isCorrect ? "correct" : "wrong");
    if (isCorrect) setTimeout(() => onComplete(answer.join("")), 1000);
  }

  function reset() {
    setLetters(word.split("").sort(() => Math.random() - 0.5));
    setAnswer([]);
    setResult(null);
  }

  return (
    <div className="space-y-4">
      {challenge.unscramble_hint && <p className="text-sm font-semibold text-slate-500 italic">Hint: {challenge.unscramble_hint}</p>}
      {/* Answer slots */}
      <div className="flex flex-wrap gap-2 min-h-12 rounded-2xl border-2 border-orange-200 bg-orange-50 p-3">
        {answer.length === 0 && <span className="text-sm font-semibold text-orange-300 self-center">Tap letters below to build your answer...</span>}
        {answer.map((l, i) => (
          <button key={i} onClick={() => removeLetter(i)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-sm font-black text-white hover:bg-orange-600 transition">
            {l}
          </button>
        ))}
      </div>
      {/* Scrambled letters */}
      <div className="flex flex-wrap gap-2">
        {letters.map((l, i) => (
          <button key={i} onClick={() => pickLetter(i)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-sm font-black text-slate-700 hover:border-orange-300 hover:bg-orange-50 transition">
            {l}
          </button>
        ))}
      </div>
      {result === "correct" && <div className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-800">🎉 Correct! Well done!</div>}
      {result === "wrong" && (
        <div className="space-y-2">
          <div className="rounded-xl bg-rose-100 px-4 py-3 text-sm font-bold text-rose-800">❌ Not quite — try again!</div>
          <button onClick={reset} className="w-full rounded-xl border-2 border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Reset</button>
        </div>
      )}
      {!result && answer.length === word.length && (
        <button onClick={check} className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 transition">Check Answer</button>
      )}
    </div>
  );
}

// ── Fill in the Blank ──────────────────────────────────────────
function FillBlankChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (r: string) => void }) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const sentence = challenge.fill_blank_sentence ?? "";
  const answer = (challenge.fill_blank_answer ?? "").toLowerCase().trim();
  const parts = sentence.split("___");

  function check() {
    const isCorrect = input.toLowerCase().trim() === answer;
    setCorrect(isCorrect);
    setSubmitted(true);
    if (isCorrect) setTimeout(() => onComplete(input), 1000);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-lime-200 bg-lime-50 p-5">
        <p className="text-base font-bold text-slate-800 leading-relaxed">
          {parts[0]}
          <span className="inline-block mx-1 min-w-24 border-b-2 border-slate-800 px-2">
            {submitted ? <span className={correct ? "text-emerald-600" : "text-rose-600"}>{input}</span> : input || "___"}
          </span>
          {parts[1]}
        </p>
      </div>
      {challenge.fill_blank_hint && <p className="text-xs font-semibold text-slate-500 italic">Hint: {challenge.fill_blank_hint}</p>}
      {!submitted && (
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && check()}
            placeholder="Type your answer..."
            className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 focus:border-lime-400 focus:outline-none" />
          <button onClick={check} disabled={!input.trim()}
            className="rounded-xl bg-lime-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-lime-700 transition disabled:opacity-40">
            Check
          </button>
        </div>
      )}
      {submitted && (
        <div className={`rounded-xl px-4 py-3 text-sm font-bold ${correct ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
          {correct ? "🎉 Correct!" : `❌ The answer was: "${challenge.fill_blank_answer}"`}
        </div>
      )}
    </div>
  );
}

// ── Word Search ────────────────────────────────────────────────
function WordSearchChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (r: string) => void }) {
  const words = Array.isArray(challenge.word_search_words) ? challenge.word_search_words
    : typeof challenge.word_search_words === "string" ? (() => { try { return JSON.parse(challenge.word_search_words as string); } catch { return []; } })()
    : [];
  const rawGrid = challenge.word_search_grid;
  const grid = Array.isArray(rawGrid) ? rawGrid
    : typeof rawGrid === "string" ? (() => { try { return JSON.parse(rawGrid); } catch { return generateWordSearchGrid(words); } })()
    : generateWordSearchGrid(words);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState<number[][]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  function cellKey(r: number, c: number) { return `${r},${c}`; }

  function handleCellClick(r: number, c: number) {
    if (done) return;
    const key = cellKey(r, c);
    const newSelecting = [...selecting, [r, c]];
    setSelecting(newSelecting);
    setSelected(new Set(newSelecting.map(([rr, cc]) => cellKey(rr, cc))));
    // Check if selection forms a word
    const selectedLetters = newSelecting.map(([rr, cc]) => grid[rr][cc]).join("");
    const reversed = selectedLetters.split("").reverse().join("");
    const matchedWord = words.find((w: string) => w === selectedLetters || w === reversed);
    if (matchedWord) {
      const newFound = new Set([...found, matchedWord]);
      setFound(newFound);
      setSelecting([]);
      setSelected(new Set());
      if (newFound.size === words.length) {
        setDone(true);
        setTimeout(() => onComplete(words.join(",")), 800);
      }
    } else if (newSelecting.length > Math.max(...words.map((w: string) => w.length))) {
      setSelecting([]);
      setSelected(new Set());
    }
  }

  return (
    <div className="space-y-4">
      {/* Word list */}
      <div className="flex flex-wrap gap-2">
        {words.map((w: string) => (
          <span key={w} className={`rounded-lg px-3 py-1 text-xs font-black transition ${found.has(w) ? "bg-emerald-500 text-white line-through" : "bg-slate-100 text-slate-700"}`}>
            {w}
          </span>
        ))}
      </div>
      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block rounded-2xl border-2 border-teal-200 bg-teal-50 p-3">
          {grid.map((row: string[], r: number) => (
            <div key={r} className="flex">
              {row.map((cell: string | number, c: number) => {
                const key = cellKey(r, c);
                const isSelected = selected.has(key);
                return (
                  <button key={c} onClick={() => handleCellClick(r, c)}
                    className={`flex h-8 w-8 items-center justify-center rounded text-xs font-black transition ${isSelected ? "bg-teal-500 text-white" : "text-slate-700 hover:bg-teal-100"}`}>
                    {cell}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {done && <div className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-800">🎉 All words found!</div>}
    </div>
  );
}

function generateWordSearchGrid(words: string[]): string[][] {
  const size = 10;
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  // Simple placement - just place words horizontally for now
  words.forEach((word, wi) => {
    const row = wi % size;
    for (let i = 0; i < Math.min(word.length, size); i++) {
      grid[row][i] = word[i];
    }
  });
  // Fill remaining with random letters
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
    }
  }
  return grid;
}

// ── Hidden Object ──────────────────────────────────────────────
function HiddenObjectChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (r: string) => void }) {
  const targets = challenge.hidden_object_targets ?? [];
  const [found, setFound] = useState<Set<number>>(new Set());
  const [clicks, setClicks] = useState<{ x: number; y: number; correct: boolean }[]>([]);
  const imgRef = useRef<HTMLDivElement>(null);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    // Check if click is near a target (within 5%)
    const hitIdx = targets.findIndex((t, i) => !found.has(i) && Math.abs(t.x - x) < 5 && Math.abs(t.y - y) < 5);
    if (hitIdx >= 0) {
      const newFound = new Set([...found, hitIdx]);
      setFound(newFound);
      setClicks(c => [...c, { x, y, correct: true }]);
      if (newFound.size === targets.length) setTimeout(() => onComplete("found_all"), 800);
    } else {
      setClicks(c => [...c, { x, y, correct: false }]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {targets.map((t, i) => (
          <span key={i} className={`rounded-lg px-3 py-1 text-xs font-black ${found.has(i) ? "bg-emerald-500 text-white" : "bg-pink-100 text-pink-700"}`}>
            {found.has(i) ? "✓ " : ""}{t.label}
          </span>
        ))}
      </div>
      <div ref={imgRef} className="relative rounded-2xl overflow-hidden cursor-crosshair border-2 border-pink-200"
        onClick={handleClick} style={{ userSelect: "none" }}>
        {challenge.hidden_object_image_url
          ? <img src={challenge.hidden_object_image_url} alt="Find the hidden objects" className="w-full pointer-events-none" />
          : <div className="flex h-48 items-center justify-center bg-pink-50"><p className="text-sm font-bold text-pink-400">No image uploaded</p></div>
        }
        {clicks.map((c, i) => (
          <div key={i} className={`pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${c.correct ? "border-emerald-500 bg-emerald-200" : "border-rose-400 bg-rose-200"}`}
            style={{ left: `${c.x}%`, top: `${c.y}%` }} />
        ))}
      </div>
      {found.size === targets.length && targets.length > 0 && (
        <div className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-800">🎉 You found everything!</div>
      )}
    </div>
  );
}

// ── Sudoku ─────────────────────────────────────────────────────
function SudokuHowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-black text-indigo-900">How to Play Sudoku</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl bg-indigo-50 p-3">
            <span className="text-2xl shrink-0">9️⃣</span>
            <p className="text-sm font-semibold text-indigo-800">The grid is 9×9, divided into nine 3×3 boxes.</p>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-violet-50 p-3">
            <span className="text-2xl shrink-0">1️⃣</span>
            <p className="text-sm font-semibold text-violet-800">Fill every row with the numbers 1–9. No repeats!</p>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-sky-50 p-3">
            <span className="text-2xl shrink-0">⬇️</span>
            <p className="text-sm font-semibold text-sky-800">Fill every column with the numbers 1–9. No repeats!</p>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3">
            <span className="text-2xl shrink-0">🟦</span>
            <p className="text-sm font-semibold text-emerald-800">Each 3×3 box must also contain 1–9. No repeats!</p>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3">
            <span className="text-2xl shrink-0">🔵</span>
            <p className="text-sm font-semibold text-amber-800">Gray cells are fixed — only fill in the white ones!</p>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-3">
            <span className="text-2xl shrink-0">❌</span>
            <p className="text-sm font-semibold text-rose-800">Red cells mean your number doesn't match the solution — try again!</p>
          </div>
        </div>
        <button onClick={onClose}
          className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition">
          Got it — let me play! 🎯
        </button>
      </div>
    </div>
  );
}

function SudokuChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (r: string) => void }) {
  const parsePuzzle = (data: unknown): number[][] => {
    if (Array.isArray(data)) return data;
    if (typeof data === "string") { try { return JSON.parse(data); } catch { return Array.from({ length: 9 }, () => Array(9).fill(0)); } }
    return Array.from({ length: 9 }, () => Array(9).fill(0));
  };
  const puzzle = parsePuzzle(challenge.sudoku_puzzle);
  const solution = parsePuzzle(challenge.sudoku_solution ?? challenge.sudoku_puzzle);
  const [board, setBoard] = useState<number[][]>(puzzle.map((r: number[]) => [...r]));
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [solved, setSolved] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  function handleInput(r: number, c: number, val: string) {
    if (puzzle[r][c] !== 0) return;
    const n = parseInt(val) || 0;
    if (n < 0 || n > 9) return;
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = n;
    setBoard(newBoard);
    // Remove error while typing
    setErrors(prev => { const s = new Set(prev); s.delete(`${r},${c}`); return s; });
  }

  function handleBlur(r: number, c: number) {
    if (puzzle[r][c] !== 0) return;
    const n = board[r][c];
    // Check for errors on blur
    if (n !== 0 && n !== solution[r][c]) {
      setErrors(prev => new Set([...prev, `${r},${c}`]));
    } else {
      setErrors(prev => { const s = new Set(prev); s.delete(`${r},${c}`); return s; });
    }
    // Check if solved
    const isSolved = board.every((row, ri) => row.every((cell, ci) => cell === solution[ri][ci]));
    if (isSolved) { setSolved(true); setTimeout(() => onComplete("solved"), 800); }
  }

  return (
    <div className="space-y-4">
      {showHelp && <SudokuHowToPlay onClose={() => setShowHelp(false)} />}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">Fill in the grid — each row, column, and 3×3 box needs 1–9</p>
        <button onClick={() => setShowHelp(true)}
          className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition">
          ❓ How to Play
        </button>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block rounded-2xl border-2 border-indigo-300 overflow-hidden">
          {board.map((row, r) => (
            <div key={r} className={`flex ${r % 3 === 0 && r !== 0 ? "border-t-2 border-indigo-400" : ""}`}>
              {row.map((cell: string | number, c: number) => {
                const isFixed = puzzle[r][c] !== 0;
                const isError = errors.has(`${r},${c}`);
                return (
                  <input key={c} type="number" min={1} max={9} value={cell || ""}
                    onChange={e => handleInput(r, c, e.target.value)}
                    onBlur={() => handleBlur(r, c)}
                    readOnly={isFixed}
                    className={`h-9 w-9 text-center text-sm font-black border-0 outline-none
                      ${c % 3 === 2 && c !== 8 ? "border-r-2 border-indigo-400" : ""}
                      ${isFixed ? "bg-indigo-100 text-indigo-800" : isError ? "bg-rose-100 text-rose-700" : "bg-white text-slate-700 focus:bg-indigo-50"}`} />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {solved && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 text-center space-y-2">
          <div className="text-4xl">🎉</div>
          <p className="font-display text-lg font-black text-emerald-900">Puzzle Solved!</p>
          <p className="text-sm font-bold text-emerald-700">Amazing work — you earned <span className="text-amber-600">+{challenge.xp_reward} XP</span>!</p>
        </div>
      )}
    </div>
  );
}

// ── Memory Match ───────────────────────────────────────────────
function MemoryMatchChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (r: string) => void }) {
  const pairs = Array.isArray(challenge.memory_pairs) ? challenge.memory_pairs
    : typeof challenge.memory_pairs === "string" ? (() => { try { return JSON.parse(challenge.memory_pairs as string); } catch { return []; } })()
    : [];
  const [cards] = useState(() => {
    const all = [...pairs.map((p: {a: string; b: string}, i: number) => ({ id: `a${i}`, value: p.a, pairId: i })),
                 ...pairs.map((p: {a: string; b: string}, i: number) => ({ id: `b${i}`, value: p.b, pairId: i }))]
      .sort(() => Math.random() - 0.5);
    return all;
  });
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(false);

  function flip(id: string) {
    if (checking || flipped.has(id) || matched.has(id)) return;
    const newFlipped = new Set([...flipped, id]);
    setFlipped(newFlipped);
    if (newFlipped.size === 2) {
      setChecking(true);
      const [a, b] = [...newFlipped];
      const cardA = cards.find(c => c.id === a)!;
      const cardB = cards.find(c => c.id === b)!;
      setTimeout(() => {
        if (cardA.pairId === cardB.pairId) {
          const newMatched = new Set([...matched, a, b]);
          setMatched(newMatched);
          if (newMatched.size === cards.length) setTimeout(() => onComplete("matched_all"), 600);
        }
        setFlipped(new Set());
        setChecking(false);
      }, 900);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Flip cards to find matching pairs!</p>
      <div className="grid grid-cols-4 gap-2">
        {cards.map(card => {
          const isFlipped = flipped.has(card.id) || matched.has(card.id);
          const isMatched = matched.has(card.id);
          return (
            <button key={card.id} onClick={() => flip(card.id)}
              className={`h-16 rounded-xl border-2 text-sm font-bold transition-all ${
                isMatched ? "border-emerald-400 bg-emerald-100 text-emerald-800"
                : isFlipped ? "border-purple-400 bg-purple-100 text-purple-800"
                : "border-slate-200 bg-purple-600 text-purple-600 hover:bg-purple-700"
              }`}>
              {isFlipped ? card.value : "?"}
            </button>
          );
        })}
      </div>
      {matched.size === cards.length && <div className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-800">🎉 All pairs matched!</div>}
    </div>
  );
}

// ── Sort & Rank ────────────────────────────────────────────────
function SortRankChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (r: string) => void }) {
  const correct = Array.isArray(challenge.sort_items) ? challenge.sort_items
    : typeof challenge.sort_items === "string" ? (() => { try { return JSON.parse(challenge.sort_items as string); } catch { return []; } })()
    : [];
  const [items, setItems] = useState(() => [...correct].sort(() => Math.random() - 0.5));
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  function handleDragStart(i: number) { setDragging(i); }
  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragging === null || dragging === i) return;
    const newItems = [...items];
    const [removed] = newItems.splice(dragging, 1);
    newItems.splice(i, 0, removed);
    setItems(newItems);
    setDragging(i);
  }

  function check() {
    const isCorrect = items.every((item, i) => item === correct[i]);
    setResult(isCorrect);
    setChecked(true);
    if (isCorrect) setTimeout(() => onComplete(items.join(",")), 1000);
  }

  return (
    <div className="space-y-4">
      {challenge.sort_prompt && <p className="font-bold text-slate-800">{challenge.sort_prompt}</p>}
      <p className="text-xs font-semibold text-slate-500">Drag items into the correct order</p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item} draggable={!checked}
            onDragStart={() => handleDragStart(i)}
            onDragOver={e => handleDragOver(e, i)}
            onDragEnd={() => setDragging(null)}
            className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-grab active:cursor-grabbing transition ${
              checked ? result ? "border-emerald-400 bg-emerald-50" : "border-rose-300 bg-rose-50"
              : dragging === i ? "border-cyan-400 bg-cyan-50 scale-105" : "border-slate-200 bg-white hover:border-cyan-200"
            }`}>
            <span className="text-slate-400 font-black text-sm">⠿</span>
            <span className="text-sm font-bold text-slate-800">{item}</span>
            <span className="ml-auto text-xs font-bold text-slate-400">#{i + 1}</span>
          </div>
        ))}
      </div>
      {!checked ? (
        <button onClick={check} className="w-full rounded-xl bg-cyan-600 py-3 text-sm font-bold text-white hover:bg-cyan-700 transition">
          Check Order
        </button>
      ) : (
        <div className={`rounded-xl px-4 py-3 text-sm font-bold ${result ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
          {result ? "🎉 Perfect order!" : `❌ The correct order was: ${correct.join(" → ")}`}
        </div>
      )}
    </div>
  );
}

// ── Challenge Card ─────────────────────────────────────────────
function ChallengeCard({ challenge, completed, childId, onComplete }: {
  challenge: Challenge; completed: boolean; childId: string;
  onComplete: (challengeId: string, xp: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_CONFIG[challenge.type];

  async function handleComplete(response: string) {
    const supabase = supabaseBrowser();
    await supabase.from("challenge_completions").insert({ child_id: childId, challenge_id: challenge.id, response });
    onComplete(challenge.id, challenge.xp_reward);
  }

  return (
    <div className={`rounded-2xl border-2 bg-white overflow-hidden transition ${completed ? "border-emerald-200" : cfg.border}`}>
      <button onClick={() => !completed && setExpanded(e => !e)} className="w-full flex items-center gap-4 p-5 text-left">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 text-2xl ${cfg.bg} ${cfg.border}`}>
          {completed ? "✅" : cfg.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-slate-900">{challenge.title}</span>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.bg} ${cfg.border} ${cfg.text}`}>{cfg.label}</span>
            <span className="rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">⭐ {challenge.xp_reward} XP</span>
          </div>
          {challenge.description && <p className="text-xs font-semibold text-slate-400 mt-0.5">{challenge.description}</p>}
        </div>
        {completed ? <span className="shrink-0 text-sm font-black text-emerald-600">Done ✓</span>
          : <span className="shrink-0 text-sm font-bold text-slate-400">{expanded ? "▲" : "▼"}</span>}
      </button>

      {expanded && !completed && (
        <div className={`border-t-2 ${cfg.border} ${cfg.bg} p-5`}>
          {challenge.type === "quiz"          && <QuizChallenge challenge={challenge} onComplete={handleComplete} />}
          {challenge.type === "reflection"    && <ReflectionChallenge challenge={challenge} onComplete={handleComplete} />}
          {challenge.type === "action"        && <ActionChallenge challenge={challenge} onComplete={handleComplete} />}
          {challenge.type === "video"         && <VideoChallenge challenge={challenge} onComplete={handleComplete} />}
          {challenge.type === "unscramble"    && <UnscrambleChallenge challenge={challenge} onComplete={handleComplete} />}
          {challenge.type === "fill_blank"    && <FillBlankChallenge challenge={challenge} onComplete={handleComplete} />}
          {challenge.type === "word_search"   && <WordSearchChallenge challenge={challenge} onComplete={handleComplete} />}
          {challenge.type === "hidden_object" && <HiddenObjectChallenge challenge={challenge} onComplete={handleComplete} />}
          {challenge.type === "sudoku"        && <SudokuChallenge challenge={challenge} onComplete={handleComplete} />}
          {challenge.type === "memory_match"  && <MemoryMatchChallenge challenge={challenge} onComplete={handleComplete} />}
          {challenge.type === "sort_rank"     && <SortRankChallenge challenge={challenge} onComplete={handleComplete} />}
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

  const today = new Date().toLocaleDateString("en-CA"); // en-CA gives YYYY-MM-DD in local time

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth"); return; }
    const { data: childRow } = await supabase.from("child_profiles").select("id, xp").eq("user_id", user.id).maybeSingle();
    if (!childRow) { router.replace("/auth"); return; }
    setChildId(childRow.id);
    setTotalXP(childRow.xp ?? 0);
    const [{ data: todayChallenges }, { data: completionData }] = await Promise.all([
      supabase.from("daily_challenges").select("*").eq("scheduled_date", today).eq("is_published", true).order("order_index"),
      supabase.from("challenge_completions").select("challenge_id").eq("child_id", childRow.id),
    ]);
    setChallenges((todayChallenges as Challenge[]) ?? []);
    setCompletions(new Set((completionData ?? []).map((c: { challenge_id: string }) => c.challenge_id)));
    setLoading(false);
  }

  async function handleComplete(challengeId: string, xp: number) {
    setCompletions(prev => new Set([...prev, challengeId]));
    const newXP = totalXP + xp;
    setTotalXP(newXP);
    setXpGained(xp);
    setShowXP(true);
    setTimeout(() => setShowXP(false), 3000);
    if (childId) await supabase.from("child_profiles").update({ xp: newXP }).eq("id", childId);
  }

  const completedCount = challenges.filter(c => completions.has(c.id)).length;
  const allDone = challenges.length > 0 && completedCount === challenges.length;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      {showXP && (
        <div className="fixed top-6 right-6 z-50 rounded-2xl bg-amber-500 px-5 py-3 shadow-lg animate-bounce">
          <p className="font-display text-lg font-black text-white">+{xpGained} XP! ⭐</p>
        </div>
      )}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 p-8 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="text-5xl mb-3">⚡</div>
        <h1 className="font-display text-3xl font-black">Daily Challenges</h1>
        <p className="mt-1 text-white/80 font-semibold text-sm">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{challenges.length} challenges today</span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{completedCount} completed</span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">⭐ {totalXP} total XP</span>
        </div>
        {challenges.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs font-bold text-white/80 mb-1.5">
              <span>Today's progress</span><span>{Math.round((completedCount / challenges.length) * 100)}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${(completedCount / challenges.length) * 100}%` }} />
            </div>
          </div>
        )}
      </div>
      {allDone && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6 text-center space-y-2">
          <div className="text-5xl">🏆</div>
          <h2 className="font-display text-xl font-black text-emerald-900">All challenges complete!</h2>
          <p className="text-sm font-semibold text-emerald-700">Amazing work — come back tomorrow for new challenges!</p>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-16"><div className="text-4xl animate-bounce">⚡</div></div>
      ) : challenges.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center space-y-3">
          <div className="text-5xl">📅</div>
          <h2 className="font-display text-xl font-bold text-slate-600">No challenges today</h2>
          <p className="text-sm font-semibold text-slate-400">Check back tomorrow — new challenges are added daily!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map(challenge => (
            <ChallengeCard key={challenge.id} challenge={challenge}
              completed={completions.has(challenge.id)} childId={childId ?? ""} onComplete={handleComplete} />
          ))}
        </div>
      )}
      <button onClick={() => router.back()} className="w-full rounded-2xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition">
        ← Back to Dashboard
      </button>
    </div>
  );
}