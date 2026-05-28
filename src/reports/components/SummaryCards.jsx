import React from "react";

export function SummaryCards({ summary, rank }) {
  const cards = [
    { label: "Overall Score", value: `${summary.overallAverage}%`, color: "text-[#1d4ed8]", bg: "bg-[#eff6ff]" },
    { label: "Tests Taken", value: summary.tests.length, color: "text-[#4338ca]", bg: "bg-[#eef2ff]" },
    { label: "Strongest Subject", value: summary.strongest ? summary.strongest.subject : "N/A", color: "text-[#047857]", bg: "bg-[#ecfdf5]" },
    { label: "Weakest Subject", value: summary.weakest ? summary.weakest.subject : "N/A", color: "text-[#be123c]", bg: "bg-[#fff1f2]" },
    {
      label: "Improvement",
      value: `${summary.overallAverage > 0 ? "+" : ""}${Math.round(summary.subjectStats.reduce((acc, curr) => acc + curr.growth, 0) / (summary.subjectStats.length || 1))}%`,
      color: "text-[#0f766e]",
      bg: "bg-[#f0fdfa]"
    },
    { label: "Batch Rank", value: rank || "N/A", color: "text-[#7e22ce]", bg: "bg-[#faf5ff]" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {cards.map((card, idx) => (
        <div key={idx} className={`rounded-xl p-3 border border-[#e2e8f0] ${card.bg}`}>
          <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">{card.label}</p>
          <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
