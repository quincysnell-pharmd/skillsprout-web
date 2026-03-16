"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────
interface Post {
  id: string;
  type: "reflection" | "showcase" | "discovery";
  title?: string;
  content: string;
  images?: string[];
  video_url?: string;
  category?: string;
  created_at: string;
  child_profiles: {
    display_name: string;
    username: string;
    avatar_url?: string;
  };
  courses?: { title: string; emoji?: string };
}

interface Reaction {
  post_id: string;
  type: string;
}

const TYPE_CONFIG = {
  reflection: { label: "Reflection",  emoji: "📝", color: "bg-violet-100 text-violet-700 border-violet-200" },
  showcase:   { label: "Showcase",    emoji: "🏆", color: "bg-amber-100 text-amber-700 border-amber-200"   },
  discovery:  { label: "Discovery",   emoji: "💡", color: "bg-sky-100 text-sky-700 border-sky-200"         },
};

const CATEGORIES = ["all", "cooking", "coding", "gardening", "money", "art", "science", "music", "writing"];

// ── Floating hearts animation ─────────────────────────────────
function FloatingHeart({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1000); return () => clearTimeout(t); }, []);
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="animate-bounce text-2xl">❤️</span>
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────
function PostCard({ post, childId, myReactions, onReact }: {
  post: Post;
  childId: string | null;
  myReactions: Set<string>;
  onReact: (postId: string, type: "heart" | "thumbs_up") => void;
}) {
  const [showHeart, setShowHeart]   = useState(false);
  const [showThumb, setShowThumb]   = useState(false);
  const cfg = TYPE_CONFIG[post.type];
  const avatar = post.child_profiles?.avatar_url || "🌱";
  const name   = post.child_profiles?.display_name || post.child_profiles?.username || "Sprout";
  const heartKey = `${post.id}-heart`;
  const thumbKey = `${post.id}-thumbs_up`;

  function handleHeart() {
    if (!childId) return;
    setShowHeart(true);
    onReact(post.id, "heart");
  }

  function handleThumb() {
    if (!childId) return;
    setShowThumb(true);
    onReact(post.id, "thumbs_up");
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl border border-emerald-100">
          {avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-900 text-sm">{name}</div>
          <div className="text-xs font-semibold text-slate-400">
            {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {post.courses && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {post.courses.emoji} {post.courses.title}
            </span>
          )}
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.color}`}>
            {cfg.emoji} {cfg.label}
          </span>
        </div>
      </div>

      {/* Title */}
      {post.title && <h3 className="font-display text-lg font-bold text-slate-900 mb-2">{post.title}</h3>}

      {/* Content */}
      <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>

      {/* Images */}
      {post.images && post.images.length > 0 && (
        <div className={`mt-3 grid gap-2 ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {post.images.map((url, i) => (
            <img key={i} src={url} alt="" className="w-full rounded-xl object-cover aspect-video border border-slate-100" />
          ))}
        </div>
      )}

      {/* Video */}
      {post.video_url && (
        <div className="mt-3 rounded-xl overflow-hidden border border-slate-100">
          {post.video_url.includes("youtube") ? (
            <iframe src={post.video_url.replace("watch?v=", "embed/")} className="w-full aspect-video" allowFullScreen />
          ) : (
            <video src={post.video_url} controls className="w-full aspect-video" />
          )}
        </div>
      )}

      {/* Reactions */}
      <div className="mt-4 flex items-center gap-3 pt-3 border-t border-slate-50">
        <div className="relative">
          <button onClick={handleHeart} disabled={!childId}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition ${
              myReactions.has(heartKey) ? "bg-rose-100 text-rose-600" : "bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-500"
            } disabled:opacity-40`}>
            {myReactions.has(heartKey) ? "❤️" : "🤍"}
          </button>
          {showHeart && <FloatingHeart onDone={() => setShowHeart(false)} />}
        </div>
        <div className="relative">
          <button onClick={handleThumb} disabled={!childId}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition ${
              myReactions.has(thumbKey) ? "bg-amber-100 text-amber-600" : "bg-slate-50 text-slate-500 hover:bg-amber-50 hover:text-amber-500"
            } disabled:opacity-40`}>
            {myReactions.has(thumbKey) ? "👍" : "👋"}
          </button>
          {showThumb && <FloatingHeart onDone={() => setShowThumb(false)} />}
        </div>
        {!childId && <span className="text-xs font-semibold text-slate-400">Sign in to react!</span>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function CommunityPage() {
  const supabase = supabaseBrowser();
  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [category, setCategory]   = useState("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [childId, setChildId]     = useState<string | null>(null);
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: childRow } = await supabase
        .from("child_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (childRow) {
        setChildId(childRow.id);
        const { data: reactions } = await supabase
          .from("post_reactions").select("post_id, type").eq("child_id", childRow.id);
        setMyReactions(new Set((reactions ?? []).map((r: Reaction) => `${r.post_id}-${r.type}`)));
      }
    }

    const { data } = await supabase
      .from("community_posts")
      .select("*, child_profiles(display_name, username, avatar_url), courses(title, emoji)")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    setPosts((data as unknown as Post[]) ?? []);
    setLoading(false);
  }

  async function handleReact(postId: string, type: "heart" | "thumbs_up") {
    if (!childId) return;
    const key = `${postId}-${type}`;
    if (myReactions.has(key)) {
      await supabase.from("post_reactions").delete()
        .eq("post_id", postId).eq("child_id", childId).eq("type", type);
      setMyReactions((prev) => { const s = new Set(prev); s.delete(key); return s; });
    } else {
      await supabase.from("post_reactions").insert({ post_id: postId, child_id: childId, type });
      setMyReactions((prev) => new Set([...prev, key]));
    }
  }

  const filtered = posts.filter((p) => {
    const catMatch  = category === "all" || p.category === category;
    const typeMatch = typeFilter === "all" || p.type === typeFilter;
    return catMatch && typeMatch;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 p-8 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <h1 className="font-display text-3xl font-black">🌱 Community</h1>
        <p className="mt-2 text-white/80 font-semibold text-sm max-w-md">See what other learners are discovering, creating, and reflecting on!</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{posts.length} posts shared</span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">✅ All posts are reviewed before sharing</span>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Type filter */}
        <div className="flex flex-wrap gap-2">
          {["all", "reflection", "showcase", "discovery"].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition capitalize ${
                typeFilter === t ? "border-violet-500 bg-violet-500 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-violet-200"
              }`}>
              {t === "all" ? "All Types" : `${TYPE_CONFIG[t as keyof typeof TYPE_CONFIG].emoji} ${TYPE_CONFIG[t as keyof typeof TYPE_CONFIG].label}`}
            </button>
          ))}
        </div>
        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition capitalize ${
                category === c ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
              }`}>
              {c === "all" ? "All Categories" : c}
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="text-4xl animate-bounce">🌱</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center">
          <div className="text-5xl mb-3">🌱</div>
          <p className="font-bold text-slate-400">No posts yet!</p>
          <p className="text-sm font-semibold text-slate-400 mt-1">Complete a course unit to share your first post.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} childId={childId} myReactions={myReactions} onReact={handleReact} />
          ))}
        </div>
      )}
    </div>
  );
}