"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────
type StepType = "text"|"video"|"pdf"|"image"|"audio"|"quiz"|"poll"|"matching"|"checklist"|"reflection"|"interactive"|"portfolio"|"journal";

interface Step {
  id: string;
  lesson_id: string;
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

interface PollOption { id?: string; label: string; order_index: number; }
interface ChecklistItem { id?: string; label: string; order_index: number; }
interface MatchingPair { id?: string; left_item: string; right_item: string; order_index: number; }
interface Lesson { id: string; title: string; order_index: number; }
interface Course { id: string; title: string; }

const STEP_TYPES: { type: StepType; icon: string; label: string; color: string }[] = [
  { type: "text",        icon: "📝", label: "Text",           color: "bg-slate-50 border-slate-200 text-slate-700"    },
  { type: "video",       icon: "🎬", label: "Video",          color: "bg-rose-50 border-rose-200 text-rose-700"       },
  { type: "pdf",         icon: "📄", label: "PDF",            color: "bg-amber-50 border-amber-200 text-amber-700"    },
  { type: "image",       icon: "🖼️", label: "Image",          color: "bg-sky-50 border-sky-200 text-sky-700"          },
  { type: "audio",       icon: "🎤", label: "Audio",          color: "bg-purple-50 border-purple-200 text-purple-700" },
  { type: "quiz",        icon: "❓", label: "Quiz",           color: "bg-violet-50 border-violet-200 text-violet-700" },
  { type: "poll",        icon: "📊", label: "Poll",           color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
  { type: "matching",    icon: "🔢", label: "Matching",       color: "bg-teal-50 border-teal-200 text-teal-700"       },
  { type: "checklist",   icon: "✅", label: "Checklist",      color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { type: "reflection",  icon: "💬", label: "Reflection",     color: "bg-pink-50 border-pink-200 text-pink-700"       },
  { type: "interactive", icon: "🎮", label: "Community Post", color: "bg-orange-50 border-orange-200 text-orange-700" },
  { type: "portfolio",   icon: "📈", label: "Portfolio",      color: "bg-green-50 border-green-200 text-green-700"    },
  { type: "journal",     icon: "✏️", label: "Journal Prompt", color: "bg-yellow-50 border-yellow-200 text-yellow-700"  },
];

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition";
const textareaCls = inputCls + " resize-none";

// ── Step Form ─────────────────────────────────────────────────
function StepForm({ step, onSave, onCancel, lessonId }: {
  step: Partial<Step> & { type: StepType };
  onSave: (step: Partial<Step>, extras: { pollOptions?: PollOption[]; checklistItems?: ChecklistItem[]; matchingPairs?: MatchingPair[] }) => Promise<void>;
  onCancel: () => void;
  lessonId: string;
}) {
  const [form, setForm] = useState<Partial<Step>>({ ...step });
  const [pollOptions, setPollOptions]     = useState<PollOption[]>([{ label: "", order_index: 0 }, { label: "", order_index: 1 }]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([{ label: "", order_index: 0 }]);
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>([{ left_item: "", right_item: "", order_index: 0 }]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const cfg = STEP_TYPES.find(t => t.type === step.type)!;
  const supabase = supabaseBrowser();

  async function uploadFile(file: File, bucket: string, field: keyof Step) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `steps/${lessonId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) { alert("Upload failed: " + error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    set(field, publicUrl);
    setUploading(false);
  }

  function set(key: keyof Step, val: unknown) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSave() {
    setBusy(true);
    await onSave(form, { pollOptions, checklistItems, matchingPairs });
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-100`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{cfg.icon}</span>
            <div>
              <h2 className="font-display text-lg font-black text-slate-900">{cfg.label} Step</h2>
              <p className="text-xs font-semibold text-slate-400">Fill in the content for this step</p>
            </div>
          </div>
          <button onClick={onCancel} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Title (all types) */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Step Title <span className="text-slate-400">(optional)</span></label>
            <input className={inputCls} value={form.title ?? ""} onChange={e => set("title", e.target.value)} placeholder={`e.g. ${cfg.label} title...`} />
          </div>

          {/* TEXT */}
          {step.type === "text" && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Content (Markdown supported)</label>
              <textarea className={textareaCls} rows={8} value={form.content ?? ""} onChange={e => set("content", e.target.value)} placeholder="Write your lesson content here...&#10;&#10;## Heading&#10;- Bullet point&#10;**Bold text**" />
            </div>
          )}

          {/* VIDEO */}
          {step.type === "video" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Video</label>
                {form.video_url ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3">
                    <span className="text-2xl">🎬</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-emerald-700">Video ready ✓</div>
                      <div className="text-xs text-emerald-600 truncate">{form.video_url}</div>
                    </div>
                    <button onClick={() => set("video_url", "")} className="text-xs font-bold text-rose-500 hover:text-rose-700">Remove</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 cursor-pointer hover:border-rose-300 hover:bg-rose-50 transition">
                    {uploading ? <><div className="text-2xl animate-spin">⚙️</div><span className="text-sm font-bold text-rose-600">Uploading…</span></>
                      : <><span className="text-3xl">🎬</span><span className="text-sm font-bold text-slate-600">Click to upload video</span><span className="text-xs text-slate-400">MP4, MOV, WebM</span></>}
                    <input type="file" className="hidden" accept="video/*" disabled={uploading}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "course-videos", "video_url"); }} />
                  </label>
                )}
                <input className={`${inputCls} mt-2`} value={form.video_url ?? ""} onChange={e => set("video_url", e.target.value)} placeholder="Or paste a YouTube, Vimeo, or mp4 URL" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Caption / Notes <span className="text-slate-400">(optional)</span></label>
                <textarea className={textareaCls} rows={3} value={form.content ?? ""} onChange={e => set("content", e.target.value)} placeholder="Any notes about this video..." />
              </div>
            </>
          )}

          {/* PDF */}
          {step.type === "pdf" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">PDF File</label>
                {form.pdf_url ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div className="flex-1 min-w-0"><div className="text-sm font-bold text-emerald-700">PDF ready ✓</div><div className="text-xs text-emerald-600 truncate">{form.pdf_url}</div></div>
                    <button onClick={() => set("pdf_url", "")} className="text-xs font-bold text-rose-500 hover:text-rose-700">Remove</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 cursor-pointer hover:border-amber-300 hover:bg-amber-50 transition">
                    {uploading ? <><div className="text-2xl animate-spin">⚙️</div><span className="text-sm font-bold text-amber-600">Uploading…</span></>
                      : <><span className="text-3xl">📄</span><span className="text-sm font-bold text-slate-600">Click to upload PDF</span></>}
                    <input type="file" className="hidden" accept=".pdf" disabled={uploading}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "course-files", "pdf_url"); }} />
                  </label>
                )}
                <input className={`${inputCls} mt-2`} value={form.pdf_url ?? ""} onChange={e => set("pdf_url", e.target.value)} placeholder="Or paste a PDF URL" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Description <span className="text-slate-400">(optional)</span></label>
                <textarea className={textareaCls} rows={2} value={form.content ?? ""} onChange={e => set("content", e.target.value)} placeholder="What's in this PDF?" />
              </div>
            </>
          )}

          {/* IMAGE */}
          {step.type === "image" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Image</label>
                {form.image_url ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3">
                    <img src={form.image_url} className="h-12 w-16 object-cover rounded-lg" />
                    <div className="flex-1 min-w-0"><div className="text-sm font-bold text-emerald-700">Image ready ✓</div></div>
                    <button onClick={() => set("image_url", "")} className="text-xs font-bold text-rose-500 hover:text-rose-700">Remove</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 cursor-pointer hover:border-sky-300 hover:bg-sky-50 transition">
                    {uploading ? <><div className="text-2xl animate-spin">⚙️</div><span className="text-sm font-bold text-sky-600">Uploading…</span></>
                      : <><span className="text-3xl">🖼️</span><span className="text-sm font-bold text-slate-600">Click to upload image</span><span className="text-xs text-slate-400">JPG, PNG, WebP, GIF</span></>}
                    <input type="file" className="hidden" accept="image/*" disabled={uploading}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "course-files", "image_url"); }} />
                  </label>
                )}
                <input className={`${inputCls} mt-2`} value={form.image_url ?? ""} onChange={e => set("image_url", e.target.value)} placeholder="Or paste an image URL" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Caption <span className="text-slate-400">(optional)</span></label>
                <input className={inputCls} value={form.image_caption ?? ""} onChange={e => set("image_caption", e.target.value)} placeholder="Describe the image..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Additional Notes <span className="text-slate-400">(optional)</span></label>
                <textarea className={textareaCls} rows={2} value={form.content ?? ""} onChange={e => set("content", e.target.value)} placeholder="Any context for students?" />
              </div>
            </>
          )}

          {/* AUDIO */}
          {step.type === "audio" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Audio File</label>
                {form.audio_url ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3">
                    <span className="text-2xl">🎤</span>
                    <div className="flex-1 min-w-0"><div className="text-sm font-bold text-emerald-700">Audio ready ✓</div><div className="text-xs text-emerald-600 truncate">{form.audio_url}</div></div>
                    <button onClick={() => set("audio_url", "")} className="text-xs font-bold text-rose-500 hover:text-rose-700">Remove</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition">
                    {uploading ? <><div className="text-2xl animate-spin">⚙️</div><span className="text-sm font-bold text-purple-600">Uploading…</span></>
                      : <><span className="text-3xl">🎤</span><span className="text-sm font-bold text-slate-600">Click to upload audio</span><span className="text-xs text-slate-400">MP3, WAV, M4A</span></>}
                    <input type="file" className="hidden" accept="audio/*" disabled={uploading}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "course-files", "audio_url"); }} />
                  </label>
                )}
                <input className={`${inputCls} mt-2`} value={form.audio_url ?? ""} onChange={e => set("audio_url", e.target.value)} placeholder="Or paste an audio URL (mp3, wav)" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Notes / Transcript <span className="text-slate-400">(optional)</span></label>
                <textarea className={textareaCls} rows={4} value={form.content ?? ""} onChange={e => set("content", e.target.value)} placeholder="Transcript or notes to follow along..." />
              </div>
            </>
          )}

          {/* QUIZ */}
          {step.type === "quiz" && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-center space-y-2">
              <div className="text-3xl">❓</div>
              <p className="text-sm font-bold text-violet-800">Quiz questions are managed in the Lessons page.</p>
              <p className="text-xs font-semibold text-violet-600">Go to Admin → Courses → Lessons → Edit Lesson to add quiz questions. This step will display them as a required checkpoint.</p>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 text-left">Instructions <span className="text-slate-400">(optional)</span></label>
                <textarea className={textareaCls} rows={2} value={form.content ?? ""} onChange={e => set("content", e.target.value)} placeholder="e.g. Answer these questions before moving on!" />
              </div>
            </div>
          )}

          {/* POLL */}
          {step.type === "poll" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Poll Question *</label>
                <input className={inputCls} value={form.content ?? ""} onChange={e => set("content", e.target.value)} placeholder="e.g. Which company do you think will grow the most?" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Poll Options</label>
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input className={inputCls} value={opt.label} onChange={e => setPollOptions(prev => prev.map((o, j) => j === i ? { ...o, label: e.target.value } : o))} placeholder={`Option ${i + 1}`} />
                      {pollOptions.length > 2 && (
                        <button onClick={() => setPollOptions(prev => prev.filter((_, j) => j !== i).map((o, j) => ({ ...o, order_index: j })))}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 text-rose-500 hover:bg-rose-100 transition text-sm font-bold">✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setPollOptions(prev => [...prev, { label: "", order_index: prev.length }])}
                  className="mt-2 rounded-xl border-2 border-dashed border-slate-200 w-full py-2 text-sm font-bold text-slate-500 hover:border-violet-300 hover:text-violet-600 transition">
                  + Add Option
                </button>
              </div>
            </>
          )}

          {/* MATCHING */}
          {step.type === "matching" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Instructions <span className="text-slate-400">(optional)</span></label>
                <input className={inputCls} value={form.content ?? ""} onChange={e => set("content", e.target.value)} placeholder="e.g. Match each company to what they make!" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Matching Pairs</label>
                <div className="space-y-2">
                  {matchingPairs.map((pair, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input className={inputCls} value={pair.left_item} onChange={e => setMatchingPairs(prev => prev.map((p, j) => j === i ? { ...p, left_item: e.target.value } : p))} placeholder="Left side" />
                      <span className="text-slate-400 font-bold shrink-0">↔</span>
                      <input className={inputCls} value={pair.right_item} onChange={e => setMatchingPairs(prev => prev.map((p, j) => j === i ? { ...p, right_item: e.target.value } : p))} placeholder="Right side" />
                      {matchingPairs.length > 2 && (
                        <button onClick={() => setMatchingPairs(prev => prev.filter((_, j) => j !== i).map((p, j) => ({ ...p, order_index: j })))}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-500 hover:bg-rose-100 transition text-sm font-bold shrink-0">✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setMatchingPairs(prev => [...prev, { left_item: "", right_item: "", order_index: prev.length }])}
                  className="mt-2 rounded-xl border-2 border-dashed border-slate-200 w-full py-2 text-sm font-bold text-slate-500 hover:border-teal-300 hover:text-teal-600 transition">
                  + Add Pair
                </button>
              </div>
            </>
          )}

          {/* CHECKLIST */}
          {step.type === "checklist" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Instructions <span className="text-slate-400">(optional)</span></label>
                <input className={inputCls} value={form.content ?? ""} onChange={e => set("content", e.target.value)} placeholder="e.g. Complete each step before moving on!" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Checklist Items</label>
                <div className="space-y-2">
                  {checklistItems.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input className={inputCls} value={item.label} onChange={e => setChecklistItems(prev => prev.map((it, j) => j === i ? { ...it, label: e.target.value } : it))} placeholder={`Step ${i + 1}...`} />
                      {checklistItems.length > 1 && (
                        <button onClick={() => setChecklistItems(prev => prev.filter((_, j) => j !== i).map((it, j) => ({ ...it, order_index: j })))}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 text-rose-500 hover:bg-rose-100 transition text-sm font-bold">✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setChecklistItems(prev => [...prev, { label: "", order_index: prev.length }])}
                  className="mt-2 rounded-xl border-2 border-dashed border-slate-200 w-full py-2 text-sm font-bold text-slate-500 hover:border-emerald-300 hover:text-emerald-600 transition">
                  + Add Item
                </button>
              </div>
            </>
          )}

          {/* REFLECTION */}
          {step.type === "reflection" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Reflection Prompt *</label>
                <textarea className={textareaCls} rows={3} value={form.content ?? ""} onChange={e => set("content", e.target.value)} placeholder="e.g. What was the most surprising thing you learned in this lesson?" />
              </div>
              <div className="rounded-xl border border-pink-200 bg-pink-50 px-4 py-3">
                <p className="text-xs font-bold text-pink-800">💬 Student responses are saved to their profile and can be shared to the Community feed.</p>
              </div>
            </>
          )}

          {/* INTERACTIVE (Community Post) */}
          {step.type === "interactive" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Prompt / Instructions</label>
                <textarea className={textareaCls} rows={3} value={form.content ?? ""} onChange={e => set("content", e.target.value)} placeholder="e.g. Share what you made with the community!" />
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
                <p className="text-xs font-bold text-orange-800">🎮 This step shows the community post form. Students can share a reflection, showcase, or discovery to the community feed.</p>
              </div>
            </>
          )}

          {/* JOURNAL */}
          {step.type === "journal" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Prompt Text *</label>
                <textarea className={textareaCls} rows={3} value={form.content ?? ""}
                  onChange={e => set("content", e.target.value)}
                  placeholder="e.g. Before we dive in — what do you already know about this topic? What are you curious about?" />
              </div>
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
                <p className="text-xs font-bold text-yellow-800">✏️ Private warm-up prompt. Students type their response but it is <span className="underline">not</span> saved to their profile or posted anywhere — it's just to get them thinking.</p>
              </div>
            </div>
          )}

          {step.type === "portfolio" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Prompt / Instructions</label>
                <textarea className={textareaCls} rows={3} value={form.content ?? ""} onChange={e => set("content", e.target.value)} placeholder="e.g. Pick a company you believe in and add it to your portfolio!" />
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-xs font-bold text-green-800">📈 This step shows the portfolio add form. Students pick a company, record today's price, and track it over time.</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onCancel} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 transition">Cancel</button>
          <button onClick={handleSave} disabled={busy} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60 transition">
            {busy ? "Saving..." : "Save Step ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Steps Page ─────────────────────────────────────
export default function AdminLessonStepsPage() {
  const params   = useParams();
  const router   = useRouter();
  const supabase = supabaseBrowser();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  const [lesson, setLesson]   = useState<Lesson | null>(null);
  const [course, setCourse]   = useState<Course | null>(null);
  const [steps, setSteps]     = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [editingStep, setEditingStep]   = useState<(Partial<Step> & { type: StepType }) | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [lessonId]);

  async function loadData() {
    setLoading(true);
    const [{ data: lessonData }, { data: courseData }, { data: stepsData }] = await Promise.all([
      supabase.from("lessons").select("id, title, order_index").eq("id", lessonId).maybeSingle(),
      supabase.from("courses").select("id, title").eq("id", courseId).maybeSingle(),
      supabase.from("lesson_steps").select("*").eq("lesson_id", lessonId).order("order_index"),
    ]);
    setLesson(lessonData as Lesson);
    setCourse(courseData as Course);
    setSteps((stepsData as Step[]) ?? []);
    setLoading(false);
  }

  async function saveStep(form: Partial<Step>, extras: { pollOptions?: PollOption[]; checklistItems?: ChecklistItem[]; matchingPairs?: MatchingPair[] }) {
    const isEdit = !!form.id;

    if (isEdit) {
      await supabase.from("lesson_steps").update({
        title: form.title, content: form.content, video_url: form.video_url,
        pdf_url: form.pdf_url, image_url: form.image_url, audio_url: form.audio_url,
        image_caption: form.image_caption,
      }).eq("id", form.id!);
    } else {
      const newIndex = steps.length;
      const { data: newStep } = await supabase.from("lesson_steps").insert({
        lesson_id: lessonId, order_index: newIndex, type: form.type,
        title: form.title, content: form.content, video_url: form.video_url,
        pdf_url: form.pdf_url, image_url: form.image_url, audio_url: form.audio_url,
        image_caption: form.image_caption,
      }).select().maybeSingle();

      if (newStep) {
        // Save extras for poll/checklist/matching
        if (form.type === "poll" && extras.pollOptions?.length) {
          await supabase.from("lesson_step_poll_options").insert(
            extras.pollOptions.map(o => ({ step_id: newStep.id, label: o.label, order_index: o.order_index }))
          );
        }
        if (form.type === "checklist" && extras.checklistItems?.length) {
          await supabase.from("lesson_step_checklist_items").insert(
            extras.checklistItems.map(it => ({ step_id: newStep.id, label: it.label, order_index: it.order_index }))
          );
        }
        if (form.type === "matching" && extras.matchingPairs?.length) {
          await supabase.from("lesson_step_matching_pairs").insert(
            extras.matchingPairs.map(p => ({ step_id: newStep.id, left_item: p.left_item, right_item: p.right_item, order_index: p.order_index }))
          );
        }
      }
    }

    await loadData();
    setEditingStep(null);
  }

  async function deleteStep(id: string) {
    if (!confirm("Delete this step?")) return;
    await supabase.from("lesson_steps").delete().eq("id", id);
    setSteps(prev => prev.filter(s => s.id !== id));
  }

  async function moveStep(id: string, dir: "up" | "down") {
    const idx = steps.findIndex(s => s.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === steps.length - 1) return;
    setBusy(id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    const swapStep = steps[swapIdx];
    const currentStep = steps[idx];
    await Promise.all([
      supabase.from("lesson_steps").update({ order_index: swapStep.order_index }).eq("id", currentStep.id),
      supabase.from("lesson_steps").update({ order_index: currentStep.order_index }).eq("id", swapStep.id),
    ]);
    await loadData();
    setBusy(null);
  }

  if (loading) return <div className="flex justify-center py-20"><div className="text-4xl animate-bounce">📝</div></div>;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
        <button onClick={() => router.push("/admin/courses")} className="hover:text-slate-800 transition">Courses</button>
        <span>›</span>
        <button onClick={() => router.push(`/admin/courses/${courseId}/lessons`)} className="hover:text-slate-800 transition">{course?.title}</button>
        <span>›</span>
        <span className="text-slate-800">{lesson?.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-slate-900">📝 Lesson Steps</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">Build the pages students click through in this lesson</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowTypeMenu(!showTypeMenu)}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition shadow-sm">
            ➕ Add Step
          </button>
          {showTypeMenu && (
            <div className="absolute right-0 top-12 z-20 w-72 rounded-2xl border border-slate-100 bg-white shadow-xl p-3">
              <p className="text-xs font-bold text-slate-400 mb-2 px-1">Choose a step type</p>
              <div className="grid grid-cols-2 gap-1.5">
                {STEP_TYPES.map(({ type, icon, label, color }) => (
                  <button key={type} onClick={() => { setEditingStep({ type, lesson_id: lessonId }); setShowTypeMenu(false); }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition hover:scale-105 ${color}`}>
                    <span className="text-base">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Steps list */}
      {steps.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
          <div className="text-5xl mb-4">📄</div>
          <p className="font-bold text-slate-400 text-lg">No steps yet</p>
          <p className="text-sm font-semibold text-slate-400 mt-1">Click ➕ Add Step to build your first lesson page</p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, i) => {
            const cfg = STEP_TYPES.find(t => t.type === step.type)!;
            return (
              <div key={step.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition">
                {/* Order badge */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-black text-slate-600 text-sm">
                  {i + 1}
                </div>

                {/* Type badge */}
                <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shrink-0 ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 truncate">{step.title || `${cfg.label} step`}</div>
                  {step.content && <div className="text-xs font-semibold text-slate-400 truncate mt-0.5">{step.content.slice(0, 80)}...</div>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => moveStep(step.id, "up")} disabled={i === 0 || busy === step.id}
                    className="rounded-lg border border-slate-200 p-2 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition">↑</button>
                  <button onClick={() => moveStep(step.id, "down")} disabled={i === steps.length - 1 || busy === step.id}
                    className="rounded-lg border border-slate-200 p-2 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition">↓</button>
                  <button onClick={() => setEditingStep({ ...step })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">Edit</button>
                  <button onClick={() => deleteStep(step.id)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview note */}
      {steps.length > 0 && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-center gap-3">
          <span className="text-xl">👁️</span>
          <p className="text-sm font-semibold text-slate-500">Students will click through these {steps.length} step{steps.length !== 1 ? "s" : ""} one at a time. Use ↑↓ to reorder them.</p>
        </div>
      )}

      {/* Step form modal */}
      {editingStep && (
        <StepForm
          step={editingStep}
          lessonId={lessonId}
          onSave={saveStep}
          onCancel={() => setEditingStep(null)}
        />
      )}
    </div>
  );
}