export const StatCard = ({ label, value, tone = "brand" }) => {
  const tones = {
    brand: "border-brand/20 bg-brand/10 text-brand",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-white text-ink",
    rose: "border-rose-200 bg-rose-50 text-rose-700"
  };

  return (
    <div className={`rounded-md border p-4 shadow-sm ${tones[tone] || tones.brand}`}>
      <div className="text-sm font-medium opacity-80">{label}</div>
      <div className="mt-2 text-xl md:text-2xl font-bold">{value}</div>
    </div>
  );
};
