"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase/client";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    async function handleSuccess() {
      const params = new URLSearchParams(window.location.search);
      const courseId = params.get("course");
      const childId  = params.get("child");

      if (!courseId || !childId) { setStatus("done"); return; }

      // Wait a moment for session to restore after Stripe redirect
      await new Promise(r => setTimeout(r, 1500));

      const supabase = supabaseBrowser();

      // Mark enrollment as paid using the anon client
      // This will work if RLS allows it, otherwise webhook handles it
      try {
        await supabase.from("enrollments").upsert(
          {
            child_id: childId,
            course_id: courseId,
            paid: true,
            progress_pct: 0,
            enrolled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "child_id,course_id" }
        );
      } catch (e) {
        console.log("Enrollment update attempted:", e);
      }

      setStatus("done");
    }

    handleSuccess();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 px-4">
      <div className="max-w-md w-full rounded-3xl bg-white shadow-xl p-10 text-center space-y-6">
        {status === "loading" ? (
          <>
            <div className="text-6xl animate-bounce">🌱</div>
            <h1 className="font-display text-2xl font-black text-slate-900">Unlocking course...</h1>
            <p className="text-sm font-semibold text-slate-500">Just a moment while we set everything up!</p>
          </>
        ) : (
          <>
            <div className="text-6xl">🎉</div>
            <h1 className="font-display text-2xl font-black text-emerald-900">Course Unlocked!</h1>
            <p className="text-sm font-semibold text-slate-600 leading-relaxed">
              Your child can now start learning. Sign in to your dashboard to see their progress.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/dashboard/parent")}
                className="w-full rounded-2xl bg-emerald-600 py-4 text-base font-black text-white hover:bg-emerald-700 transition"
              >
                Go to Parent Dashboard →
              </button>
              <button
                onClick={() => router.push("/auth")}
                className="w-full rounded-2xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition"
              >
                Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}