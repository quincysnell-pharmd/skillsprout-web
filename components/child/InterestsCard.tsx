export default function InterestsCard(props: {
  interests: { careers: string[]; topics: string[] };
}) {
  const { interests } = props;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Interests</h2>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        <ChipGroup
          title="Careers you like"
          items={interests.careers}
          emptyText="No careers saved yet."
        />
        <ChipGroup
          title="Topics you like"
          items={interests.topics}
          emptyText="No topics saved yet."
        />
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Next step: we’ll connect this to your “save career interest” flow.
      </p>
    </div>
  );
}

function ChipGroup(props: { title: string; items: string[]; emptyText: string }) {
  const { title, items, emptyText } = props;

  return (
    <div>
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length === 0 ? (
          <span className="text-sm text-slate-500">{emptyText}</span>
        ) : (
          items.map((x) => (
            <span
              key={x}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
            >
              {x}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
