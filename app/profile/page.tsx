"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../lib/supabase/client";
import { getActiveChildId, setActiveChildId } from "../lib/activeChild";

// ── TYPES ─────────────────────────────────────────────────────
type ProfileTab = "badges" | "courses" | "showcase" | "friends";

type ParentRow = {
  id: string;
  email: string | null;
};

type ChildRow = {
  id: string;
  display_name: string;
  birth_year: number | null;
  avatar: string | null;
  streak_count: number;
  freeze_count: number;
  xp: number;
  created_at: string;
};

type BadgeRow = {
  id: string;
  name: string;
  emoji: string;
  description: string;
};

type AllBadge = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earned: boolean;
  earned_at?: string;
};

type CourseJoin = {
  id: string;
  title: string;
  emoji: string;
  level: string;
  lesson_count: number;
};

type EnrollmentRow = {
  id: string;
  lessons_done: number;
  completed_at: string | null;
  enrolled_at: string;
  courses: CourseJoin[] | CourseJoin | null;
};

type ShowcasePost = {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
  courses: { title: string }[] | { title: string } | null;
};

type FriendProfile = {
  id: string;
  display_name: string;
  avatar: string | null;
  streak_count: number;
};

type FriendRow = {
  id: string;
  status: string;
  requester_id: string;
  receiver_id: string;
  friend: FriendProfile[] | FriendProfile | null;
};

const AVATARS = ["🦊","🐼","🐸","🦁","🐨","🦋","🐬","🦄","🐙","🌟"];

const PREDEFINED_MESSAGES = [
  "🔥 You're on a streak! Keep it up!",
  "💪 You've got this — don't give up!",
  "🌟 Amazing work on your course!",
  "👋 Hey! Come back — we miss you on SkillSprout!",
  "🏆 Congrats on your new badge!",
  "🌱 We're learning together — so cool!",
  "⚡ You're inspiring me to keep going!",
];

// ── HELPERS ───────────────────────────────────────────────────
function getJoin<T>(val: T[] | T | null): T | null {
  if (!val) return null;
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

function levelColor(level: string) {
  switch (level) {
    case "seedling": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "sprout":   return "bg-green-50 text-green-700 border-green-200";
    case "bloom":    return "bg-sky-50 text-sky-700 border-sky-200";
    case "harvest":  return "bg-amber-50 text-amber-700 border-amber-200";
    default:         return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

function levelEmoji(level: string) {
  switch (level) {
    case "seedling": return "🌱";
    case "sprout":   return "🌿";
    case "bloom":    return "🌸";
    case "harvest":  return "🌻";
    default:         return "📚";
  }
}

// ── TAB BUTTON ────────────────────────────────────────────────
function TabBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
        active
          ? "bg-emerald-600 text-white shadow-sm"
          : "bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
      }`}
    >
      {children}
    </button>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function ProfilePage() {
  const router   = useRouter();
  const supabase = supabaseBrowser();

  const [loading, setLoading]       = useState(true);
  const [parent, setParent]         = useState<ParentRow | null>(null);
  const [children, setChildren]     = useState<ChildRow[]>([]);
  const [activeChildId, setActive]  = useState<string | null>(null);
  const [tab, setTab]               = useState<ProfileTab>("badges");
  const [msg, setMsg]               = useState<string | null>(null);

  // Child data
  const [allBadges, setAllBadges]       = useState<AllBadge[]>([]);
  const [enrollments, setEnrollments]   = useState<EnrollmentRow[]>([]);
  const [posts, setPosts]               = useState<ShowcasePost[]>([]);
  const [friends, setFriends]           = useState<FriendRow[]>([]);

  // Add child form
  const [newName, setNewName]         = useState("");
  const [newBirthYear, setNewBirthYear] = useState("");
  const [newAvatar, setNewAvatar]     = useState("🦊");
  const [showAddChild, setShowAddChild] = useState(false);

  // Showcase post form
  const [showPostForm, setShowPostForm]   = useState(false);
  const [postTitle, setPostTitle]         = useState("");
  const [postBody, setPostBody]           = useState("");
  const [postSubmitting, setPostSubmitting] = useState(false);

  // Message modal
  const [msgModal, setMsgModal]         = useState<{ friendId: string; name: string } | null>(null);
  const [selectedMsg, setSelectedMsg]   = useState<string | null>(null);

  const activeChild = useMemo(
    () => children.find((c) => c.id === activeChildId) ?? null,
    [children, activeChildId]
  );

  // ── LOAD PARENT + CHILDREN ──────────────────────────────────
  async function load() {
    setLoading(true);
    setMsg(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth?next=%2Fprofile"); return; }

    const { data: parentRow, error: parentErr } = await supabase
      .from("parents")
      .select("id,email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (parentErr || !parentRow) {
      setMsg("Parent record not found. Please sign in again.");
      setLoading(false);
      return;
    }

    setParent(parentRow as ParentRow);

    const { data: childRows } = await supabase
      .from("child_profiles")
      .select("id,display_name,birth_year,avatar,streak_count,freeze_count,xp,created_at")
      .eq("parent_id", parentRow.id)
      .order("created_at", { ascending: false });

    const list = (childRows ?? []) as ChildRow[];
    setChildren(list);

    const stored = getActiveChildId();
    const valid  = stored && list.some((c) => c.id === stored) ? stored : list[0]?.id ?? null;
    setActive(valid);
    if (valid) setActiveChildId(valid);

    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  // ── LOAD CHILD DATA when activeChildId or tab changes ───────
  useEffect(() => {
    if (!activeChildId) return;
    if (tab === "badges")   loadBadges();
    if (tab === "courses")  loadEnrollments();
    if (tab === "showcase") loadPosts();
    if (tab === "friends")  loadFriends();
  }, [activeChildId, tab]); // eslint-disable-line

  async function loadBadges() {
    const [{ data: allB }, { data: earnedB }] = await Promise.all([
      supabase.from("badges").select("id,name,emoji,description"),
      supabase.from("child_badges")
        .select("badge_id,earned_at")
        .eq("child_id", activeChildId!),
    ]);
    const earnedMap = new Map((earnedB ?? []).map((e: { badge_id: string; earned_at: string }) => [e.badge_id, e.earned_at]));
    setAllBadges(
      (allB ?? []).map((b: BadgeRow) => ({
        ...b,
        earned:    earnedMap.has(b.id),
        earned_at: earnedMap.get(b.id),
      }))
    );
  }

  async function loadEnrollments() {
    const { data } = await supabase
      .from("enrollments")
      .select("id,lessons_done,completed_at,enrolled_at,courses(id,title,emoji,level,lesson_count)")
      .eq("child_id", activeChildId!)
      .order("enrolled_at", { ascending: false });
    setEnrollments((data ?? []) as EnrollmentRow[]);
  }

  async function loadPosts() {
    const { data } = await supabase
      .from("showcase_posts")
      .select("id,title,body,status,created_at,courses(title)")
      .eq("child_id", activeChildId!)
      .order("created_at", { ascending: false });
    setPosts((data ?? []) as ShowcasePost[]);
  }

  async function loadFriends() {
    const { data: asRequester } = await supabase
      .from("friendships")
      .select("id,status,requester_id,receiver_id,child_profiles!receiver_id(id,display_name,avatar,streak_count)")
      .eq("requester_id", activeChildId!)
      .eq("status", "accepted");

    const { data: asReceiver } = await supabase
      .from("friendships")
      .select("id,status,requester_id,receiver_id,child_profiles!requester_id(id,display_name,avatar,streak_count)")
      .eq("receiver_id", activeChildId!)
      .eq("status", "accepted");

    // Remap child_profiles → friend so it matches our FriendRow type
    const remap = (rows: Record<string, unknown>[]): FriendRow[] =>
      (rows ?? []).map((r) => ({
        id:           r.id as string,
        status:       r.status as string,
        requester_id: r.requester_id as string,
        receiver_id:  r.receiver_id as string,
        friend:       (r.child_profiles ?? null) as FriendProfile[] | FriendProfile | null,
      }));

    setFriends([...remap(asRequester ?? []), ...remap(asReceiver ?? [])]);
  }

  // ── ADD CHILD ───────────────────────────────────────────────
  async function createChild() {
    if (!parent) return;
    if (!newName.trim()) { setMsg("Please enter a name."); return; }
    const birthYear = newBirthYear.trim() ? Number(newBirthYear) : null;

    const { data, error } = await supabase
      .from("child_profiles")
      .insert({
        parent_id:    parent.id,
        display_name: newName.trim(),
        birth_year:   birthYear,
        avatar:       newAvatar,
        streak_count: 0,
        freeze_count: 2,
        xp:           0,
      })
      .select("id,display_name,birth_year,avatar,streak_count,freeze_count,xp,created_at")
      .single();

    if (error) { setMsg(error.message); return; }
    const created = data as ChildRow;
    const next = [created, ...children];
    setChildren(next);
    setActive(created.id);
    setActiveChildId(created.id);
    setNewName(""); setNewBirthYear(""); setNewAvatar("🦊");
    setShowAddChild(false);
    setMsg(null);
  }

  // ── SUBMIT SHOWCASE POST ────────────────────────────────────
  async function submitPost() {
    if (!postTitle.trim() || !postBody.trim()) {
      setMsg("Please fill in both the title and description.");
      return;
    }
    setPostSubmitting(true);
    const { error } = await supabase.from("showcase_posts").insert({
      child_id: activeChildId!,
      title:    postTitle.trim(),
      body:     postBody.trim(),
      status:   "pending",
    });
    setPostSubmitting(false);
    if (error) { setMsg(error.message); return; }
    setPostTitle(""); setPostBody("");
    setShowPostForm(false);
    loadPosts();
  }

  // ── SEND MESSAGE ────────────────────────────────────────────
  async function sendMessage() {
    if (!selectedMsg || !msgModal) return;
    await supabase.from("friend_messages").insert({
      sender_id:   activeChildId!,
      receiver_id: msgModal.friendId,
      message_key: selectedMsg,
    });
    setMsgModal(null);
    setSelectedMsg(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  // ── LOADING ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm font-semibold text-slate-400">Loading your dashboard…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── PARENT HEADER ── */}
      <section className="flex flex-col gap-4 rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
            👨‍👩‍👧 Parent Dashboard
          </span>
          <h1 className="font-display mt-3 text-3xl font-bold text-emerald-900">
            Your Family
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Signed in as <span className="font-bold text-slate-700">{parent?.email}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAddChild(!showAddChild)}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
            + Add Child
          </button>
          <button onClick={signOut}
            className="rounded-xl border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
            Sign Out
          </button>
        </div>
      </section>

      {msg && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {msg}
        </div>
      )}

      {/* ── ADD CHILD FORM ── */}
      {showAddChild && (
        <section className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 space-y-4">
          <h2 className="font-display text-xl font-bold text-emerald-800">Add a Child Profile</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-slate-700">Child's Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Mia"
                className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Birth Year (optional)</label>
              <input value={newBirthYear} onChange={e => setNewBirthYear(e.target.value)}
                placeholder="e.g. 2016"
                className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Choose an Avatar</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVATARS.map(a => (
                <button key={a} onClick={() => setNewAvatar(a)}
                  className={`h-11 w-11 rounded-xl text-2xl transition ${
                    newAvatar === a
                      ? "bg-emerald-500 ring-2 ring-emerald-400 ring-offset-1"
                      : "bg-white border border-slate-200 hover:border-emerald-300"
                  }`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={createChild}
              className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
              Create Profile 🌱
            </button>
            <button onClick={() => setShowAddChild(false)}
              className="rounded-xl border-2 border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* ── CHILD SELECTOR ── */}
      {children.length > 0 && (
        <section className="flex flex-wrap gap-3">
          {children.map((c) => (
            <button key={c.id}
              onClick={() => { setActive(c.id); setActiveChildId(c.id); }}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition ${
                c.id === activeChildId
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-emerald-200"
              }`}>
              <span className="text-2xl">{c.avatar ?? "🌱"}</span>
              <div className="text-left">
                <div className="text-sm font-bold text-slate-800">{c.display_name}</div>
                <div className="text-xs font-semibold text-slate-400">
                  🔥 {c.streak_count} day streak · ⭐ {c.xp} XP
                </div>
              </div>
              {c.id === activeChildId && (
                <span className="rounded-lg bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                  Active
                </span>
              )}
            </button>
          ))}
        </section>
      )}

      {/* ── NO CHILDREN YET ── */}
      {children.length === 0 && !showAddChild && (
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-12 text-center">
          <div className="text-5xl">🌱</div>
          <p className="font-display mt-3 text-xl font-bold text-slate-400">
            No child profiles yet!
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            Add a child profile to start tracking their learning journey.
          </p>
          <button onClick={() => setShowAddChild(true)}
            className="mt-4 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
            + Add First Child
          </button>
        </div>
      )}

      {/* ── ACTIVE CHILD DASHBOARD ── */}
      {activeChild && (
        <div className="space-y-6">

          {/* Child hero card */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-900 p-8 text-white">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/5" />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
              <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-6xl">
                {activeChild.avatar ?? "🌱"}
              </div>
              <div className="flex-1">
                <div className="font-display text-3xl font-bold">{activeChild.display_name}</div>
                {activeChild.birth_year && (
                  <div className="mt-1 text-sm font-semibold text-emerald-300">
                    Born {activeChild.birth_year}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
                    <div className="font-display text-2xl font-bold text-amber-400">
                      🔥 {activeChild.streak_count}
                    </div>
                    <div className="text-xs font-semibold text-emerald-200">day streak</div>
                  </div>
                  <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
                    <div className="font-display text-2xl font-bold text-sky-300">
                      ❄️ {activeChild.freeze_count}
                    </div>
                    <div className="text-xs font-semibold text-emerald-200">freezes</div>
                  </div>
                  <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
                    <div className="font-display text-2xl font-bold text-yellow-300">
                      ⭐ {activeChild.xp}
                    </div>
                    <div className="text-xs font-semibold text-emerald-200">XP earned</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2">
            <TabBtn active={tab === "badges"}   onClick={() => setTab("badges")}>🏅 Badges</TabBtn>
            <TabBtn active={tab === "courses"}  onClick={() => setTab("courses")}>📚 My Courses</TabBtn>
            <TabBtn active={tab === "showcase"} onClick={() => setTab("showcase")}>🖼️ Showcase</TabBtn>
            <TabBtn active={tab === "friends"}  onClick={() => setTab("friends")}>🤝 Friends</TabBtn>
          </div>

          {/* ── BADGES TAB ── */}
          {tab === "badges" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-emerald-900">Badges</h2>
                  <p className="text-sm font-semibold text-slate-500">
                    {allBadges.filter(b => b.earned).length} of {allBadges.length} earned
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allBadges.map((badge) => (
                  <div key={badge.id}
                    className={`rounded-2xl border-2 p-5 transition ${
                      badge.earned
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-100 bg-white opacity-50"
                    }`}>
                    <div className="text-4xl">{badge.emoji}</div>
                    <div className="mt-2 font-bold text-slate-800">{badge.name}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">
                      {badge.description}
                    </div>
                    {badge.earned ? (
                      <div className="mt-2 text-xs font-bold text-amber-600">
                        ✓ Earned {badge.earned_at
                          ? new Date(badge.earned_at).toLocaleDateString()
                          : ""}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs font-bold text-slate-300">🔒 Locked</div>
                    )}
                  </div>
                ))}
              </div>
              {allBadges.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
                  <p className="text-sm font-semibold text-slate-400">
                    Complete courses and challenges to earn badges!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── COURSES TAB ── */}
          {tab === "courses" && (
            <div>
              <h2 className="font-display mb-4 text-2xl font-bold text-emerald-900">My Courses</h2>
              {enrollments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
                  <div className="text-4xl">📚</div>
                  <p className="mt-3 font-bold text-slate-400">No courses enrolled yet!</p>
                  <button onClick={() => router.push("/courses")}
                    className="mt-4 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
                    Browse Courses →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {enrollments.map((enr) => {
                    const course = getJoin(enr.courses);
                    if (!course) return null;
                    const pct = Math.round((enr.lessons_done / course.lesson_count) * 100);
                    return (
                      <div key={enr.id} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{course.emoji}</span>
                            <div>
                              <div className="font-bold text-slate-800">{course.title}</div>
                              <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-bold ${levelColor(course.level)}`}>
                                {levelEmoji(course.level)} {course.level}
                              </span>
                            </div>
                          </div>
                          {enr.completed_at ? (
                            <span className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                              ✓ Complete!
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-slate-400">
                              {enr.lessons_done}/{course.lesson_count}
                            </span>
                          )}
                        </div>
                        <div className="mt-4">
                          <div className="mb-1 flex justify-between text-xs font-bold text-slate-400">
                            <span>Progress</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SHOWCASE TAB ── */}
          {tab === "showcase" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-emerald-900">Showcase</h2>
                  <p className="text-sm font-semibold text-slate-500">
                    Share your projects — a parent will approve before it's visible.
                  </p>
                </div>
                <button onClick={() => setShowPostForm(!showPostForm)}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
                  {showPostForm ? "Cancel" : "+ Add Post"}
                </button>
              </div>

              {/* Safety notice */}
              <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
                <span>🛡️</span>
                <p className="text-xs font-semibold text-sky-800">
                  Every post is reviewed by a parent before anyone else can see it. Kids stay safe!
                </p>
              </div>

              {/* Post form */}
              {showPostForm && (
                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 space-y-3">
                  <h3 className="font-display text-lg font-bold text-emerald-800">New Showcase Post</h3>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Title</label>
                    <input value={postTitle} onChange={e => setPostTitle(e.target.value)}
                      placeholder="What did you make or learn?"
                      className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Description</label>
                    <textarea value={postBody} onChange={e => setPostBody(e.target.value)}
                      rows={3} placeholder="Tell us about it! What did you create? What did you learn?"
                      className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300" />
                  </div>
                  <button onClick={submitPost} disabled={postSubmitting}
                    className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                    {postSubmitting ? "Submitting…" : "Submit for Approval 🌱"}
                  </button>
                </div>
              )}

              {/* Posts list */}
              {posts.length === 0 && !showPostForm && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
                  <div className="text-4xl">🖼️</div>
                  <p className="mt-3 font-bold text-slate-400">No posts yet!</p>
                  <p className="mt-1 text-sm font-semibold text-slate-400">
                    Complete a course and share your final project here.
                  </p>
                </div>
              )}

              {posts.map((post) => {
                const course = getJoin(post.courses);
                return (
                  <div key={post.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`rounded-lg border px-2.5 py-0.5 text-xs font-bold ${
                            post.status === "pending"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : post.status === "approved"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                          }`}>
                            {post.status === "pending"  ? "⏳ Awaiting Approval" :
                             post.status === "approved" ? "✅ Approved" : "❌ Declined"}
                          </span>
                          {course?.title && (
                            <span className="text-xs font-semibold text-slate-400">
                              {course.title}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-800">{post.title}</h3>
                        <p className="mt-1 text-sm text-slate-600 leading-relaxed">{post.body}</p>
                        <p className="mt-2 text-xs text-slate-300">
                          {new Date(post.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── FRIENDS TAB ── */}
          {tab === "friends" && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-emerald-900">Friends</h2>
                <p className="text-sm font-semibold text-slate-500">
                  Send safe, pre-approved messages to your SkillSprout friends!
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
                <span>🛡️</span>
                <p className="text-xs font-semibold text-sky-800">
                  All messages are pre-approved and positive only. Parents approve all friend requests before connections are made.
                </p>
              </div>

              {friends.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
                  <div className="text-4xl">🤝</div>
                  <p className="mt-3 font-bold text-slate-400">No friends yet!</p>
                  <p className="mt-1 text-sm font-semibold text-slate-400">
                    Friend requests require parent approval before connecting.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {friends.map((f) => {
                    const friend = getJoin(f.friend);
                    if (!friend) return null;
                    return (
                      <div key={f.id} className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-3xl">
                          {friend.avatar ?? "🌱"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800">{friend.display_name}</div>
                          <div className="text-xs font-semibold text-slate-400">
                            🔥 {friend.streak_count} day streak
                          </div>
                        </div>
                        <button
                          onClick={() => { setMsgModal({ friendId: friend.id, name: friend.display_name }); setSelectedMsg(null); }}
                          className="rounded-xl border-2 border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                        >
                          💬 Message
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MESSAGE MODAL ── */}
      {msgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setMsgModal(null); }}>
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold text-slate-800">
                Send a Message 💬
              </h3>
              <button onClick={() => setMsgModal(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>
            <p className="text-sm font-semibold text-slate-500 mb-1">
              To: <span className="font-bold text-slate-700">{msgModal.name}</span>
            </p>

            <div className="mb-4 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3">
              <span>🛡️</span>
              <p className="text-xs font-semibold text-sky-800">
                For everyone's safety, choose from pre-approved messages only.
              </p>
            </div>

            <div className="space-y-2">
              {PREDEFINED_MESSAGES.map((m) => (
                <button key={m} onClick={() => setSelectedMsg(m)}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition ${
                    selectedMsg === m
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                  }`}>
                  {m}
                </button>
              ))}
            </div>

            <div className="mt-5 flex gap-3">
              <button onClick={sendMessage} disabled={!selectedMsg}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40">
                Send Message 💌
              </button>
              <button onClick={() => setMsgModal(null)}
                className="rounded-xl border-2 border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}