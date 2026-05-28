import React from "react";

export function TestScoresTable({ tests }) {
  if (!tests || tests.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e2e8f0] p-4 bg-[#ffffff]">
        <h4 className="mb-2 text-base font-semibold text-[#334155]">Test Scores</h4>
        <div className="flex h-32 items-center justify-center text-sm text-[#64748b]">
          No tests found for this period.
        </div>
      </div>
    );
  }

  // Sort tests by date descending (newest first) for the table, or keep chronological
  // The user says "in overall include all tests", let's show newest first so recent are at top
  const sortedTests = [...tests].sort((a, b) => new Date(b.testDate) - new Date(a.testDate));

  return (
    <div className="rounded-2xl border border-[#e2e8f0] p-4 bg-[#ffffff]">
      <h4 className="mb-4 text-base font-semibold text-[#334155]">Test Scores Log</h4>
      <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
        <table className="w-full text-left text-sm text-[#475569]">
          <thead className="bg-[#f8fafc] text-xs uppercase text-[#64748b]">
            <tr>
              <th className="border-b border-[#e2e8f0] px-4 py-3 font-medium">Date</th>
              <th className="border-b border-[#e2e8f0] px-4 py-3 font-medium">Test Name</th>
              <th className="border-b border-[#e2e8f0] px-4 py-3 font-medium">Subject</th>
              <th className="border-b border-[#e2e8f0] px-4 py-3 font-medium text-center">Max</th>
              <th className="border-b border-[#e2e8f0] px-4 py-3 font-medium text-center">Obtained</th>
              <th className="border-b border-[#e2e8f0] px-4 py-3 font-medium text-right">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {sortedTests.map((test, index) => {
              const percentage = test.maxMarks > 0 ? Math.round((test.marksObtained / test.maxMarks) * 100) : 0;
              let pctColor = "text-[#64748b]";
              if (percentage >= 90) pctColor = "text-[#059669] font-semibold";
              else if (percentage >= 75) pctColor = "text-[#2563eb] font-semibold";
              else if (percentage < 50) pctColor = "text-[#dc2626] font-semibold";

              return (
                <tr key={index} className="hover:bg-[#f8fafc]">
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(test.testDate).toLocaleDateString('en-GB')}</td>
                  <td className="px-4 py-2 font-medium text-[#334155]">{test.testName}</td>
                  <td className="px-4 py-2">{test.subject}</td>
                  <td className="px-4 py-2 text-center">{test.maxMarks}</td>
                  <td className="px-4 py-2 text-center font-medium">{test.marksObtained}</td>
                  <td className={`px-4 py-2 text-right ${pctColor}`}>{percentage}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
