import React from "react";

export function SummaryCards({ summary, rank }) {
  const cards = [
    { label: "Overall Score", value: `${summary.overallAverage}%`, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Tests Taken", value: summary.tests.length, color: "text-indigo-700", bg: "bg-indigo-50" },
    { label: "Highest Subject", value: summary.strongest ? summary.strongest.subject : "N/A", color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Weakest Subject", value: summary.weakest ? summary.weakest.subject : "N/A", color: "text-rose-700", bg: "bg-rose-50" },
    { 
      label: "Improvement", 
      value: `${summary.overallAverage > 0 ? "+" : ""}${Math.round(summary.subjectStats.reduce((acc, curr) => acc + curr.growth, 0) / (summary.subjectStats.length || 1))}%`, 
      color: "text-teal-700", 
      bg: "bg-teal-50" 
    },
    { label: "Batch Rank", value: rank || "N/A", color: "text-purple-700", bg: "bg-purple-50" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {cards.map((card, idx) => (
        <div key={idx} className={`rounded-xl p-4 border border-slate-200 shadow-sm ${card.bg}`}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
          <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
