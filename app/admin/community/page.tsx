"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/client";

interface Props {
  childId: string;
  courseId: string;
  lessonId?: string;
  category?: string;
  onClose: () => void;
  onSubmitted: () => void;
}

type PostType = "reflection" | "showcase" | "discovery";

const TYPE_OPTIONS: { type: PostType; emoji: string; label: string; description: string; placeholder: string }[] = [
  {
    type: "reflection",
    emoji: "📝",
    label: "Reflection",
    description: "Write about what you learned in this unit",
    placeholder: "What did I learn? What was surprising? What questions do I still have?",
  },
  {
    type: "showcase",
    emoji: "🏆",
    label: "Showcase",
    description: "Share a project or something you created",
    placeholder: "Describe what you built or created, how you did it, and what you're proud of!",
  },
  {
    type: "discovery",
    emoji: "💡",
    label: "Discovery",
    description: "Share something exciting you discovered",
    placeholder: "I learned that... / I was surprised to discover... / Something that blew my mind was...",
  },
];

export function CommunityPostForm({ childId, courseId, lessonId, category, onClose, onSubmitted }: Props) {
  const supabase = supabaseBrowser();
  const [type, setType]       = useState<PostType>("reflection");
  const [title, setTitle]     = useState("");
  const [content, setContent] = useState("");
  const [images, setImages]   = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const selected = TYPE_OPTIONS.find((o) => o.type === type)!;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of files.slice(0, 4)) {
      const path = `community/${childId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("community-images").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("community-images").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
    }
    setImages((prev) => [...prev, ...uploaded].slice(0, 4));
    setUploading(false);
  }

  async function submit() {
    if (!content.trim()) { setError("Please write something before sharing!"); return; }
    if (content.trim().length < 20) { setError("Please write a bit more — at least 20 characters!"); return; }
    setBusy(true);
    setError(null);

    const { error } = await supabase.from("community_posts").insert({
      child_id:       childId,
      course_id:      courseId,
      lesson_id:      lessonId ?? null,
      type,
      title:          title.trim() || null,
      content:        content.trim(),
      images:         images.length > 0 ? images : null,
      category:       category ?? null,
      parent_approved: null,
      admin_approved:  null,
      status:         "pending",
    });

    if (error) { setError("Something went wrong — try again!"); setBusy(false); return; }
    setBusy(false);
    onSubmitted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50">
          <div>
            <h2 className="font-display text-xl font-black text-slate-900">Share with the Community 🌱</h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Your post will be reviewed before it's shared publicly</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button key={opt.type} onClick={() => setType(opt.type)}
                className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center transition ${
                  type === opt.type ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white hover:border-violet-200"
                }`}>
                <span className="text-2xl">{opt.emoji}</span>
                <span className="text-xs font-bold text-slate-700">{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-2.5">
            <p className="text-xs font-semibold text-violet-700">{selected.description}</p>
          </div>

          {/* Title (optional) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Title <span className="text-slate-400 font-semibold">(optional)</span></label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80}
              placeholder="Give your post a title..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition" />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Your Post *</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5}
              placeholder={selected.placeholder}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition resize-none" />
            <p className="mt-1 text-xs font-semibold text-slate-400">{content.length} characters</p>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Images <span className="text-slate-400 font-semibold">(optional, up to 4)</span></label>
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {images.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="w-full rounded-xl object-cover aspect-video border border-slate-100" />
                    <button onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white text-xs hover:bg-rose-600">✕</button>
                  </div>
                ))}
              </div>
            )}
            {images.length < 4 && (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-4 hover:border-violet-300 hover:bg-violet-50 transition">
                <span className="text-2xl mb-1">{uploading ? "⏳" : "📷"}</span>
                <span className="text-xs font-bold text-slate-500">{uploading ? "Uploading..." : "Click to add images"}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            )}
          </div>

          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}

          {/* Safety notice */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-bold text-amber-800">🛡️ Safety first!</p>
            <p className="text-xs font-semibold text-amber-700 mt-0.5">Your post will be reviewed by your parent and our team before anyone else can see it. Never share personal info like your full name, address, or school.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 transition">Cancel</button>
          <button onClick={submit} disabled={busy || uploading}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60 transition">
            {busy ? "Submitting..." : "Submit for Review 🌱"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Post submitted success screen ─────────────────────────────
export function PostSubmittedBanner({ onClose }: { onClose: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-6 text-center space-y-3">
      <div className="text-5xl">🌱</div>
      <h3 className="font-display text-xl font-bold text-violet-900">Post submitted!</h3>
      <p className="text-sm font-semibold text-violet-700">Your post is now waiting for review from your parent and our team. Once approved it will appear in the Community feed!</p>
      <button onClick={onClose} className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition">Got it! ✓</button>
    </div>
  );
}