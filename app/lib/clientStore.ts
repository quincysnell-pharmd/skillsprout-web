export type CareerInterest = {
  title: string;
  savedAt: number; // unix ms
};

export type KidProfile = {
  username: string;
  createdAt: number; // unix ms
};

const CAREERS_KEY = "skillsprout.careerInterests.v1";
const PROFILE_KEY = "skillsprout.profile.v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* ---------------- PROFILE ---------------- */

export function getProfile(): KidProfile | null {
  if (typeof window === "undefined") return null;
  return safeParse<KidProfile | null>(localStorage.getItem(PROFILE_KEY), null);
}

export function hasProfile(): boolean {
  return !!getProfile();
}

export function createProfile(username: string): KidProfile {
  const trimmed = username.trim();
  const profile: KidProfile = {
    username: trimmed || "Sprout",
    createdAt: Date.now(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
  return profile;
}

export function deleteProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(CAREERS_KEY);
}

/* -------------- CAREER INTERESTS -------------- */

export function getCareerInterests(): CareerInterest[] {
  if (typeof window === "undefined") return [];
  const data = safeParse<CareerInterest[]>(localStorage.getItem(CAREERS_KEY), []);
  return [...data].sort((a, b) => b.savedAt - a.savedAt);
}

export function toggleCareerInterest(title: string): CareerInterest[] {
  if (typeof window === "undefined") return [];
  const current = getCareerInterests();
  const exists = current.some((c) => c.title === title);

  const next = exists
    ? current.filter((c) => c.title !== title)
    : [{ title, savedAt: Date.now() }, ...current];

  localStorage.setItem(CAREERS_KEY, JSON.stringify(next));
  return next;
}

export function removeCareerInterest(title: string): CareerInterest[] {
  if (typeof window === "undefined") return [];
  const current = getCareerInterests();
  const next = current.filter((c) => c.title !== title);
  localStorage.setItem(CAREERS_KEY, JSON.stringify(next));
  return next;
}

export function clearCareerInterests(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CAREERS_KEY);
}
const ACTIVE_CHILD_KEY = "skillsprout_active_child_id";

export function getActiveChildId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_CHILD_KEY);
}

export function setActiveChildId(childId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_CHILD_KEY, childId);
}

export function clearActiveChildId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_CHILD_KEY);
}
