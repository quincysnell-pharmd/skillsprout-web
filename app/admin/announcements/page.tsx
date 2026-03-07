"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";

interface Announcement {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  target: string;
  fire_at: string;
  expires_at: string | null;
  created_at: string;
}

interface Course { id: string; title: string; emoji?: string; }

const BLANK: Omit<Announcement, "id" | "created_at"> = {
  title: "", message: "", is_active: true,
  target: "all", fire_at: new Date().toISOString().slice(0, 16),
  expires_at: null,
};

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition";
const textareaCls = inputCls + " resize-none";
const labelCls = "block text-xs font-bold text-slate-600 mb-1.5";

function statusLabel(ann: Announcement) {
  const now = new Date();
  const fireAt = new Date(ann.fire_at);
  const expiresAt = ann.expires_at ? new Date(ann.expires_at) : null;
  if (!ann.is_active) return { label: "Disabled", color: "bg-slate-100 text-slate-500" };
  if (fireAt > now) return { label: "Scheduled", color: "bg-sky-100 text-sky-700" };
  if (expiresAt && expiresAt < now) return { label: "Expired", color: "bg-rose-100 text-rose-700" };
  return { label: "Live 🟢", color: "bg-emerald-100 text-emerald-700" };
}

export default function AdminAnnouncementsPage() {
  const supabase = supabaseBrowser();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [courses, setCourses]             = useState<Course[]>([]);
  const [loading, setLoading]             = useState(true);
  const [editing, setEditing]             = useState<Announcement | null>(null);
  const [adding, setAdding]               = useState(false);
  const [form, setForm]                   = useState<Omit<Announcement, "id" | "created_at">>({ ...BLANK });
  const [busy, setBusy]                   = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: annData }, { data: courseData }] = await Promise.all([
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("id, title, emoji").order("title"),
    ]);
    setAnnouncements((annData as Announcement[]) ?? []);
    setCourses((courseData as Course[]) ?? []);
    setLoading(false);
  }

  function set(key: keyof Omit<Announcement, "id" | "created_at">, val: unknown) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function save() {
    if (!form.title.trim() || !form.message.trim()) return;
    setBusy(true);
    const payload = {
      ...form,
      fire_at: new Date(form.fire_at).toISOString(),
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    if (editing) {
      await supabase.from("announcements").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("announcements").insert(payload);
    }
    await loadData();
    setEditing(null);
    setAdding(false);
    setForm({ ...BLANK, fire_at: new Date().toISOString().slice(0, 16) });
    setBusy(false);
  }

  async function del(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    setAnnouncements(a => a.filter(x => x.id !== id));
  }

  async function toggle(ann: Announcement) {
    await supabase.from("announcements").update({ is_active: !ann.is_active }).eq("id", ann.id);
    setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, is_active: !a.is_active } : a));
  }

  function startEdit(ann: Announcement) {
    setEditing(ann);
    setAdding(false);
    setForm({
      title: ann.title, message: ann.message, is_active: ann.is_active,
      target: ann.target,
      fire_at: new Date(ann.fire_at).toISOString().slice(0, 16),
      expires_at: ann.expires_at ? new Date(ann.expires_at).toISOString().slice(0, 16) : null,
    });
  }

  function cancel() {
    setEditing(null);
    setAdding(false);
    setForm({ ...BLANK, fire_at: new Date().toISOString().slice(0, 16) });
  }

  const showForm = adding || !!editing;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-900">📣 Announcements</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">Push notices and banners to the kid dashboard</p>
        </div>
        {!showForm && (
          <button onClick={() => { setAdding(true); setEditing(null); setForm({ ...BLANK, fire_at: new Date().toISOString().slice(0, 16) }); }}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 transition">
            + New Announcement
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border-2 border-violet-200 bg-white p-6 shadow-sm space-y-5">
          <h3 className="font-display text-lg font-bold text-slate-900">{editing ? "Edit Announcement" : "New Announcement"}</h3>

          <div>
            <label className={labelCls}>Title *</label>
            <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. 🎉 New courses available!" />
          </div>

          <div>
            <label className={labelCls}>Message *</label>
            <textarea className={textareaCls} rows={3} value={form.message} onChange={e => set("message", e.target.value)} placeholder="What do you want to tell kids? Keep it fun and encouraging!" />
          </div>

          {/* Target */}
          <div>
            <label className={labelCls}>Target Audience</label>
            <select className={inputCls} value={form.target} onChange={e => set("target", e.target.value)}>
              <option value="all">👥 All kids</option>
              {courses.map(c => (
                <option key={c.id} value={`course:${c.id}`}>{c.emoji} Kids enrolled in {c.title}</option>
              ))}
            </select>
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Send At (fires at this time) *</label>
              <input className={inputCls} type="datetime-local" value={form.fire_at}
                onChange={e => set("fire_at", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Expires At <span className="text-slate-400">(optional)</span></label>
              <input className={inputCls} type="datetime-local" value={form.expires_at ?? ""}
                onChange={e => set("expires_at", e.target.value || null)} />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} className="h-4 w-4 rounded accent-violet-600" />
              <span className="text-sm font-semibold text-slate-700">Active (show to kids when fire time is reached)</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <button onClick={save} disabled={busy}
              className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition">
              {busy ? "Saving…" : editing ? "Save Changes" : "Create Announcement"}
            </button>
            <button onClick={cancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Announcement list */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="text-4xl animate-bounce">📣</div></div>
      ) : announcements.length === 0 && !showForm ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
          <div className="text-5xl mb-4">📣</div>
          <p className="font-bold text-slate-400 text-lg">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(ann => {
            const status = statusLabel(ann);
            return (
              <div key={ann.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{ann.title}</span>
                      <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${status.color}`}>{status.label}</span>
                      {ann.target !== "all" && (
                        <span className="text-xs font-semibold text-violet-600 bg-violet-50 rounded-full px-2 py-0.5">
                          🎯 {courses.find(c => `course:${c.id}` === ann.target)?.title ?? ann.target}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{ann.message}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs font-semibold text-slate-400">
                      <span>🕐 Fires: {new Date(ann.fire_at).toLocaleString()}</span>
                      {ann.expires_at && <span>⏳ Expires: {new Date(ann.expires_at).toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => toggle(ann)}
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                        ann.is_active
                          ? "border-slate-200 text-slate-600 hover:bg-slate-50"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}>
                      {ann.is_active ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => startEdit(ann)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">Edit</button>
                    <button onClick={() => del(ann.id)}
                      className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition">Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}