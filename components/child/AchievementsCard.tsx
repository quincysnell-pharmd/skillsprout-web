export default function AchievementsCard(props: {
  achievements: {
    modulesCompleted: number;
    coursesCompleted: number;
    finalProjectStatus: "In Progress" | "Submitted" | "Approved";
    streakDays: number;
  };
}) {
  const { achievements } = props;

  const statusBadge =
    achievements.finalProjectStatus === "Approved"
      ? "bg-emerald-50 text-emerald-800"
      : achievements.finalProjectStatus === "Submitted"
      ? "bg-amber-50 text-amber-800"
      : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Achievements</h2>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Stat label="Modules completed" value={achievements.modulesCompleted} />
        <Stat label="Courses completed" value={achievements.coursesCompleted} />
        <Stat label="Streak" value={`${achievements.streakDays} days`} />

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Final project</div>
          <div className="mt-1">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusBadge}`}
            >
              {achievements.finalProjectStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
