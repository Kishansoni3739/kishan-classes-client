export const EmptyState = ({ title = "No records yet", message = "Create the first record to get started." }) => (
  <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center">
    <div className="font-semibold text-ink">{title}</div>
    <div className="mt-1 text-sm text-slate-500">{message}</div>
  </div>
);
