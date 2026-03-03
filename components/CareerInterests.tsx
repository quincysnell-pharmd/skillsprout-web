"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { getActiveChildId } from "@/lib/activeChild";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Career = {
  id: string;
  title: string;
  category: string | null;
};

type SelectedCareer = {
  career_id: string;
  careers: Career;
};

export default function CareerInterests() {
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [careers, setCareers] = useState<Career[]>([]);
  const [selected, setSelected] = useState<SelectedCareer[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setActiveChildId(getActiveChildId());
  }, []);

  useEffect(() => {
    if (!activeChildId) return;

    async function load() {
      const { data: careersData } = await supabase
        .from("careers")
        .select("id,title,category")
        .eq("is_active", true)
        .order("title");

      const { data: selectedData } = await supabase
        .from("child_career_interests")
        .select("career_id, careers(id,title,category)")
        .eq("child_id", activeChildId);

      setCareers(careersData ?? []);
      setSelected((selectedData as any) ?? []);
    }

    load();
  }, [activeChildId]);

  const selectedIds = useMemo(
    () => new Set(selected.map((s) => s.career_id)),
    [selected]
  );

  async function addCareer(careerId: string) {
    if (!activeChildId) return;

    await supabase.from("child_career_interests").upsert({
      child_id: activeChildId,
      career_id: careerId,
      interest_level: "curious",
    });

    const { data } = await supabase
      .from("child_career_interests")
      .select("career_id, careers(id,title,category)")
      .eq("child_id", activeChildId);

    setSelected((data as any) ?? []);
  }

  async function removeCareer(careerId: string) {
    if (!activeChildId) return;

    await supabase
      .from("child_career_interests")
      .delete()
      .eq("child_id", activeChildId)
      .eq("career_id", careerId);

    setSelected((prev) => prev.filter((c) => c.career_id !== careerId));
  }

  if (!activeChildId) {
    return (
      <div className="rounded-xl border p-4">
        <h3 className="font-semibold mb-1">Career interests</h3>
        <p className="text-sm opacity-70">
          No active child selected yet.
        </p>
      </div>
    );
  }

  const filtered = careers.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <h3 className="font-semibold">Career interests</h3>

      {/* Selected chips */}
      <div className="flex flex-wrap gap-2">
        {selected.map((s) => (
          <button
            key={s.career_id}
            onClick={() => removeCareer(s.career_id)}
            className="rounded-full border px-3 py-1 text-sm"
          >
            {s.careers.title} ✕
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search careers…"
        className="w-full rounded-lg border px-3 py-2 text-sm"
      />

      {/* Suggestions */}
      <div className="grid gap-2">
        {filtered.map((career) => (
          <button
            key={career.id}
            disabled={selectedIds.has(career.id)}
            onClick={() => addCareer(career.id)}
            className="rounded-lg border px-3 py-2 text-left disabled:opacity-50"
          >
            <div className="font-medium">{career.title}</div>
            {career.category && (
              <div className="text-xs opacity-70">{career.category}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
