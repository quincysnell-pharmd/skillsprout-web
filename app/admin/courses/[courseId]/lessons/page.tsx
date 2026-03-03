"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────
interface Course {
  id: string;
  title: string;
  emoji?: string;
  description?: string;
  category?: string;
  level?: string;
  duration_minutes?: number;
  is_published?: boolean;
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
  video_url: string;
  video_duration: number;
  content: string;
  is_published: boolean;
  xp_reward: number;
}

interface QuizQuestion {
  id: string;
  lesson_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct: "a" | "b" | "c" | "d";
  explanation: string;
  order_index: number;
}

interface LessonFile {
  id: string;
  lesson_id: string;
  name: string;
  url: string;
  file_type: string;
  size_bytes: number;
}

interface Project {
  id: string;
  course_id: string;
  title: string;
  description: string;
  instructions: string;
  order_index: number;
  xp_reward: number;
}

const BLANK_LESSON: Omit<Lesson, "id"> = {
  course_id: "", title: "", description: "", order_index: 0,
  video_url: "", video_duration: 0, content: "", is_published: false, xp_reward: 15,
};

const BLANK_QUIZ: Omit<QuizQuestion, "id"> = {
  lesson_id: "", question: "", option_a: "", option_b: "", option_c: "", option_d: "",
  correct: "a", explanation: "", order_index: 0,
};

const BLANK_PROJECT: Omit<Project, "id"> = {
  course_id: "", title: "", description: "", instructions: "", order_index: 0, xp_reward: 50,
};

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition";
const textareaCls = `${inputCls} resize-none`;
const labelCls = "block text-xs font-bold text-slate-600 mb-1.5";

// ── QUIZ EDITOR ───────────────────────────────────────────────
function QuizEditor({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const supabase = supabaseBrowser();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [form, setForm] = useState<Omit<QuizQuestion, "id">>({ ...BLANK_QUIZ, lesson_id: lessonId });
  const [editing, setEditing] = useState<QuizQuestion | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadQuestions(); }, [lessonId]);

  async function loadQuestions() {
    const { data } = await supabase.from("quiz_questions").select("*").eq("lesson_id", lessonId).order("order_index");
    setQuestions((data as QuizQuestion[]) ?? []);
  }

  function set(key: keyof Omit<QuizQuestion, "id">, val: string | number) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    if (!form.question.trim() || !form.option_a.trim() || !form.option_b.trim()) return;
    setBusy(true);
    if (editing) {
      await supabase.from("quiz_questions").update(form).eq("id", editing.id);
    } else {
      await supabase.from("quiz_questions").insert({ ...form, order_index: questions.length });
    }
    await loadQuestions();
    setForm({ ...BLANK_QUIZ, lesson_id: lessonId });
    setEditing(null);
    setBusy(false);
  }

  async function del(id: string) {
    await supabase.from("quiz_questions").delete().eq("id", id);
    setQuestions((q) => q.filter((x) => x.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-display text-xl font-bold text-slate-900">⚡ Quiz Questions</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        {/* Existing questions */}
        {questions.length > 0 && (
          <div className="p-6 space-y-3 border-b border-slate-100">
            {questions.map((q, i) => (
              <div key={q.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-bold text-sm text-slate-800">{i + 1}. {q.question}</div>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {(["a","b","c","d"] as const).map((opt) => q[`option_${opt}` as keyof QuizQuestion] && (
                        <div key={opt} className={`text-xs font-semibold rounded-lg px-2 py-1 ${q.correct === opt ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500 border border-slate-200"}`}>
                          {opt.toUpperCase()}. {q[`option_${opt}` as keyof QuizQuestion] as string}
                          {q.correct === opt && " ✓"}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setEditing(q); setForm({ ...q }); }}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Edit</button>
                    <button onClick={() => del(q.id)}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/edit form */}
        <div className="p-6 space-y-4">
          <h3 className="font-bold text-slate-700">{editing ? "Edit Question" : "Add Question"}</h3>
          <div>
            <label className={labelCls}>Question *</label>
            <input className={inputCls} value={form.question} onChange={(e) => set("question", e.target.value)} placeholder="e.g. What temperature does water boil at?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["a","b","c","d"] as const).map((opt) => (
              <div key={opt}>
                <label className={labelCls}>Option {opt.toUpperCase()} {opt === "a" || opt === "b" ? "*" : "(optional)"}</label>
                <input className={inputCls} value={form[`option_${opt}` as keyof typeof form] as string}
                  onChange={(e) => set(`option_${opt}` as keyof Omit<QuizQuestion,"id">, e.target.value)}
                  placeholder={`Option ${opt.toUpperCase()}`} />
              </div>
            ))}
          </div>
          <div>
            <label className={labelCls}>Correct Answer *</label>
            <div className="flex gap-2">
              {(["a","b","c","d"] as const).map((opt) => (
                <button key={opt} onClick={() => set("correct", opt)}
                  className={`flex-1 rounded-xl border-2 py-2 text-sm font-bold transition ${form.correct === opt ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:border-emerald-200"}`}>
                  {opt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Explanation (shown after answering)</label>
            <input className={inputCls} value={form.explanation} onChange={(e) => set("explanation", e.target.value)} placeholder="e.g. Water boils at 100°C at sea level." />
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={busy}
              className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition">
              {busy ? "Saving…" : editing ? "Update Question" : "Add Question"}
            </button>
            {editing && (
              <button onClick={() => { setEditing(null); setForm({ ...BLANK_QUIZ, lesson_id: lessonId }); }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FILE UPLOADER ─────────────────────────────────────────────
function FileUploader({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const supabase = supabaseBrowser();
  const [files, setFiles] = useState<LessonFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadFiles(); }, [lessonId]);

  async function loadFiles() {
    const { data } = await supabase.from("lesson_files").select("*").eq("lesson_id", lessonId);
    setFiles((data as LessonFile[]) ?? []);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setProgress(0);

    const ext = file.name.split(".").pop();
    const path = `${lessonId}/${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage.from("course-files").upload(path, file);
    if (error) { alert("Upload failed: " + error.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("course-files").getPublicUrl(path);

    await supabase.from("lesson_files").insert({
      lesson_id: lessonId,
      name: file.name,
      url: publicUrl,
      file_type: ext,
      size_bytes: file.size,
    });

    await loadFiles();
    setUploading(false);
    setProgress(100);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function del(id: string, url: string) {
    await supabase.from("lesson_files").delete().eq("id", id);
    setFiles((f) => f.filter((x) => x.id !== id));
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-display text-xl font-bold text-slate-900">📎 Files & Worksheets</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {/* Upload area */}
          <label className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 cursor-pointer hover:border-violet-300 hover:bg-violet-50 transition">
            <span className="text-4xl">📤</span>
            <span className="text-sm font-bold text-slate-600">Click to upload a file (PDF, worksheet, etc.)</span>
            <span className="text-xs font-semibold text-slate-400">Max 50MB</span>
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.xlsx,.ppt,.pptx,.zip" />
          </label>

          {uploading && (
            <div className="rounded-xl bg-violet-50 border border-violet-200 p-4">
              <div className="text-sm font-bold text-violet-700 mb-2">Uploading…</div>
              <div className="h-2 rounded-full bg-violet-200 overflow-hidden">
                <div className="h-full rounded-full bg-violet-500 animate-pulse w-1/2" />
              </div>
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
                  <span className="text-2xl">{f.file_type === "pdf" ? "📄" : "📁"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">{f.name}</div>
                    <div className="text-xs font-semibold text-slate-400">{formatSize(f.size_bytes)}</div>
                  </div>
                  <a href={f.url} target="_blank" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">View</a>
                  <button onClick={() => del(f.id, f.url)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50">Delete</button>
                </div>
              ))}
            </div>
          )}

          {files.length === 0 && !uploading && (
            <p className="text-center text-sm font-semibold text-slate-400">No files uploaded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PROJECT EDITOR ────────────────────────────────────────────
function ProjectEditor({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const supabase = supabaseBrowser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState<Omit<Project, "id">>({ ...BLANK_PROJECT, course_id: courseId });
  const [editing, setEditing] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, [courseId]);

  async function load() {
    const { data } = await supabase.from("projects").select("*").eq("course_id", courseId).order("order_index");
    setProjects((data as Project[]) ?? []);
  }

  function set(key: keyof Omit<Project, "id">, val: string | number) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    if (!form.title.trim()) return;
    setBusy(true);
    if (editing) {
      await supabase.from("projects").update(form).eq("id", editing.id);
    } else {
      await supabase.from("projects").insert({ ...form, order_index: projects.length });
    }
    await load();
    setForm({ ...BLANK_PROJECT, course_id: courseId });
    setEditing(null);
    setBusy(false);
  }

  async function del(id: string) {
    await supabase.from("projects").delete().eq("id", id);
    setProjects((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-display text-xl font-bold text-slate-900">🏆 Projects</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        {projects.length > 0 && (
          <div className="p-6 space-y-3 border-b border-slate-100">
            {projects.map((p, i) => (
              <div key={p.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-bold text-sm text-slate-800">{i + 1}. {p.title}</div>
                    {p.description && <div className="text-xs text-slate-500 mt-1">{p.description}</div>}
                    <div className="text-xs font-bold text-amber-600 mt-1">⭐ {p.xp_reward} XP</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setEditing(p); setForm({ ...p }); }}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Edit</button>
                    <button onClick={() => del(p.id)}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-6 space-y-4">
          <h3 className="font-bold text-slate-700">{editing ? "Edit Project" : "Add Project"}</h3>
          <div>
            <label className={labelCls}>Title *</label>
            <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Cook a meal for your family!" />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Short summary of the project" />
          </div>
          <div>
            <label className={labelCls}>Instructions (markdown supported)</label>
            <textarea className={textareaCls} rows={5} value={form.instructions}
              onChange={(e) => set("instructions", e.target.value)}
              placeholder={"Step 1: Choose a recipe\nStep 2: Shop for ingredients\nStep 3: Cook and photograph your meal!"} />
          </div>
          <div>
            <label className={labelCls}>XP Reward</label>
            <input className={inputCls} type="number" min={0} value={form.xp_reward} onChange={(e) => set("xp_reward", Number(e.target.value))} />
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={busy}
              className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50 transition">
              {busy ? "Saving…" : editing ? "Update Project" : "Add Project"}
            </button>
            {editing && (
              <button onClick={() => { setEditing(null); setForm({ ...BLANK_PROJECT, course_id: courseId }); }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LESSON FORM ───────────────────────────────────────────────
function LessonForm({
  courseId, lesson, onSave, onCancel,
}: {
  courseId: string;
  lesson?: Lesson;
  onSave: () => void;
  onCancel: () => void;
}) {
  const supabase = supabaseBrowser();
  const [form, setForm] = useState<Omit<Lesson, "id">>(
    lesson ? { ...lesson } : { ...BLANK_LESSON, course_id: courseId }
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const videoRef = useRef<HTMLInputElement>(null);

  function set(key: keyof Omit<Lesson, "id">, val: string | number | boolean) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function uploadVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${courseId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("course-videos").upload(path, file);
    if (error) { alert("Video upload failed: " + error.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("course-videos").getPublicUrl(path);
    set("video_url", publicUrl);
    setUploading(false);
  }

  async function save() {
    if (!form.title.trim()) return;
    setBusy(true);
    if (lesson) {
      await supabase.from("lessons").update(form).eq("id", lesson.id);
    } else {
      await supabase.from("lessons").insert(form);
    }
    onSave();
    setBusy(false);
  }

  return (
    <>
      {showQuiz && lesson && <QuizEditor lessonId={lesson.id} onClose={() => setShowQuiz(false)} />}
      {showFiles && lesson && <FileUploader lessonId={lesson.id} onClose={() => setShowFiles(false)} />}

      <div className="rounded-2xl border-2 border-violet-200 bg-white p-6 shadow-sm space-y-5">
        <h3 className="font-display text-lg font-bold text-slate-900">{lesson ? "Edit Lesson" : "New Lesson"}</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Title *</label>
            <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Kitchen Safety Basics" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Description</label>
            <input className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Short lesson summary" />
          </div>
        </div>

        {/* Video upload */}
        <div>
          <label className={labelCls}>Video</label>
          {form.video_url ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3">
              <span className="text-2xl">🎬</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-emerald-700 truncate">Video uploaded ✓</div>
                <div className="text-xs text-emerald-600 truncate">{form.video_url}</div>
              </div>
              <button onClick={() => set("video_url", "")} className="text-xs font-bold text-rose-500 hover:text-rose-700">Remove</button>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 cursor-pointer hover:border-violet-300 hover:bg-violet-50 transition">
              {uploading ? (
                <>
                  <div className="text-3xl animate-spin">⚙️</div>
                  <span className="text-sm font-bold text-violet-600">Uploading video…</span>
                </>
              ) : (
                <>
                  <span className="text-3xl">🎬</span>
                  <span className="text-sm font-bold text-slate-600">Click to upload video</span>
                  <span className="text-xs text-slate-400">MP4, MOV, WebM</span>
                </>
              )}
              <input ref={videoRef} type="file" className="hidden" accept="video/*" onChange={uploadVideo} disabled={uploading} />
            </label>
          )}
          {/* Or paste URL */}
          <div className="mt-2">
            <input className={inputCls} value={form.video_url} onChange={(e) => set("video_url", e.target.value)}
              placeholder="Or paste a video URL (YouTube embed, Vimeo, etc.)" />
          </div>
        </div>

        {/* Written content */}
        <div>
          <label className={labelCls}>Written Content / Instructions (markdown supported)</label>
          <textarea className={textareaCls} rows={6} value={form.content}
            onChange={(e) => set("content", e.target.value)}
            placeholder={"## What you'll need\n- A cutting board\n- A knife\n- An adult helper\n\n## Instructions\n1. Wash your hands first..."} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>XP Reward</label>
            <input className={inputCls} type="number" min={0} value={form.xp_reward} onChange={(e) => set("xp_reward", Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>Order</label>
            <input className={inputCls} type="number" min={0} value={form.order_index} onChange={(e) => set("order_index", Number(e.target.value))} />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_published} onChange={(e) => set("is_published", e.target.checked)}
              className="h-4 w-4 rounded accent-violet-600" />
            <span className="text-sm font-semibold text-slate-700">Published (visible to kids)</span>
          </label>
        </div>

        {/* Quiz & Files buttons (only when editing existing lesson) */}
        {lesson && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            <button onClick={() => setShowQuiz(true)}
              className="rounded-xl border-2 border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-100 transition">
              ⚡ Edit Quiz Questions
            </button>
            <button onClick={() => setShowFiles(true)}
              className="rounded-xl border-2 border-sky-200 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700 hover:bg-sky-100 transition">
              📎 Manage Files
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={save} disabled={busy || uploading}
            className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition">
            {busy ? "Saving…" : lesson ? "Save Changes" : "Add Lesson"}
          </button>
          <button onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function AdminLessonsPage() {
  const params   = useParams();
  const router   = useRouter();
  const supabase = supabaseBrowser();
  const courseId = params.courseId as string;

  const [course, setCourse]     = useState<Course | null>(null);
  const [lessons, setLessons]   = useState<Lesson[]>([]);
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState(false);
  const [editing, setEditing]   = useState<Lesson | null>(null);
  const [showProject, setShowProject] = useState(false);

  useEffect(() => { if (courseId) loadData(); }, [courseId]);

  async function loadData() {
    setLoading(true);
    const [{ data: courseData }, { data: lessonData }] = await Promise.all([
      supabase.from("courses").select("id, title, emoji, description, category, level, duration_minutes, is_published").eq("id", courseId).maybeSingle(),
      supabase.from("lessons").select("*").eq("course_id", courseId).order("order_index"),
    ]);
    setCourse(courseData as Course);
    setLessons((lessonData as Lesson[]) ?? []);
    setLoading(false);
  }

  async function deleteLesson(id: string) {
    if (!confirm("Delete this lesson? This will also delete its quiz questions and files.")) return;
    await supabase.from("lessons").delete().eq("id", id);
    setLessons((l) => l.filter((x) => x.id !== id));
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-4xl animate-bounce">📚</div>
    </div>
  );

  return (
    <>
      {showProject && <ProjectEditor courseId={courseId} onClose={() => setShowProject(false)} />}

      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/admin/courses")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
            ← Back
          </button>
          <div>
          <h1 className="font-display text-2xl font-black text-slate-900">
            {course?.emoji} {course?.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-sm font-semibold text-slate-500">{lessons.length} lesson{lessons.length !== 1 ? "s" : ""}</span>
            {course?.category && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 capitalize">{course.category}</span>}
            {course?.level && <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700 capitalize">{course.level}</span>}
            {course?.duration_minutes && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{course.duration_minutes} min</span>}
            <button
              onClick={async () => {
                const newVal = !course?.is_published;
                await supabase.from("courses").update({ is_published: newVal }).eq("id", courseId);
                setCourse((c) => c ? { ...c, is_published: newVal } : c);
              }}
              className={`rounded-full px-3 py-1 text-xs font-bold transition hover:opacity-80 ${course?.is_published ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
            >
              {course?.is_published ? "✓ Published — click to unpublish" : "Draft — click to publish"}
            </button>
          </div>
          {course?.description && <p className="text-sm font-semibold text-slate-400 mt-1.5 max-w-lg">{course.description}</p>}
        </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setShowProject(true)}
              className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-100 transition">
              🏆 Manage Projects
            </button>
            <button onClick={() => { setAdding(true); setEditing(null); }}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 transition">
              + Add Lesson
            </button>
          </div>
        </div>

        {/* Add form */}
        {adding && (
          <LessonForm
            courseId={courseId}
            onSave={async () => { setAdding(false); await loadData(); }}
            onCancel={() => setAdding(false)}
          />
        )}

        {/* Lesson list */}
        {lessons.length === 0 && !adding ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="font-display text-lg font-bold text-slate-400">No lessons yet</p>
            <p className="text-sm font-semibold text-slate-400 mt-1">Click "Add Lesson" to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, i) => (
              <div key={lesson.id}>
                {editing?.id === lesson.id ? (
                  <LessonForm
                    courseId={courseId}
                    lesson={lesson}
                    onSave={async () => { setEditing(null); await loadData(); }}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-black text-violet-700">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900">{lesson.title}</div>
                      <div className="flex items-center gap-3 mt-1">
                        {lesson.video_url && <span className="text-xs font-semibold text-emerald-600">🎬 Video</span>}
                        {lesson.content && <span className="text-xs font-semibold text-sky-600">📝 Content</span>}
                        <span className="text-xs font-semibold text-amber-600">⭐ {lesson.xp_reward} XP</span>
                        <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${lesson.is_published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {lesson.is_published ? "Published" : "Draft"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => { setEditing(lesson); setAdding(false); }}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
                        Edit
                      </button>
                      <button onClick={() => deleteLesson(lesson.id)}
                        className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition">
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}