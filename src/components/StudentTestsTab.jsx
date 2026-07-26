import React, { useEffect, useState } from "react";
import { BookOpen, Calendar, CheckCircle, Clock, FileText, XCircle, X, Award } from "lucide-react";
import { api } from "../api/http";
import { EmptyState } from "./EmptyState";

const formatSquareDate = (dateString) => {
  if (!dateString) return { day: "--", month: "---", fullDate: "N/A" };
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return { day: "--", month: "---", fullDate: "N/A" };
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const year = d.getFullYear();
  return {
    day,
    month,
    fullDate: `${d.getDate()} ${d.toLocaleString("en-US", { month: "long" })} ${year}`,
  };
};

const calculateGrade = (percentage) => {
  if (percentage === undefined || percentage === null) return "N/A";
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
};

export function StudentTestsTab({ student }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedResult, setSelectedResult] = useState(null);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const { data } = await api.get(`/students/${student._id}/tests`);
        const sorted = (data || []).sort((a, b) => {
          const dateA = a.test?.testDate ? new Date(a.test.testDate).getTime() : 0;
          const dateB = b.test?.testDate ? new Date(b.test.testDate).getTime() : 0;
          return dateB - dateA;
        });
        setTests(sorted);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg text-ink">Test History</h3>
          <span className="bg-brand/10 text-brand text-xs font-bold px-2.5 py-0.5 rounded-full">
            {tests.length} Total
          </span>
        </div>
        <p className="text-xs text-slate-400 font-medium hidden sm:block">Click any card for score details</p>
      </div>

      {/* Responsive Square Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {tests.map((result) => {
          const test = result.test;
          if (!test) return null;

          const isCompleted = test.status === "completed";
          const isCancelled = test.status === "cancelled";
          const isUpcoming = test.status === "scheduled";
          const dateInfo = formatSquareDate(test.testDate);

          return (
            <button
              key={result._id}
              onClick={() => setSelectedResult(result)}
              className="aspect-square flex flex-col justify-between p-3.5 sm:p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md hover:border-brand/40 transition-all cursor-pointer group text-left relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              {/* Card Top: Date Badge & Status Pill */}
              <div className="flex justify-between items-start w-full gap-2">
                <div className="flex flex-col items-center justify-center bg-brand/10 text-brand rounded-xl px-2 py-1 min-w-[46px] shrink-0 border border-brand/20">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider leading-none">
                    {dateInfo.month}
                  </span>
                  <span className="text-lg font-black leading-none mt-0.5">{dateInfo.day}</span>
                </div>

                {isCompleted ? (
                  result.isAbsent ? (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full shrink-0">
                      Absent
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-0.5">
                      <CheckCircle size={10} /> {result.percentage?.toFixed(0)}%
                    </span>
                  )
                ) : isCancelled ? (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full shrink-0">
                    Cancelled
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                    Upcoming
                  </span>
                )}
              </div>

              {/* Card Center: Subject & Title */}
              <div className="my-auto py-1 w-full">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate mb-0.5">
                  {test.subject?.name || "Test"}
                </p>
                <h4 className="font-bold text-xs sm:text-sm text-ink line-clamp-2 leading-snug group-hover:text-brand transition-colors">
                  {test.title}
                </h4>
              </div>

              {/* Card Bottom: Marks Summary or Topic */}
              <div className="pt-2 border-t border-slate-100 w-full flex items-center justify-between text-xs">
                {isCompleted && !result.isAbsent ? (
                  <>
                    <span className="text-slate-500 font-medium text-[11px] truncate">
                      {result.marksObtained}/{test.maxMarks} Marks
                    </span>
                    <span className="font-extrabold text-brand text-[11px]">
                      Gr. {calculateGrade(result.percentage)}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400 font-medium text-[11px] truncate">
                    Topic: {test.topic || "N/A"}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Test Score & Details Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3.5">
              <div className="pr-4">
                <span className="text-xs font-bold uppercase tracking-wider text-brand">
                  {selectedResult.test?.subject?.name || "Subject Test"}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-ink mt-0.5 leading-snug">
                  {selectedResult.test?.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Test Date & Meta */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 uppercase tracking-wider font-semibold block text-[10px]">Test Date</span>
                <span className="font-bold text-slate-800 text-sm">
                  {formatSquareDate(selectedResult.test?.testDate).fullDate}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider font-semibold block text-[10px]">Topic</span>
                <span className="font-bold text-slate-800 text-sm truncate block">
                  {selectedResult.test?.topic || "N/A"}
                </span>
              </div>
            </div>

            {/* Score & Performance Summary Box */}
            {selectedResult.test?.status === "completed" ? (
              selectedResult.isAbsent ? (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-center font-bold text-sm">
                  Student was marked ABSENT for this test
                </div>
              ) : (
                <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl space-y-4 shadow-md">
                  <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Marks Obtained</p>
                      <p className="text-3xl font-black text-white mt-1">
                        {selectedResult.marksObtained}{" "}
                        <span className="text-lg text-slate-400 font-semibold">/ {selectedResult.test?.maxMarks}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Percentage</p>
                      <p className="text-3xl font-black text-emerald-400 mt-1">
                        {selectedResult.percentage?.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Grade Assigned:</span>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-sm border border-emerald-500/30">
                      Grade {calculateGrade(selectedResult.percentage)}
                    </span>
                  </div>
                </div>
              )
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-center font-bold text-sm">
                Test Status: {selectedResult.test?.status?.toUpperCase()}
              </div>
            )}

            {/* Description if present */}
            {selectedResult.test?.description && (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="font-bold text-slate-700 block mb-1">Description:</span>
                {selectedResult.test.description}
              </div>
            )}

            {/* Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedResult(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
