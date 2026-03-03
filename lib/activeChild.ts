const ACTIVE_CHILD_STORAGE_KEY = "skillsprout_active_child_id";

export function setActiveChildId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, id);
}

export function getActiveChildId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY);
}

export function clearActiveChildId() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_CHILD_STORAGE_KEY);
}