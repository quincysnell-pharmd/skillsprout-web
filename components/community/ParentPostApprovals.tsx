"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";

interface Post {
  id: string;
  type: "reflection" | "showcase" | "discovery";
  title?: string;
  content: string;
  images?: string[];
  category?: string;
  created_at: string;
  parent_approved: boolean | null;
  admin_approved: boolean | null;
  status: string;
  child_profiles: { display_name: string; username: string; avatar_url?: string };
  courses?: { title: string; emoji?: string };
}

const TYPE_CONFIG = {
  reflection: { label: "Reflection", emoji: "📝" },
  showcase:   { label: "Showcase",   emoji: "🏆" },
  discovery:  { label: "Discovery",  emoji: "💡" },
};

export default function ParentPostApprovals() {
  const supabase = supabaseBrowser();
  const [posts, setPosts]   = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]     = useState<string | null>(null);

  useEffect(() => { loadPosts(); }, []);

  async function loadPosts() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Get parent's children
    const { data: parentRow } = await supabase
      .from("parents").select("id").eq("user_id", user.id).maybeSingle();
    if (!parentRow) { setLoading(false); return; }

    const { data: children } = await supabase
      .from("child_profiles").select("id").eq("parent_id", parentRow.id);
    const childIds = (children ?? []).map((c: { id: string }) => c.id);
    if (!childIds.length) { setLoading(false); return; }

    const { data } = await supabase
      .from("community_posts")
      .select("*, child_profiles(display_name, username, avatar_url), courses(title, emoji)")
      .in("child_id", childIds)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setPosts((data as unknown as Post[]) ?? []);
    setLoading(false);
  }

  async function approve(postId: string) {
    setBusy(postId);
    await supabase.from("community_posts")
      .update({ parent_approved: true })
      .eq("id", postId);

    // Check if admin also approved — if so, set status to approved
    const { data: post } = await supabase
      .from("community_posts").select("admin_approved").eq("id", postId).maybeSingle();
    if (post?.admin_approved === true) {
      await supabase.from("community_posts")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", postId);
    }

    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setBusy(null);
  }

  async function reject(postId: string) {
    setBusy(postId);
    await supabase.from("community_posts")
      .update({ parent_approved: false, status: "rejected" })
      .eq("id", postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setBusy(null);
  }

  if (loading) return <div className="flex justify-center py-10"><div className="text-3xl animate-bounce">📝</div></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-slate-900">📝 Posts Pending Your Approval</h2>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-700">{posts.length} pending</span>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-bold text-slate-400">No posts waiting for approval!</p>
        </div>
      ) : (
        posts.map((post) => {
          const cfg = TYPE_CONFIG[post.type];
          const avatar = post.child_profiles?.avatar_url || "🌱";
          const name = post.child_profiles?.display_name || post.child_profiles?.username;

          return (
            <div key={post.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">{avatar}</div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900">{name}</div>
                  <div className="text-xs font-semibold text-slate-400">{new Date(post.created_at).toLocaleDateString()}</div>
                </div>
                <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">{cfg.emoji} {cfg.label}</span>
              </div>

              {/* Content */}
              {post.title && <h3 className="font-bold text-slate-900">{post.title}</h3>}
              <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>

              {/* Images */}
              {post.images && post.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {post.images.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-full rounded-xl object-cover aspect-video border border-slate-100" />
                  ))}
                </div>
              )}

              {/* Approval status */}
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                <span>Admin: {post.admin_approved === true ? "✅ Approved" : post.admin_approved === false ? "❌ Rejected" : "⏳ Pending"}</span>
                <span>·</span>
                <span>Parent: ⏳ Waiting for you</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => approve(post.id)} disabled={busy === post.id}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition">
                  {busy === post.id ? "..." : "✅ Approve"}
                </button>
                <button onClick={() => reject(post.id)} disabled={busy === post.id}
                  className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-60 transition">
                  {busy === post.id ? "..." : "❌ Reject"}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}