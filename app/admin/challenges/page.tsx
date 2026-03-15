"use client";

import { useEffect, useState } from "react";
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
  quiz_question?: string;
  quiz_options?: string[];
  quiz_correct_index?: number;
  reflection_prompt?: string;
  min_words?: number;
  action_instruction?: string;
  action_verification?: string;
  video_url?: string;
  video_prompt?: string;
  unscramble_word?: string;
  unscramble_hint?: string;
  fill_blank_sentence?: string;
  fill_blank_answer?: string;
  fill_blank_hint?: string;
  word_search_words?: string[];
  hidden_object_image_url?: string;
  hidden_object_targets?: string;
  sudoku_puzzle?: string;
  sudoku_solution?: string;
  memory_pairs?: string;
  sort_items?: string[];
  sort_prompt?: string;
  is_published: boolean;
}

const TYPE_CONFIG: Record<ChallengeType, { label: string; emoji: string; color: string }> = {
  quiz:          { label: "Quiz",          emoji: "❓", color: "bg-violet-100 text-violet-700 border-violet-200" },
  reflection:    { label: "Reflection",    emoji: "💬", color: "bg-sky-100 text-sky-700 border-sky-200"         },
  action:        { label: "Action",        emoji: "⚡", color: "bg-amber-100 text-amber-700 border-amber-200"   },
  video:         { label: "Video",         emoji: "🎬", color: "bg-rose-100 text-rose-700 border-rose-200"      },
  unscramble:    { label: "Unscramble",    emoji: "🔤", color: "bg-orange-100 text-orange-700 border-orange-200"},
  fill_blank:    { label: "Fill in Blank", emoji: "✏️", color: "bg-lime-100 text-lime-700 border-lime-200"      },
  word_search:   { label: "Word Search",   emoji: "🔍", color: "bg-teal-100 text-teal-700 border-teal-200"      },
  hidden_object: { label: "Hidden Object", emoji: "👁️", color: "bg-pink-100 text-pink-700 border-pink-200"      },
  sudoku:        { label: "Sudoku",        emoji: "🔢", color: "bg-indigo-100 text-indigo-700 border-indigo-200"},
  memory_match:  { label: "Memory Match",  emoji: "🃏", color: "bg-purple-100 text-purple-700 border-purple-200"},
  sort_rank:     { label: "Sort & Rank",   emoji: "📊", color: "bg-cyan-100 text-cyan-700 border-cyan-200"      },
};

const CATEGORIES = ["general", "cooking", "coding", "gardening", "money", "art", "science", "music", "writing"];

const BLANK: Omit<Challenge, "id"> = {
  scheduled_date: new Date().toISOString().split("T")[0],
  title: "", description: "", type: "quiz", category: "general",
  xp_reward: 10, order_index: 0,
  quiz_question: "", quiz_options: ["", "", "", ""], quiz_correct_index: 0,
  reflection_prompt: "", min_words: 20,
  action_instruction: "", action_verification: "",
  video_url: "", video_prompt: "",
  unscramble_word: "", unscramble_hint: "",
  fill_blank_sentence: "", fill_blank_answer: "", fill_blank_hint: "",
  word_search_words: [],
  hidden_object_image_url: "", hidden_object_targets: "",
  sudoku_puzzle: "", sudoku_solution: "",
  memory_pairs: "", sort_items: [], sort_prompt: "",
  is_published: true,
};

const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 focus:border-emerald-400 focus:outline-none transition";
const selectCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 focus:border-emerald-400 focus:outline-none transition";

export default function AdminDailyChallengesPage() {
  const supabase = supabaseBrowser();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [form, setForm] = useState<Omit<Challenge, "id">>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => { loadChallenges(); }, []);

  async function loadChallenges() {
    setLoading(true);
    const { data } = await supabase.from("daily_challenges").select("*").order("scheduled_date").order("order_index");
    setChallenges((data as Challenge[]) ?? []);
    setLoading(false);
  }

  function set(key: keyof Omit<Challenge, "id">, value: unknown) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function setOption(index: number, value: string) {
    const opts = [...(form.quiz_options ?? ["", "", "", ""])];
    opts[index] = value;
    setForm(f => ({ ...f, quiz_options: opts }));
  }

  function openAdd(date?: string) {
    setEditing(null);
    setForm({ ...BLANK, scheduled_date: date ?? selectedDate });
    setModal(true);
    setError(null);
  }

  function openEdit(c: Challenge) {
    setEditing(c);
    setForm({ ...c });
    setModal(true);
    setError(null);
  }

  async function save() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    const payload = { ...form, content: form.title, updated_at: new Date().toISOString() };
    if (editing) {
      const { error } = await supabase.from("daily_challenges").update(payload).eq("id", editing.id);
      if (error) { alert("Save error: " + error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("daily_challenges").insert(payload);
      if (error) { alert("Save error: " + error.message); setSaving(false); return; }
    }
    await loadChallenges();
    setModal(false);
    setSaving(false);
  }

  async function deleteChallenge(id: string) {
    if (!confirm("Delete this challenge?")) return;
    await supabase.from("daily_challenges").delete().eq("id", id);
    await loadChallenges();
  }

  async function togglePublished(c: Challenge) {
    await supabase.from("daily_challenges").update({ is_published: !c.is_published }).eq("id", c.id);
    await loadChallenges();
  }

  // Group challenges by date
  const grouped = challenges.reduce((acc, c) => {
    if (!acc[c.scheduled_date]) acc[c.scheduled_date] = [];
    acc[c.scheduled_date].push(c);
    return acc;
  }, {} as Record<string, Challenge[]>);

  const dates = Object.keys(grouped).sort();
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-900">Daily Challenges</h1>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">Schedule challenges for students — 11 types, multiple per day supported</p>
        </div>
        <button onClick={() => openAdd()}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition">
          + New Challenge
        </button>
      </div>

      {/* Date picker for quick add */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-4">
        <label className="text-sm font-bold text-slate-600">Add challenge for:</label>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-emerald-400 focus:outline-none" />
        <button onClick={() => openAdd(selectedDate)}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 transition">
          + Add for this date
        </button>
      </div>

      {/* Challenge calendar */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="text-4xl animate-bounce">⚡</div></div>
      ) : dates.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center">
          <div className="text-5xl mb-3">📅</div>
          <p className="font-bold text-slate-400">No challenges scheduled yet.</p>
          <button onClick={() => openAdd()} className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition">
            Schedule your first challenge →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {dates.map(date => {
            const isToday = date === today;
            const isPast  = date < today;
            const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
            return (
              <div key={date} className={`rounded-2xl border-2 bg-white overflow-hidden ${isToday ? "border-emerald-400" : isPast ? "border-slate-100 opacity-75" : "border-slate-200"}`}>
                <div className={`flex items-center justify-between px-5 py-3 ${isToday ? "bg-emerald-50" : "bg-slate-50"}`}>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-black text-slate-900">{dateLabel}</span>
                    {isToday && <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-black text-white">TODAY</span>}
                    {isPast && <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-black text-slate-500">PAST</span>}
                    <span className="text-xs font-bold text-slate-400">{grouped[date].length} challenge{grouped[date].length > 1 ? "s" : ""}</span>
                  </div>
                  <button onClick={() => openAdd(date)}
                    className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition">
                    + Add challenge
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {grouped[date].map(c => {
                    const cfg = TYPE_CONFIG[c.type];
                    return (
                      <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg ${cfg.color}`}>
                          {cfg.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{c.title}</span>
                            <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">⭐ {c.xp_reward} XP</span>
                            {!c.is_published && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">Draft</span>}
                          </div>
                          {c.description && <div className="text-xs font-semibold text-slate-400 mt-0.5 truncate">{c.description}</div>}
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <button onClick={() => togglePublished(c)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${c.is_published ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                            {c.is_published ? "Published" : "Draft"}
                          </button>
                          <button onClick={() => openEdit(c)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
                            Edit
                          </button>
                          <button onClick={() => deleteChallenge(c.id)}
                            className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 transition">
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-black text-slate-900">{editing ? "Edit Challenge" : "New Challenge"}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">❌ {error}</div>}

              {/* Date + Order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5 block">Date *</label>
                  <input type="date" className={inputCls} value={form.scheduled_date} onChange={e => set("scheduled_date", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5 block">Order</label>
                  <input type="number" className={inputCls} value={form.order_index} min={0} onChange={e => set("order_index", Number(e.target.value))} />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5 block">Title *</label>
                <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. What is a stock?" />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5 block">Description</label>
                <textarea className={inputCls} rows={2} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Optional short description" />
              </div>

              {/* Type + Category + XP */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5 block">Type *</label>
                  <select className={selectCls} value={form.type} onChange={e => set("type", e.target.value as ChallengeType)}>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5 block">Category</label>
                  <select className={selectCls} value={form.category} onChange={e => set("category", e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5 block">XP Reward</label>
                  <input type="number" className={inputCls} value={form.xp_reward} min={1} onChange={e => set("xp_reward", Number(e.target.value))} />
                </div>
              </div>

              {/* Type-specific fields */}
              {form.type === "quiz" && (
                <div className="rounded-2xl border-2 border-violet-100 bg-violet-50 p-4 space-y-3">
                  <p className="text-xs font-black text-violet-700 uppercase tracking-wide">Quiz Settings</p>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Question</label>
                    <input className={inputCls} value={form.quiz_question} onChange={e => set("quiz_question", e.target.value)} placeholder="e.g. What does a stock represent?" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 block">Answer Options</label>
                    {(form.quiz_options ?? ["", "", "", ""]).map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="radio" name="correct" checked={form.quiz_correct_index === i}
                          onChange={() => set("quiz_correct_index", i)}
                          className="accent-violet-600" title="Mark as correct answer" />
                        <input className={inputCls} value={opt} onChange={e => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                      </div>
                    ))}
                    <p className="text-xs font-semibold text-violet-600">● = correct answer</p>
                  </div>
                </div>
              )}

              {form.type === "reflection" && (
                <div className="rounded-2xl border-2 border-sky-100 bg-sky-50 p-4 space-y-3">
                  <p className="text-xs font-black text-sky-700 uppercase tracking-wide">Reflection Settings</p>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Prompt</label>
                    <textarea className={inputCls} rows={3} value={form.reflection_prompt} onChange={e => set("reflection_prompt", e.target.value)} placeholder="e.g. What is one thing you'd save up for if you had $100?" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Minimum words</label>
                    <input type="number" className={inputCls} value={form.min_words} min={5} onChange={e => set("min_words", Number(e.target.value))} />
                  </div>
                </div>
              )}

              {form.type === "action" && (
                <div className="rounded-2xl border-2 border-amber-100 bg-amber-50 p-4 space-y-3">
                  <p className="text-xs font-black text-amber-700 uppercase tracking-wide">Action Settings</p>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Instruction</label>
                    <textarea className={inputCls} rows={3} value={form.action_instruction} onChange={e => set("action_instruction", e.target.value)} placeholder="e.g. Cook a simple meal for your family tonight." />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Verification (how do they prove they did it?)</label>
                    <input className={inputCls} value={form.action_verification} onChange={e => set("action_verification", e.target.value)} placeholder="e.g. Check the box when done / Take a photo" />
                  </div>
                </div>
              )}

              {form.type === "video" && (
                <div className="rounded-2xl border-2 border-rose-100 bg-rose-50 p-4 space-y-3">
                  <p className="text-xs font-black text-rose-700 uppercase tracking-wide">Video Settings</p>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Video URL (YouTube or direct)</label>
                    <input className={inputCls} value={form.video_url} onChange={e => set("video_url", e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Follow-up prompt (after watching)</label>
                    <textarea className={inputCls} rows={2} value={form.video_prompt} onChange={e => set("video_prompt", e.target.value)} placeholder="e.g. What was the most surprising thing you learned?" />
                  </div>
                </div>
              )}

              {form.type === "unscramble" && (
                <div className="rounded-2xl border-2 border-orange-100 bg-orange-50 p-4 space-y-3">
                  <p className="text-xs font-black text-orange-700 uppercase tracking-wide">🔤 Unscramble Settings</p>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Word to unscramble</label>
                    <input className={inputCls} value={form.unscramble_word} onChange={e => set("unscramble_word", e.target.value.toUpperCase())} placeholder="e.g. INVEST" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Hint (optional)</label>
                    <input className={inputCls} value={form.unscramble_hint} onChange={e => set("unscramble_hint", e.target.value)} placeholder="e.g. What you do with money to make it grow" />
                  </div>
                </div>
              )}

              {form.type === "fill_blank" && (
                <div className="rounded-2xl border-2 border-lime-100 bg-lime-50 p-4 space-y-3">
                  <p className="text-xs font-black text-lime-700 uppercase tracking-wide">✏️ Fill in the Blank Settings</p>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Sentence (use ___ for the blank)</label>
                    <input className={inputCls} value={form.fill_blank_sentence} onChange={e => set("fill_blank_sentence", e.target.value)} placeholder="e.g. A ___ is a share of ownership in a company." />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Correct answer</label>
                    <input className={inputCls} value={form.fill_blank_answer} onChange={e => set("fill_blank_answer", e.target.value)} placeholder="e.g. stock" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Hint (optional)</label>
                    <input className={inputCls} value={form.fill_blank_hint} onChange={e => set("fill_blank_hint", e.target.value)} placeholder="e.g. Starts with S" />
                  </div>
                </div>
              )}

              {form.type === "word_search" && (
                <div className="rounded-2xl border-2 border-teal-100 bg-teal-50 p-4 space-y-3">
                  <p className="text-xs font-black text-teal-700 uppercase tracking-wide">🔍 Word Search Settings</p>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Words to find (one per line, uppercase)</label>
                    <textarea className={inputCls} rows={5}
                      value={(form.word_search_words ?? []).join("\n")}
                      onChange={e => set("word_search_words", e.target.value.toUpperCase().split("\n").map((w: string) => w.trim()).filter(Boolean))}
                      placeholder="STOCK&#10;INVEST&#10;MONEY&#10;SAVE" />
                    <p className="text-xs font-semibold text-teal-600 mt-1">Grid will be auto-generated from these words</p>
                  </div>
                </div>
              )}

              {form.type === "hidden_object" && (
                <div className="rounded-2xl border-2 border-pink-100 bg-pink-50 p-4 space-y-3">
                  <p className="text-xs font-black text-pink-700 uppercase tracking-wide">👁️ Hidden Object Settings</p>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Image URL</label>
                    <input className={inputCls} value={form.hidden_object_image_url} onChange={e => set("hidden_object_image_url", e.target.value)} placeholder="Paste image URL" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Objects to find (JSON: [{"{"}x:50,y:30,label:"Apple"{"}"}])</label>
                    <textarea className={inputCls} rows={3} value={form.hidden_object_targets}
                      onChange={e => set("hidden_object_targets", e.target.value)}
                      placeholder="[{x:25,y:40,label:Apple},{x:75,y:60,label:Orange}]" />
                    <p className="text-xs font-semibold text-pink-600 mt-1">x and y are percentages (0-100) from top-left</p>
                  </div>
                </div>
              )}

              {form.type === "sudoku" && (
                <div className="rounded-2xl border-2 border-indigo-100 bg-indigo-50 p-4 space-y-3">
                  <p className="text-xs font-black text-indigo-700 uppercase tracking-wide">🔢 Sudoku Settings</p>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Puzzle (9x9 JSON, 0 = empty cell)</label>
                    <textarea className={inputCls} rows={4} value={form.sudoku_puzzle}
                      onChange={e => set("sudoku_puzzle", e.target.value)}
                      placeholder={"[[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],...]"} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Solution (9x9 JSON, fully filled)</label>
                    <textarea className={inputCls} rows={4} value={form.sudoku_solution}
                      onChange={e => set("sudoku_solution", e.target.value)}
                      placeholder={"[[5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],...]"} />
                  </div>
                </div>
              )}

              {form.type === "memory_match" && (
                <div className="rounded-2xl border-2 border-purple-100 bg-purple-50 p-4 space-y-3">
                  <p className="text-xs font-black text-purple-700 uppercase tracking-wide">🃏 Memory Match Settings</p>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Pairs (JSON: [{"{"}a:"🍎",b:"Apple"{"}"}])</label>
                    <textarea className={inputCls} rows={4} value={form.memory_pairs}
                      onChange={e => set("memory_pairs", e.target.value)}
                      placeholder="Enter JSON pairs: [{a:emoji,b:description}]" />
                  </div>
                </div>
              )}

              {form.type === "sort_rank" && (
                <div className="rounded-2xl border-2 border-cyan-100 bg-cyan-50 p-4 space-y-3">
                  <p className="text-xs font-black text-cyan-700 uppercase tracking-wide">📊 Sort & Rank Settings</p>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Prompt</label>
                    <input className={inputCls} value={form.sort_prompt} onChange={e => set("sort_prompt", e.target.value)} placeholder="e.g. Order these from smallest to largest" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Items in correct order (one per line)</label>
                    <textarea className={inputCls} rows={5}
                      value={(form.sort_items ?? []).join("\n")}
                      onChange={e => set("sort_items", e.target.value.split("\n").map((w: string) => w.trim()).filter(Boolean))}
                      placeholder="Penny (1¢)&#10;Nickel (5¢)&#10;Dime (10¢)&#10;Quarter (25¢)" />
                  </div>
                </div>
              )}

              {/* Published toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_published} onChange={e => set("is_published", e.target.checked)} className="h-4 w-4 rounded accent-emerald-600" />
                <span className="text-sm font-semibold text-slate-700">Published (visible to students on scheduled date)</span>
              </label>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex gap-3">
              <button onClick={() => setModal(false)}
                className="flex-1 rounded-xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50">
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Challenge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}