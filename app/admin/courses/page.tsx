"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";
import { CMSTable, CMSModal, Field, inputCls, selectCls, textareaCls } from "../components/CMSTable";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  level: string;
  duration_minutes: number;
  is_published: boolean;
}

const BLANK: Omit<Course, "id"> = {
  title: "", slug: "", description: "", category: "cooking",
  level: "seed", duration_minutes: 60, is_published: false,
};

const CATEGORIES = ["cooking","coding","gardening","money","art","science","music","writing"];

const LEVELS = [
  { value: "seed",      label: "1 — Seed"      },
  { value: "sprout",    label: "2 — Sprout"    },
  { value: "sapling",   label: "3 — Sapling"   },
  { value: "tree",      label: "4 — Tree"      },
  { value: "forest",    label: "5 — Forest"    },
  { value: "ecosystem", label: "6 — Ecosystem" },
];

const LEVEL_ORDER: Record<string, number> = {
  seed: 1, sprout: 2, sapling: 3, tree: 4, forest: 5, ecosystem: 6,
};

export default function AdminCourses() {
  const supabase = supabaseBrowser();
  const [rows, setRows]       = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm]       = useState<Omit<Course, "id">>(BLANK);
  const [busy, setBusy]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
    setRows((data as Course[]) ?? []);
    setLoading(false);
  }

  function openAdd() { setEditing(null); setForm(BLANK); setModal(true); setSaveError(null); }
  function openEdit(row: Course) { setEditing(row); setForm({ ...row }); setModal(true); setSaveError(null); }

  function set(key: keyof Omit<Course,"id">, val: unknown) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    if (!form.title.trim()) return;
    setBusy(true);
    setSaveError(null);

    if (editing) {
      const { error } = await supabase.from("courses").update(form).eq("id", editing.id);
      if (error) { setSaveError(error.message); setBusy(false); return; }
    } else {
      const slug = form.slug.trim() || form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { error } = await supabase.from("courses").insert({ ...form, slug });
      if (error) { setSaveError(error.message); setBusy(false); return; }
    }

    await load();
    setModal(false);
    setBusy(false);
  }

  async function del(id: string) {
    await supabase.from("courses").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  // Convert minutes to hours for display
  function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  return (
    <>
      <CMSTable
        title="Courses" icon="📚"
        rows={rows} loading={loading}
        onAdd={openAdd} onEdit={openEdit} onDelete={del}
        addLabel="Add Course"
        columns={[
          { key: "title", label: "Title" },
          { key: "category", label: "Category", render: (r) => <span className="capitalize">{r.category}</span> },
          { key: "level", label: "Level", render: (r) => (
            <span className="capitalize whitespace-nowrap">{LEVEL_ORDER[r.level] ?? "?"}. {r.level}</span>
          )},
          { key: "duration_minutes", label: "Duration", render: (r) => formatDuration(r.duration_minutes) },
          {
            key: "is_published", label: "Status",
            render: (r) => (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                r.is_published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}>
                {r.is_published ? "Published" : "Draft"}
              </span>
            ),
          },
          {
            key: "id", label: "Lessons",
            render: (r) => (
              <a href={`/admin/courses/${r.id}/lessons`}
                className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 hover:bg-violet-100 transition whitespace-nowrap">
                Manage →
              </a>
            ),
          },
        ]}
      />

      {modal && (
        <CMSModal
          title={editing ? "Edit Course" : "Add Course"}
          onClose={() => setModal(false)}
          onSave={save}
          busy={busy}
        >
          <Field label="Title *">
            <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Kitchen Basics" />
          </Field>
          <Field label="Slug (auto-generated if blank)">
            <input className={inputCls} value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="e.g. kitchen-basics" />
          </Field>
          <Field label="Description">
            <textarea className={textareaCls} rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What will kids learn?" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select className={selectCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </Field>
            <Field label="Level">
              <select className={selectCls} value={form.level} onChange={(e) => set("level", e.target.value)}>
                {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Duration (hours)">
            <div className="flex items-center gap-3">
              <input
                className={inputCls}
                type="number"
                min={0.5}
                step={0.5}
                value={(form.duration_minutes / 60).toFixed(1)}
                onChange={(e) => set("duration_minutes", Math.round(Number(e.target.value) * 60))}
              />
              <span className="text-sm font-semibold text-slate-500 whitespace-nowrap">
                = {form.duration_minutes} min
              </span>
            </div>
          </Field>
          <Field label="Status">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => set("is_published", e.target.checked)}
                className="h-4 w-4 rounded accent-violet-600"
              />
              <span className="text-sm font-semibold text-slate-700">Published (visible to kids)</span>
            </label>
          </Field>
          {saveError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              ❌ {saveError}
            </div>
          )}
        </CMSModal>
      )}
    </>
  );
}