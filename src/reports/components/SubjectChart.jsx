import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function SubjectChart({ subjectStats }) {
  const colors = ['#1e3a8a', '#3b82f6', '#0ea5e9', '#0284c7', '#0369a1', '#075985'];

  return (
    <div className="rounded-2xl border border-slate-200 p-5 bg-white shadow-sm h-[320px]">
      <h4 className="mb-4 text-base font-semibold text-slate-700">Subject-wise Average Performance</h4>
      <div className="h-[230px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={subjectStats} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="subject" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: 'rgba(30, 58, 138, 0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Bar dataKey="averagePercent" radius={[6, 6, 0, 0]} name="Average Score (%)">
              {subjectStats.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
