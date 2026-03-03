import Link from "next/link";

export default function ProgressCard(props: {
  courseName: string;
  progressPct: number;
  modulesCompleted: number;
  modulesTotal: number;
  lastActiveText: string;
  nextUpText: string;
  continueHref: string;
}) {
  const {
    courseName,
    progressPct,
    modulesCompleted,
    modulesTotal,
    lastActiveText,
    nextUpText,
    continueHref,
  } = props;

  const pct = Math.min(100, Math.max(0, progressPct));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Current Course</h2>
          <p className="mt-1 text-slate-800">{courseName}</p>
          <p className="mt-1 text-sm text-slate-500">Last active: {lastActiveText}</p>
        </div>

        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          {pct}%
        </div>
      </div>

      <div className="mt-4">
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {modulesCompleted} / {modulesTotal} modules complete
          </span>
          <span className="text-slate-500">Next up: {nextUpText}</span>
        </div>
      </div>

      <div className="mt-5">
        <Link
          href={continueHref}
          className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          Continue
        </Link>
      </div>
    </div>
  );
}
