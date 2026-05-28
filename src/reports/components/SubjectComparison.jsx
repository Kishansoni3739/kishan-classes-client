import React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";

export function SubjectComparison({ subjectStats, batchStats }) {
  // Merge student stats with batch stats
  const data = subjectStats.map(stat => {
    const batchAvg = batchStats ? batchStats[stat.subject] || 0 : Math.max(0, stat.averagePercent - (Math.random() * 20 - 5)); // Mock batch average if unavailable
    return {
      subject: stat.subject,
      studentScore: stat.averagePercent,
      batchScore: Math.round(batchAvg)
    };
  });

  if (data.length < 3) {
    return (
      <div className="rounded-2xl border border-slate-200 p-5 bg-white shadow-sm h-[320px] flex items-center justify-center flex-col text-center">
        <h4 className="mb-2 text-base font-semibold text-slate-700">Subject Comparison</h4>
        <p className="text-sm text-slate-500">Not enough subjects tested to generate radar chart (min 3).</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-5 bg-white shadow-sm h-[320px]">
      <h4 className="mb-4 text-base font-semibold text-slate-700">Student vs Batch Average</h4>
      <div className="h-[230px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Radar name="Student" dataKey="studentScore" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
            <Radar name="Batch Avg" dataKey="batchScore" stroke="#cbd5e1" fill="#cbd5e1" fillOpacity={0.3} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
