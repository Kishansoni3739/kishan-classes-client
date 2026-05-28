import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function ProgressChart({ tests }) {
  // Map tests to chronological percentages
  const data = [...tests]
    .sort((a, b) => new Date(a.testDate) - new Date(b.testDate))
    .map((test, index) => ({
      name: `T${index + 1}`,
      testName: test.testName,
      subject: test.subject,
      percentage: test.maxMarks > 0 ? Math.round((test.marksObtained / test.maxMarks) * 100) : 0,
      date: new Date(test.testDate).toLocaleDateString('en-GB')
    }));

  return (
    <div className="rounded-2xl border border-slate-200 p-5 bg-white shadow-sm h-[320px]">
      <h4 className="mb-4 text-base font-semibold text-slate-700">Chronological Score Trend</h4>
      <div className="h-[230px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.testName || label}
              formatter={(value, name, props) => [`${value}%`, props.payload.subject]}
            />
            <Line type="monotone" dataKey="percentage" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
