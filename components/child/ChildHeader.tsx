type Child = {
  id: string;
  name: string;
  ageBand: string;
  title?: string;
  avatarEmoji?: string;
};

export default function ChildHeader({ child }: { child: Child }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
          {child.avatarEmoji ?? "🙂"}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-2xl font-bold text-slate-900">{child.name}</h1>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
              Ages {child.ageBand}
            </span>

            {child.title ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
                {child.title}
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-sm text-slate-600">
            Welcome back! Let’s keep growing your skills.
          </p>
        </div>
      </div>
    </div>
  );
}
