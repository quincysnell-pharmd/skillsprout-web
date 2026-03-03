"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";
import { CMSTable, CMSModal, Field, inputCls, selectCls, textareaCls } from "../components/CMSTable";

interface Challenge {
  id: string;
  title: string;
  type: string;
  prompt: string;
  answer: string;
  materials: string;
  category: string;
  difficulty: string;
  active_date: string;
}

const BLANK: Omit<Challenge, "id"> = {
  title: "", type: "hands-on", prompt: "", answer: "",
  materials: "", category: "cooking", difficulty: "easy", active_date: "",
};

const TYPES      = ["hands-on","trivia","riddle","word-scramble","wordsearch"];
const CATEGORIES = ["cooking","coding","gardening","money","art","science","music","writing"];
const DIFFS      = ["easy","medium","hard"];

export default function AdminChallenges() {
  const supabase = supabaseBrowser();
  const [rows, setRows]       = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [form, setForm]       = useState<Omit<Challenge, "id">>(BLANK);
  const [busy, setBusy]       = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("daily_challenges")
      .select("*")
      .order("active_date", { ascending: false });
    setRows((data as Challenge[]) ?? []);
    setLoading(false);
  }

  function openAdd()       { setEditing(null); setForm(BLANK); setModal(true); }
  function openEdit(r: Challenge) { setEditing(r); setForm({ ...r }); setModal(true); }
  function set(key: keyof Omit<Challenge,"id">, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    if (!form.title.trim() || !form.prompt.trim()) return;
    setBusy(true);
    if (editing) {
      await supabase.from("daily_challenges").update(form).eq("id", editing.id);
    } else {
      await supabase.from("daily_challenges").insert(form);
    }
    await load();
    setModal(false);
    setBusy(false);
  }

  async function del(id: string) {
    await supabase.from("daily_challenges").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <>
      <CMSTable
        title="Daily Challenges" icon="⚡"
        rows={rows} loading={loading}
        onAdd={openAdd} onEdit={openEdit} onDelete={del}
        addLabel="Add Challenge"
        columns={[
          { key: "title", label: "Title" },
          { key: "type", label: "Type", render: (r) => <span className="capitalize">{r.type}</span> },
          { key: "category", label: "Category", render: (r) => <span className="capitalize">{r.category}</span> },
          { key: "difficulty", label: "Difficulty", render: (r) => (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              r.difficulty === "easy" ? "bg-emerald-100 text-emerald-700" :
              r.difficulty === "medium" ? "bg-amber-100 text-amber-700" :
              "bg-rose-100 text-rose-700"
            }`}>{r.difficulty}</span>
          )},
          { key: "active_date", label: "Date", render: (r) => r.active_date || <span className="text-slate-400">Any day</span> },
        ]}
      />

      {modal && (
        <CMSModal
          title={editing ? "Edit Challenge" : "Add Challenge"}
          onClose={() => setModal(false)}
          onSave={save}
          busy={busy}
        >
          <Field label="Title *">
            <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Make a No-Bake Snack" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select className={selectCls} value={form.type} onChange={(e) => set("type", e.target.value)}>
                {TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select className={selectCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Prompt / Instructions *">
            <textarea className={textareaCls} rows={4} value={form.prompt} onChange={(e) => set("prompt", e.target.value)} placeholder="Describe what the kid needs to do..." />
          </Field>
          <Field label="Answer / Solution (for trivia/riddles)">
            <input className={inputCls} value={form.answer} onChange={(e) => set("answer", e.target.value)} placeholder="Correct answer" />
          </Field>
          <Field label="Materials needed (household items only)">
            <input className={inputCls} value={form.materials} onChange={(e) => set("materials", e.target.value)} placeholder="e.g. bowl, spoon, peanut butter" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Difficulty">
              <select className={selectCls} value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
                {DIFFS.map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
              </select>
            </Field>
            <Field label="Active Date (optional)">
              <input className={inputCls} type="date" value={form.active_date} onChange={(e) => set("active_date", e.target.value)} />
            </Field>
          </div>
        </CMSModal>
      )}
    </>
  );
}