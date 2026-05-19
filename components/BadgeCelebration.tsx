"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";

interface BadgeDetails {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  icon?: string;
}

interface Piece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  w: number;
  h: number;
  rotate: number;
}

const COLORS = ["#1D9E75", "#FFD700", "#FFFFFF", "#10b981", "#f59e0b", "#34d399"];

function makeConfetti(n = 64): Piece[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 0.6,
    duration: 1.8 + Math.random() * 1.4,
    w: 7 + Math.random() * 7,
    h: 4 + Math.random() * 5,
    rotate: Math.random() * 360,
  }));
}

export default function BadgeCelebration({
  badgeIds,
  onComplete,
}: {
  badgeIds: string[];
  onComplete: () => void;
}) {
  const supabase = supabaseBrowser();
  const [badges, setBadges] = useState<BadgeDetails[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [confetti] = useState(makeConfetti);
  const dismissRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = badges[index];
  const isOpen = visible && !!current;

  // Fetch badge details whenever a new set of IDs arrives
  useEffect(() => {
    if (!badgeIds.length) return;
    setIndex(0);
    setVisible(false);
    async function load() {
      const { data } = await supabase
        .from("badges")
        .select("id, name, description, image_url, icon")
        .in("id", badgeIds);
      if (!data?.length) return;
      const ordered = badgeIds
        .map((id) => data.find((b) => b.id === id))
        .filter(Boolean) as BadgeDetails[];
      setBadges(ordered);
      setVisible(true);
    }
    load();
  }, [badgeIds]);

  // Sound + focus when each badge appears
  useEffect(() => {
    if (!isOpen) return;
    try {
      if (!audioRef.current) audioRef.current = new Audio("/sounds/badge-unlock.mp3");
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {}
    const t = setTimeout(() => dismissRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [isOpen, index]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Tab") { e.preventDefault(); dismissRef.current?.focus(); }
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, index]);

  function dismiss() {
    setVisible(false);
    setTimeout(() => {
      if (index + 1 < badges.length) {
        setIndex((i) => i + 1);
        setVisible(true);
      } else {
        setBadges([]);
        setIndex(0);
        onComplete();
      }
    }, 220);
  }

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-10px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(105vh) rotate(800deg); opacity: 0; }
        }
        @keyframes badgePop {
          0%   { transform: scale(0.4); opacity: 0; }
          70%  { transform: scale(1.08); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Badge unlocked: ${current.name}`}
        className="fixed inset-0 z-[200] flex items-center justify-center"
        style={{ backgroundColor: "rgba(0,0,0,0.78)", animation: "overlayIn 0.25s ease" }}
      >
        {/* Confetti layer */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {confetti.map((p) => (
            <div
              key={p.id}
              className="absolute top-0 rounded-sm"
              style={{
                left: `${p.x}%`,
                width: p.w,
                height: p.h,
                backgroundColor: p.color,
                transform: `rotate(${p.rotate}deg)`,
                animation: `confettiFall ${p.duration}s ease-in ${p.delay}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Card */}
        <div
          className="relative mx-5 w-full max-w-sm rounded-3xl bg-white px-8 py-10 text-center shadow-2xl"
          style={{ animation: "badgePop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
        >
          {badges.length > 1 && (
            <span className="absolute right-5 top-5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              {index + 1} / {badges.length}
            </span>
          )}

          <p className="mb-4 text-xs font-black uppercase tracking-widest text-emerald-600">
            Badge Unlocked! 🎉
          </p>

          {/* Badge image */}
          <div className="mx-auto mb-6 flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-amber-50 shadow-lg ring-4 ring-emerald-200">
            {current.image_url ? (
              <img
                src={current.image_url}
                alt={current.name}
                className="h-28 w-28 rounded-full object-cover"
              />
            ) : (
              <span className="text-7xl" role="img" aria-label={current.name}>
                {current.icon ?? "🏅"}
              </span>
            )}
          </div>

          <h2 className="font-display text-2xl font-black text-slate-900">{current.name}</h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
            {current.description}
          </p>

          <button
            ref={dismissRef}
            onClick={dismiss}
            className="mt-7 w-full rounded-2xl bg-emerald-600 py-3.5 text-base font-black text-white shadow-md transition hover:bg-emerald-700 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-300"
          >
            Awesome! 🌟
          </button>
        </div>
      </div>
    </>
  );
}
