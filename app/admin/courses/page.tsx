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
  level: "seedling", duration_minutes: 30, is_published: false,
};

const CATEGORIES = ["cooking","coding","gardening","money","art","science","music","writing"];
const LEVELS = ["seedling","sprout","bloom","harvest"];

const LEVEL_ORDER: Record<string, number> = {
  seedling: 1, sprout: 2, bloom: 3, harvest: 4,
};

export default function AdminCourses() {
  const supabase = supabaseBrowser();
  const [rows, setRows]     = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm]     = useState<Omit<Course, "id">>(BLANK);
  const [busy, setBusy]     = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
    setRows((data as Course[]) ?? []);
    setLoading(false);
  }

  function openAdd() { setEditing(null); setForm(BLANK); setModal(true); }
  function openEdit(row: Course) { setEditing(row); setForm({ ...row }); setModal(true); }

  function set(key: keyof Omit<Course,"id">, val: unknown) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    if (!form.title.trim()) return;
    setBusy(true);
    if (editing) {
      await supabase.from("courses").update(form).eq("id", editing.id);
    } else {
      // Auto-generate slug from title if blank
      const slug = form.slug.trim() || form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      await supabase.from("courses").insert({ ...form, slug });
    }
    await load();
    setModal(false);
    setBusy(false);
  }

  async function del(id: string) {
    await supabase.from("courses").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
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
          { key: "duration_minutes", label: "Duration", render: (r) => `${r.duration_minutes} min` },
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
                {LEVELS.map((l) => <option key={l} value={l} className="capitalize">{l}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Duration (minutes)">
            <input className={inputCls} type="number" min={1} value={form.duration_minutes} onChange={(e) => set("duration_minutes", Number(e.target.value))} />
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
        </CMSModal>
      )}
    </>
  );
}