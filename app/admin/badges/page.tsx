"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";
import { CMSTable, CMSModal, Field, inputCls, textareaCls } from "../components/CMSTable";

interface Badge {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  trigger_type: string;
  trigger_value: number;
}

const BLANK: Omit<Badge, "id"> = {
  name: "", slug: "", description: "", icon: "🏅",
  trigger_type: "course_complete", trigger_value: 1,
};

const TRIGGERS = [
  { value: "course_complete",   label: "Complete N courses" },
  { value: "challenge_streak",  label: "Challenge streak (N days)" },
  { value: "xp_milestone",      label: "Reach N XP" },
  { value: "first_login",       label: "First login" },
  { value: "showcase_post",     label: "Post to showcase" },
  { value: "friend_added",      label: "Add a friend" },
];

export default function AdminBadges() {
  const supabase = supabaseBrowser();
  const [rows, setRows]       = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Badge | null>(null);
  const [form, setForm]       = useState<Omit<Badge, "id">>(BLANK);
  const [busy, setBusy]       = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("badges").select("*").order("name");
    setRows((data as Badge[]) ?? []);
    setLoading(false);
  }

  function openAdd()        { setEditing(null); setForm(BLANK); setModal(true); }
  function openEdit(r: Badge) { setEditing(r); setForm({ ...r }); setModal(true); }
  function set(key: keyof Omit<Badge,"id">, val: unknown) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    if (!form.name.trim()) return;
    setBusy(true);
    const slug = form.slug.trim() || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (editing) {
      await supabase.from("badges").update({ ...form, slug }).eq("id", editing.id);
    } else {
      await supabase.from("badges").insert({ ...form, slug });
    }
    await load();
    setModal(false);
    setBusy(false);
  }

  async function del(id: string) {
    await supabase.from("badges").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <>
      <CMSTable
        title="Badges" icon="🏅"
        rows={rows} loading={loading}
        onAdd={openAdd} onEdit={openEdit} onDelete={del}
        addLabel="Add Badge"
        columns={[
          { key: "icon", label: "Icon", render: (r) => <span className="text-2xl">{r.icon}</span> },
          { key: "name", label: "Name" },
          { key: "trigger_type", label: "Trigger", render: (r) => (
            <span className="capitalize text-xs font-bold text-slate-500">
              {TRIGGERS.find((t) => t.value === r.trigger_type)?.label ?? r.trigger_type}
            </span>
          )},
          { key: "trigger_value", label: "Value", render: (r) => `×${r.trigger_value}` },
        ]}
      />

      {modal && (
        <CMSModal
          title={editing ? "Edit Badge" : "Add Badge"}
          onClose={() => setModal(false)}
          onSave={save}
          busy={busy}
        >
          <Field label="Icon (emoji)">
            <input className={inputCls} value={form.icon} onChange={(e) => set("icon", e.target.value)} placeholder="🏅" maxLength={4} />
          </Field>
          <Field label="Name *">
            <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. First Sprout" />
          </Field>
          <Field label="Slug (auto-generated if blank)">
            <input className={inputCls} value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="e.g. first-sprout" />
          </Field>
          <Field label="Description">
            <textarea className={textareaCls} rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What did the kid do to earn this?" />
          </Field>
          <Field label="Awarded when…">
            <select
              className={inputCls}
              value={form.trigger_type}
              onChange={(e) => set("trigger_type", e.target.value)}
            >
              {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Trigger value (N)">
            <input className={inputCls} type="number" min={1} value={form.trigger_value} onChange={(e) => set("trigger_value", Number(e.target.value))} />
          </Field>
        </CMSModal>
      )}
    </>
  );
}