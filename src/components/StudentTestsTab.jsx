import React, { useEffect, useState } from "react";
import { BookOpen, Calendar, CheckCircle, Clock, FileText, XCircle } from "lucide-react";
import { api } from "../api/http";
import { EmptyState } from "./EmptyState";
import { date } from "../utils/format";

export function StudentTestsTab({ student }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const { data } = await api.get(`/students/${student._id}/tests`);
        setTests(data);
      } catch (err) {
        setError("Could not load test history.");
      } finally {
        setLoading(false);
      }
    };
    if (student?._id) fetchTests();
  }, [student]);

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading tests...</div>;
  if (error) return <EmptyState title="Error" message={error} />;
  
  if (tests.length === 0) {
    return <EmptyState title="No Tests Found" message="This student has not participated in any tests yet." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-semibold text-lg text-ink">Test History</h3>
        <span className="bg-brand/10 text-brand text-xs font-semibold px-2 py-0.5 rounded-full">{tests.length} Total</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tests.map(result => {
          const test = result.test;
          if (!test) return null; // Defensive check
          
          const isCompleted = test.status === "completed";
          const isCancelled = test.status === "cancelled";
          const isUpcoming = test.status === "scheduled";

          return (
            <div key={result._id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col hover:shadow-md transition-shadow relative overflow-hidden">
              {/* Status Header */}
              <div className="flex justify-between items-start mb-2 z-10 relative">
                <h4 className="font-semibold text-ink line-clamp-1 pr-2">{test.title}</h4>
                {isCompleted ? (
                   <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1"><CheckCircle size={12}/> Completed</span>
                ) : isCancelled ? (
                   <span className="text-xs font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1"><XCircle size={12}/> Cancelled</span>
                ) : (
                   <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1"><Clock size={12}/> Scheduled</span>
                )}
              </div>

              {/* Details */}
              <div className="space-y-1.5 mt-2 text-sm text-slate-600 flex-1 z-10 relative">
                <div className="flex items-center gap-2"><BookOpen size={14} className="text-slate-400" /> Topic: {test.topic}</div>
                <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400" /> Date: {date(test.testDate)}</div>
                <div className="flex items-center gap-2"><FileText size={14} className="text-slate-400" /> Subject: {test.subject?.name}</div>
              </div>

              {/* Result Section (Only if completed) */}
              {isCompleted && (
                <div className="mt-4 pt-3 border-t border-slate-100 z-10 relative">
                  {result.isAbsent ? (
                    <div className="text-center py-2 bg-rose-50 text-rose-700 rounded-md font-semibold text-sm border border-rose-100">
                      Marked Absent
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Marks</p>
                        <p className="text-lg font-bold text-slate-800">
                          {result.marksObtained} <span className="text-sm font-medium text-slate-400">/ {test.maxMarks}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Percentage</p>
                        <p className={`text-lg font-bold ${result.percentage >= 80 ? 'text-emerald-600' : result.percentage >= 50 ? 'text-brand' : 'text-rose-600'}`}>
                          {result.percentage?.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
