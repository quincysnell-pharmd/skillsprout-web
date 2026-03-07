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
  reflection: { label: "Reflection", emoji: "📝", color: "bg-violet-100 text-violet-700" },
  showcase:   { label: "Showcase",   emoji: "🏆", color: "bg-amber-100 text-amber-700"  },
  discovery:  { label: "Discovery",  emoji: "💡", color: "bg-sky-100 text-sky-700"      },
};

export default function AdminCommunityPage() {
  const supabase = supabaseBrowser();
  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState<string | null>(null);
  const [filter, setFilter]       = useState<"pending" | "approved" | "rejected">("pending");
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  useEffect(() => { loadPosts(); }, [filter]);

  async function loadPosts() {
    setLoading(true);
    const { data } = await supabase
      .from("community_posts")
      .select("*, child_profiles(display_name, username, avatar_url), courses(title, emoji)")
      .eq("status", filter)
      .order("created_at", { ascending: false });
    setPosts((data as unknown as Post[]) ?? []);
    setLoading(false);
  }

  async function approve(postId: string) {
    setBusy(postId);
    await supabase.from("community_posts")
      .update({ admin_approved: true })
      .eq("id", postId);

    // Check if parent also approved
    const { data: post } = await supabase
      .from("community_posts").select("parent_approved").eq("id", postId).maybeSingle();
    if (post?.parent_approved === true) {
      await supabase.from("community_posts")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", postId);
    }

    await loadPosts();
    setBusy(null);
  }

  async function reject(postId: string) {
    setBusy(postId);
    await supabase.from("community_posts").update({
      admin_approved: false,
      status: "rejected",
      rejection_reason: rejectReason[postId] || null,
    }).eq("id", postId);
    await loadPosts();
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-slate-900">🌱 Community Posts</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">Review and approve student posts before they go public</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-xl border-2 px-4 py-2 text-sm font-bold transition capitalize ${
              filter === f ? "border-violet-500 bg-violet-500 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-violet-200"
            }`}>
            {f === "pending" ? "⏳ Pending" : f === "approved" ? "✅ Approved" : "❌ Rejected"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="text-4xl animate-bounce">📝</div></div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-bold text-slate-400">No {filter} posts!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const cfg = TYPE_CONFIG[post.type];
            const avatar = post.child_profiles?.avatar_url || "🌱";
            const name = post.child_profiles?.display_name || post.child_profiles?.username;

            return (
              <div key={post.id} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-2xl border border-emerald-100">{avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900">{name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-slate-400">{new Date(post.created_at).toLocaleDateString()}</span>
                      {post.courses && <span className="text-xs font-semibold text-slate-400">· {post.courses.emoji} {post.courses.title}</span>}
                      {post.category && <span className="text-xs font-semibold text-slate-400 capitalize">· {post.category}</span>}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cfg.color}`}>{cfg.emoji} {cfg.label}</span>
                </div>

                {/* Approval status */}
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-bold">
                  <span className={post.parent_approved === true ? "text-emerald-600" : post.parent_approved === false ? "text-rose-600" : "text-amber-600"}>
                    👨‍👩‍👧 Parent: {post.parent_approved === true ? "✅ Approved" : post.parent_approved === false ? "❌ Rejected" : "⏳ Pending"}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className={post.admin_approved === true ? "text-emerald-600" : post.admin_approved === false ? "text-rose-600" : "text-amber-600"}>
                    ⚙️ Admin: {post.admin_approved === true ? "✅ Approved" : post.admin_approved === false ? "❌ Rejected" : "⏳ Pending"}
                  </span>
                </div>

                {/* Content */}
                {post.title && <h3 className="font-bold text-slate-900 text-lg">{post.title}</h3>}
                <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>

                {/* Images */}
                {post.images && post.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {post.images.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-full rounded-xl object-cover aspect-video border border-slate-100" />
                    ))}
                  </div>
                )}

                {/* Actions for pending */}
                {filter === "pending" && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Rejection reason (optional)</label>
                      <input value={rejectReason[post.id] || ""} onChange={(e) => setRejectReason((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="Tell the student why (they'll see this)"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-violet-300 transition" />
                    </div>
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}