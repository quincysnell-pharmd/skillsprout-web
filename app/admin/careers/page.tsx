"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";
import { CMSTable, CMSModal, Field, inputCls, textareaCls } from "../components/CMSTable";

interface Career {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: string;
  fun_fact: string;
  skills: string;       // stored as comma-separated, edited as text
  is_published: boolean;
}

const BLANK: Omit<Career, "id"> = {
  title: "", category: "science", description: "", icon: "🚀",
  fun_fact: "", skills: "", is_published: false,
};

const CATEGORIES = ["science","technology","arts","business","trades","health","education","environment"];

export default function AdminCareers() {
  const supabase = supabaseBrowser();
  const [rows, setRows]       = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Career | null>(null);
  const [form, setForm]       = useState<Omit<Career, "id">>(BLANK);
  const [busy, setBusy]       = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("career_interests")
      .select("*")
      .order("title");
    setRows((data as Career[]) ?? []);
    setLoading(false);
  }

  function openAdd()          { setEditing(null); setForm(BLANK); setModal(true); }
  function openEdit(r: Career) { setEditing(r); setForm({ ...r }); setModal(true); }
  function set(key: keyof Omit<Career,"id">, val: unknown) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    if (!form.title.trim()) return;
    setBusy(true);
    if (editing) {
      await supabase.from("career_interests").update(form).eq("id", editing.id);
    } else {
      await supabase.from("career_interests").insert(form);
    }
    await load();
    setModal(false);
    setBusy(false);
  }

  async function del(id: string) {
    await supabase.from("career_interests").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <>
      <CMSTable
        title="Careers" icon="🚀"
        rows={rows} loading={loading}
        onAdd={openAdd} onEdit={openEdit} onDelete={del}
        addLabel="Add Career"
        columns={[
          { key: "icon", label: "Icon", render: (r) => <span className="text-2xl">{r.icon}</span> },
          { key: "title", label: "Title" },
          { key: "category", label: "Category", render: (r) => <span className="capitalize">{r.category}</span> },
          { key: "is_published", label: "Status", render: (r) => (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              r.is_published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}>
              {r.is_published ? "Published" : "Draft"}
            </span>
          )},
        ]}
      />

      {modal && (
        <CMSModal
          title={editing ? "Edit Career" : "Add Career"}
          onClose={() => setModal(false)}
          onSave={save}
          busy={busy}
        >
          <div className="grid grid-cols-4 gap-4">
            <Field label="Icon">
              <input className={inputCls} value={form.icon} onChange={(e) => set("icon", e.target.value)} placeholder="🚀" maxLength={4} />
            </Field>
            <div className="col-span-3">
              <Field label="Title *">
                <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Marine Biologist" />
              </Field>
            </div>
          </div>
          <Field label="Category">
            <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </Field>
          <Field label="Description">
            <textarea className={textareaCls} rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What do people in this career do?" />
          </Field>
          <Field label="Fun Fact">
            <input className={inputCls} value={form.fun_fact} onChange={(e) => set("fun_fact", e.target.value)} placeholder="e.g. Marine biologists can dive 40m deep!" />
          </Field>
          <Field label="Skills needed (comma-separated)">
            <input className={inputCls} value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="e.g. curiosity, swimming, science" />
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