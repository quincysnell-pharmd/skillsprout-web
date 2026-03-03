// app/lib/activeChild.ts
// Stores active child in BOTH localStorage (client) and a cookie (server/middleware)

export const ACTIVE_CHILD_KEY = "skillsprout_active_child_id";

function setCookie(value: string, days = 30) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${ACTIVE_CHILD_KEY}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function setActiveChildId(childId: string) {
  if (typeof window === "undefined") return;
  const id = (childId ?? "").trim();
  if (!id) return;

  localStorage.setItem(ACTIVE_CHILD_KEY, id);
  setCookie(id);
}

export function getActiveChildId(): string | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(ACTIVE_CHILD_KEY);
  return val && val.trim().length > 0 ? val : null;
}

export function clearActiveChildId() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_CHILD_KEY);
  if (typeof document !== "undefined") {
    document.cookie = `${ACTIVE_CHILD_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}
