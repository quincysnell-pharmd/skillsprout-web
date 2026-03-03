"use client";

import { useState } from "react";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface Props<T extends { id: string }> {
  title: string;
  icon: string;
  rows: T[];
  columns: Column<T>[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (row: T) => void;
  onDelete: (id: string) => void;
  addLabel?: string;
}

export function CMSTable<T extends { id: string }>({
  title, icon, rows, columns, loading, onAdd, onEdit, onDelete, addLabel = "Add New",
}: Props<T>) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedRows = sortKey
    ? [...rows].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey] ?? "";
        const bVal = (b as Record<string, unknown>)[sortKey] ?? "";
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      })
    : rows;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-slate-900">
            {icon} {title}
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            {rows.length} item{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onAdd}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition-colors shadow-sm"
        >
          + {addLabel}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 font-bold text-sm">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="text-4xl">{icon}</div>
            <p className="text-sm font-bold text-slate-400">No {title.toLowerCase()} yet.</p>
            <button
              onClick={onAdd}
              className="rounded-xl border-2 border-dashed border-slate-200 px-5 py-2 text-sm font-bold text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-colors"
            >
              + Add your first one
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {columns.map((col) => (
                  <th key={String(col.key)}
                    className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500 cursor-pointer hover:text-violet-600 select-none"
                    onClick={() => toggleSort(String(col.key))}>
                    {col.label}
                    {sortKey === String(col.key) ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}
                  </th>
                ))}
                <th className="px-5 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-5 py-4 text-slate-700 font-semibold">
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[String(col.key)] ?? "—")}
                    </td>
                  ))}
                  <td className="px-5 py-4 text-right">
                    {confirmId === row.id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">Sure?</span>
                        <button
                          onClick={() => { onDelete(row.id); setConfirmId(null); }}
                          className="rounded-lg bg-rose-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-600 transition-colors"
                        >
                          Yes, delete
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <button
                          onClick={() => onEdit(row)}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmId(row.id)}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          Delete
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────
interface ModalProps {
  title: string;
  onClose: () => void;
  onSave: () => void;
  busy: boolean;
  children: React.ReactNode;
}

export function CMSModal({ title, onClose, onSave, busy, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="font-display text-xl font-black text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={busy}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Form field helpers ────────────────────────────────────────
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition";
export const selectCls = inputCls;
export const textareaCls = inputCls + " resize-none";