'use client';

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function AuthInner() {
  const searchParams = useSearchParams();

  // Example: read query params like ?next=/dashboard
  const next = searchParams.get("next") ?? "/dashboard";

  // TODO: replace this with your current auth UI/logic
  // The key is: anything using useSearchParams must live here.
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Auth</h1>
        <p className="text-sm opacity-80 mb-6">
          After login, you’ll be sent to: <span className="font-mono">{next}</span>
        </p>

        {/* Put your existing auth UI here (Supabase login, buttons, etc.) */}
        <div className="text-sm opacity-80">
          Replace this box with your current /auth page content.
        </div>
      </div>
    </div>
  );
}

export default function AuthClient() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <AuthInner />
    </Suspense>
  );
}