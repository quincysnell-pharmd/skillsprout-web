"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";

interface Career {
  id: string;
  title: string;
  emoji: string;
  description: string;
  brief: string;
  salary_min: number;
  salary_max: number;
  outlook: string;
  pros: string[];
  cons: string[];
  required_skills: string[];
  course_ids: string[];
  is_published: boolean;
  order_index: number;
}

interface Course { id: string; title: string; emoji?: string; }

const BLANK: Omit<Career, "id"> = {
  title: "", emoji: "💼", description: "", brief: "",
  salary_min: 0, salary_max: 0, outlook: "growing",
  pros: [""], cons: [""], required_skills: [""], course_ids: [],
  is_published: false, order_index: 0,
};

const OUTLOOK_OPTIONS = [
  { value: "growing",   label: "📈 Growing",   color: "bg-emerald-100 text-emerald-700" },
  { value: "stable",    label: "📊 Stable",    color: "bg-sky-100 text-sky-700"         },
  { value: "declining", label: "📉 Declining", color: "bg-rose-100 text-rose-700"       },
];

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition";
const textareaCls = inputCls + " resize-none";
const labelCls = "block text-xs font-bold text-slate-600 mb-1.5";

function formatSalary(n: number) {
  if (!n) return "—";
  return "$" + n.toLocaleString();
}

export default function AdminCareersPage() {
  const supabase = supabaseBrowser();
  const [careers, setCareers] = useState<Career[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Career | null>(null);
  const [adding, setAdding]   = useState(false);
  const [form, setForm]       = useState<Omit<Career, "id">>({ ...BLANK });
  const [busy, setBusy]       = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: careerData }, { data: courseData }] = await Promise.all([
      supabase.from("careers").select("*").order("order_index"),
      supabase.from("courses").select("id, title, emoji").order("title"),
    ]);
    setCareers((careerData as Career[]) ?? []);
    setCourses((courseData as Course[]) ?? []);
    setLoading(false);
  }

  function set(key: keyof Omit<Career, "id">, val: unknown) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function setArrayItem(key: "pros" | "cons" | "required_skills", idx: number, val: string) {
    setForm(f => {
      const arr = [...(f[key] as string[])];
      arr[idx] = val;
      return { ...f, [key]: arr };
    });
  }

  function addArrayItem(key: "pros" | "cons" | "required_skills") {
    setForm(f => ({ ...f, [key]: [...(f[key] as string[]), ""] }));
  }

  function removeArrayItem(key: "pros" | "cons" | "required_skills", idx: number) {
    setForm(f => ({ ...f, [key]: (f[key] as string[]).filter((_, i) => i !== idx) }));
  }

  function toggleCourse(id: string) {
    setForm(f => ({
      ...f,
      course_ids: f.course_ids.includes(id)
        ? f.course_ids.filter(c => c !== id)
        : [...f.course_ids, id],
    }));
  }

  async function save() {
    if (!form.title.trim()) return;
    setBusy(true);
    const clean = {
      ...form,
      pros: form.pros.filter(p => p.trim()),
      cons: form.cons.filter(c => c.trim()),
      required_skills: form.required_skills.filter(s => s.trim()),
    };
    if (editing) {
      await supabase.from("careers").update(clean).eq("id", editing.id);
    } else {
      await supabase.from("careers").insert({ ...clean, order_index: careers.length });
    }
    await loadData();
    setEditing(null);
    setAdding(false);
    setForm({ ...BLANK });
    setBusy(false);
  }

  async function del(id: string) {
    if (!confirm("Delete this career?")) return;
    await supabase.from("careers").delete().eq("id", id);
    setCareers(c => c.filter(x => x.id !== id));
  }

  async function togglePublish(career: Career) {
    await supabase.from("careers").update({ is_published: !career.is_published }).eq("id", career.id);
    setCareers(prev => prev.map(c => c.id === career.id ? { ...c, is_published: !c.is_published } : c));
  }

  function startEdit(career: Career) {
    setEditing(career);
    setAdding(false);
    setForm({
      title: career.title, emoji: career.emoji, description: career.description,
      brief: career.brief, salary_min: career.salary_min, salary_max: career.salary_max,
      outlook: career.outlook, pros: career.pros?.length ? career.pros : [""],
      cons: career.cons?.length ? career.cons : [""],
      required_skills: career.required_skills?.length ? career.required_skills : [""],
      course_ids: career.course_ids ?? [], is_published: career.is_published,
      order_index: career.order_index,
    });
  }

  function cancel() { setEditing(null); setAdding(false); setForm({ ...BLANK }); }

  const showForm = adding || !!editing;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-900">💼 Careers</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">Manage career cards shown to students</p>
        </div>
        {!showForm && (
          <button onClick={() => { setAdding(true); setEditing(null); setForm({ ...BLANK }); }}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 transition">
            + Add Career
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border-2 border-violet-200 bg-white p-6 shadow-sm space-y-5">
          <h3 className="font-display text-lg font-bold text-slate-900">{editing ? "Edit Career" : "New Career"}</h3>

          {/* Basic info */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Emoji</label>
              <input className={inputCls} value={form.emoji} onChange={e => set("emoji", e.target.value)} placeholder="💼" />
            </div>
            <div className="col-span-3">
              <label className={labelCls}>Title *</label>
              <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Software Engineer" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Brief Tagline</label>
            <input className={inputCls} value={form.brief} onChange={e => set("brief", e.target.value)} placeholder="One sentence description, e.g. Build apps and websites!" />
          </div>

          <div>
            <label className={labelCls}>Full Description</label>
            <textarea className={textareaCls} rows={4} value={form.description} onChange={e => set("description", e.target.value)} placeholder="What does this career involve? What does a typical day look like?" />
          </div>

          {/* Salary + Outlook */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Min Salary ($/yr)</label>
              <input className={inputCls} type="number" min={0} value={form.salary_min || ""} onChange={e => set("salary_min", Number(e.target.value))} placeholder="60000" />
            </div>
            <div>
              <label className={labelCls}>Max Salary ($/yr)</label>
              <input className={inputCls} type="number" min={0} value={form.salary_max || ""} onChange={e => set("salary_max", Number(e.target.value))} placeholder="150000" />
            </div>
            <div>
              <label className={labelCls}>Outlook</label>
              <select className={inputCls} value={form.outlook} onChange={e => set("outlook", e.target.value)}>
                {OUTLOOK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Pros */}
          <div>
            <label className={labelCls}>Pros ✅</label>
            <div className="space-y-2">
              {form.pros.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input className={inputCls} value={p} onChange={e => setArrayItem("pros", i, e.target.value)} placeholder={`Pro ${i + 1}...`} />
                  {form.pros.length > 1 && (
                    <button onClick={() => removeArrayItem("pros", i)} className="rounded-xl border border-rose-200 px-3 text-rose-500 hover:bg-rose-50 transition text-sm font-bold">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => addArrayItem("pros")} className="mt-2 rounded-xl border-2 border-dashed border-slate-200 w-full py-2 text-sm font-bold text-slate-500 hover:border-emerald-300 hover:text-emerald-600 transition">+ Add Pro</button>
          </div>

          {/* Cons */}
          <div>
            <label className={labelCls}>Cons ⚠️</label>
            <div className="space-y-2">
              {form.cons.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input className={inputCls} value={c} onChange={e => setArrayItem("cons", i, e.target.value)} placeholder={`Con ${i + 1}...`} />
                  {form.cons.length > 1 && (
                    <button onClick={() => removeArrayItem("cons", i)} className="rounded-xl border border-rose-200 px-3 text-rose-500 hover:bg-rose-50 transition text-sm font-bold">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => addArrayItem("cons")} className="mt-2 rounded-xl border-2 border-dashed border-slate-200 w-full py-2 text-sm font-bold text-slate-500 hover:border-rose-300 hover:text-rose-600 transition">+ Add Con</button>
          </div>

          {/* Required Skills */}
          <div>
            <label className={labelCls}>Required Skills 🛠️</label>
            <div className="space-y-2">
              {form.required_skills.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input className={inputCls} value={s} onChange={e => setArrayItem("required_skills", i, e.target.value)} placeholder={`e.g. Problem solving, Math, Creativity...`} />
                  {form.required_skills.length > 1 && (
                    <button onClick={() => removeArrayItem("required_skills", i)} className="rounded-xl border border-rose-200 px-3 text-rose-500 hover:bg-rose-50 transition text-sm font-bold">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => addArrayItem("required_skills")} className="mt-2 rounded-xl border-2 border-dashed border-slate-200 w-full py-2 text-sm font-bold text-slate-500 hover:border-violet-300 hover:text-violet-600 transition">+ Add Skill</button>
          </div>

          {/* Linked Courses */}
          {courses.length > 0 && (
            <div>
              <label className={labelCls}>Linked Courses 📚</label>
              <div className="flex flex-wrap gap-2">
                {courses.map(c => (
                  <button key={c.id} onClick={() => toggleCourse(c.id)}
                    className={`rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition ${
                      form.course_ids.includes(c.id)
                        ? "border-violet-400 bg-violet-50 text-violet-700"
                        : "border-slate-200 text-slate-500 hover:border-violet-200"
                    }`}>
                    {c.emoji} {c.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_published} onChange={e => set("is_published", e.target.checked)} className="h-4 w-4 rounded accent-violet-600" />
              <span className="text-sm font-semibold text-slate-700">Published (visible to kids)</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <button onClick={save} disabled={busy}
              className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition">
              {busy ? "Saving…" : editing ? "Save Changes" : "Add Career"}
            </button>
            <button onClick={cancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Career list */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="text-4xl animate-bounce">💼</div></div>
      ) : careers.length === 0 && !showForm ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
          <div className="text-5xl mb-4">💼</div>
          <p className="font-bold text-slate-400 text-lg">No careers yet</p>
          <p className="text-sm font-semibold text-slate-400 mt-1">Click "Add Career" to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {careers.map(career => (
            <div key={career.id} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition">
              <div className="text-3xl shrink-0">{career.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900">{career.title}</div>
                {career.brief && <div className="text-xs font-semibold text-slate-500 mt-0.5 truncate">{career.brief}</div>}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {career.salary_min > 0 && (
                    <span className="text-xs font-semibold text-emerald-600">💰 {formatSalary(career.salary_min)}–{formatSalary(career.salary_max)}</span>
                  )}
                  {career.outlook && (
                    <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${OUTLOOK_OPTIONS.find(o => o.value === career.outlook)?.color ?? ""}`}>
                      {OUTLOOK_OPTIONS.find(o => o.value === career.outlook)?.label}
                    </span>
                  )}
                  <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${career.is_published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {career.is_published ? "Published" : "Draft"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => togglePublish(career)}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${career.is_published ? "border-slate-200 text-slate-600 hover:bg-slate-50" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                  {career.is_published ? "Unpublish" : "Publish"}
                </button>
                <button onClick={() => startEdit(career)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">Edit</button>
                <button onClick={() => del(career.id)}
                  className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}