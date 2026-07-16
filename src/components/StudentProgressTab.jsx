import React, { useMemo } from "react";
import { 
  TrendingUp, Award, AlertCircle, Download, BookOpen, 
  Calendar, CheckCircle, Clock, Sparkles, User, ShieldAlert 
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { date } from "../utils/format.js";
import { EmptyState } from "./EmptyState.jsx";

export const StudentProgressTab = ({ student, results = [] }) => {
  // 1. Calculations - Overall metrics
  const overallStats = useMemo(() => {
    const completed = results.filter(r => !r.isAbsent && r.percentage !== undefined);
    const absentCount = results.filter(r => r.isAbsent).length;
    
    if (completed.length === 0) {
      return { average: 0, attempted: 0, absent: absentCount, highest: 0, lowest: 0 };
    }
    
    const percentages = completed.map(r => r.percentage);
    const sum = percentages.reduce((sum, val) => sum + val, 0);
    const avg = Math.round(sum / completed.length);
    
    return {
      average: avg,
      attempted: completed.length,
      absent: absentCount,
      highest: Math.round(Math.max(...percentages)),
      lowest: Math.round(Math.min(...percentages))
    };
  }, [results]);

  // 2. Calculations - Subject-wise metrics
  const subjectData = useMemo(() => {
    const groups = {};
    results.forEach(r => {
      if (r.isAbsent || r.percentage === undefined || !r.test?.subject?.name) return;
      const subName = r.test.subject.name;
      if (!groups[subName]) {
        groups[subName] = { name: subName, total: 0, count: 0 };
      }
      groups[subName].total += r.percentage;
      groups[subName].count += 1;
    });

    return Object.values(groups).map(g => ({
      name: g.name,
      average: Math.round(g.total / g.count),
      count: g.count
    })).sort((a, b) => b.average - a.average);
  }, [results]);

  // 3. Strongest & Improvement Needed Subjects
  const strongSubject = (subjectData[0] && subjectData[0].average >= 75) ? subjectData[0] : null;
  const weakSubject = (subjectData.length > 0 && subjectData[subjectData.length - 1].average < 75) ? subjectData[subjectData.length - 1] : null;

  // Generate dynamic feedback comment
  const feedbackComment = useMemo(() => {
    const avg = overallStats.average;
    if (avg >= 90) {
      return `${student.user?.name} is exhibiting outstanding performance with exceptional understanding across subjects.`;
    } else if (avg >= 75) {
      return `${student.user?.name} is progressing well. Consistent scores are seen, and minor focus in weaker subjects will yield peak results.`;
    } else if (avg >= 50) {
      return `${student.user?.name} shows average progress. Reviewing errors in weaker areas is recommended to build confidence.`;
    } else if (results.length === 0) {
      return "No test records are available to generate progress insights yet.";
    } else {
      return `${student.user?.name} requires dedicated guidance and conceptual revision in basic fundamentals.`;
    }
  }, [overallStats.average, student, results]);

  // Extract unique subjects
  const subjects = useMemo(() => {
    const set = new Set();
    results.forEach(r => {
      if (r.test?.subject?.name) set.add(r.test.subject.name);
    });
    return Array.from(set);
  }, [results]);

  // Chronological test score history grouped by date
  const chartData = useMemo(() => {
    const chronResults = [...results]
      .filter(r => !r.isAbsent && r.percentage !== undefined && r.test?.testDate && r.test?.subject?.name)
      .sort((a, b) => new Date(a.test.testDate) - new Date(b.test.testDate));

    const dateGroups = {};
    chronResults.forEach(r => {
      const dateStr = new Date(r.test.testDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = { date: dateStr };
      }
      dateGroups[dateStr][r.test.subject.name] = Math.round(r.percentage);
    });

    return Object.values(dateGroups);
  }, [results]);

  const subjectColors = ["#0d9488", "#3b82f6", "#e11d48", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981"];

  // 5. Current Calendar Month's Results (for PDF report)
  const currentMonthResults = useMemo(() => {
    const now = new Date();
    const targetMonth = now.getMonth();
    const targetYear = now.getFullYear();

    return [...results]
      .filter(r => r.test?.testDate)
      .filter(r => {
        const d = new Date(r.test.testDate);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      })
      .sort((a, b) => new Date(b.test.testDate) - new Date(a.test.testDate));
  }, [results]);

  const currentMonthName = useMemo(() => {
    const now = new Date();
    return now.toLocaleString("default", { month: "long", year: "numeric" });
  }, []);

  if (results.length === 0) {
    return <EmptyState title="No Progress Data" message="No completed test scores found for this student to generate a progress report." />;
  }

  const handleDownloadPDF = () => {
    window.print();
  };

  // Modern print styling to compress layout to exactly 1 A4 page and eliminate overflow pages
  const printStyles = `
    @media print {
      html, body {
        height: 100% !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        background-color: white !important;
        color: black !important;
      }
      @page {
        size: A4 portrait;
        margin: 6mm 10mm 6mm 10mm;
      }
      .no-print {
        display: none !important;
      }
      .print-layout {
        display: block !important;
        width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;

  return (
    <div className="space-y-6">
      <style>{printStyles}</style>

      {/* ========================================================================= */}
      {/* 1. SCREEN VIEW ONLY (DASHBOARD WITH METRICS TILES AND FULL DESIGN)       */}
      {/* ========================================================================= */}
      <div className="no-print space-y-6">
        
        {/* Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-ink">Academic Progress Statistics</h2>
            <p className="text-sm text-slate-500">Track and monitor academic performance, subject metrics, and score trends.</p>
          </div>
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand/90 shadow-sm transition-colors cursor-pointer"
          >
            <Download size={16} /> Download PDF Report
          </button>
        </div>

        {/* Analytics Summary Panel */}
        <div className="space-y-6 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          {/* Student metadata header */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-xl bg-slate-50/50 border border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student Name</p>
              <p className="text-sm font-bold text-ink mt-0.5">{student.user?.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student ID</p>
              <p className="text-sm font-bold text-brand font-mono mt-0.5">{student.studentId}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Batch</p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">{student.batch?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guardian Details</p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">
                {student.guardian?.name || "N/A"} ({student.guardian?.phone || "N/A"})
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3 items-stretch">
            {/* Overall Score Dial */}
            <div className="flex flex-col items-center justify-center p-5 rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Overall Performance</p>
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                  <circle 
                    cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                    className={`transition-all duration-1000 ease-out ${
                      overallStats.average >= 80 ? 'text-emerald-500' : overallStats.average >= 60 ? 'text-brand' : 'text-rose-500'
                    }`} 
                    strokeDasharray={`${2 * Math.PI * 40}`} 
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - overallStats.average / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-black text-ink">{overallStats.average}%</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Average</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid (Screen Only) */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attempted Tests</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{overallStats.attempted}</p>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs mt-2">
                  <CheckCircle size={14}/> Completed
                </div>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Missed Tests</p>
                  <p className="text-2xl font-black text-rose-600 mt-1">{overallStats.absent}</p>
                </div>
                <div className="flex items-center gap-1.5 text-rose-500 font-semibold text-xs mt-2">
                  <Clock size={14}/> Marked Absent
                </div>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Highest Score</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{overallStats.highest}%</p>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs mt-2">
                  <Award size={14}/> Best Performance
                </div>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lowest Score</p>
                  <p className="text-2xl font-black text-amber-600 mt-1">{overallStats.lowest}%</p>
                </div>
                <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-xs mt-2">
                  <AlertCircle size={14}/> Focus Needed
                </div>
              </div>
            </div>
          </div>

          {/* Subject Breakdown & Recommendations */}
          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <div className="p-5 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink flex items-center gap-2 mb-4">
                <BookOpen size={16} className="text-brand"/> Subject-Wise Performance
              </h3>
              <div className="space-y-4 flex-1">
                {subjectData.map(subject => (
                  <div key={subject.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600">{subject.name}</span>
                      <span className="text-ink">{subject.average}% ({subject.count} tests)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          subject.average >= 80 ? 'bg-emerald-500' : subject.average >= 60 ? 'bg-brand' : 'bg-rose-500'
                        }`}
                        style={{ width: `${subject.average}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-ink flex items-center gap-2 mb-4">
                  <Sparkles size={16} className="text-brand"/> Strength & Focus Recommendations
                </h3>
                <div className="space-y-3">
                  {strongSubject && (
                    <div className="flex gap-3 p-3.5 rounded-lg border border-emerald-100 bg-emerald-50/40 text-emerald-800">
                      <Award size={20} className="shrink-0 text-emerald-600" />
                      <div>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-700">Strongest Area</h4>
                        <p className="text-sm font-semibold mt-0.5">{strongSubject.name}</p>
                        <p className="text-xs opacity-90 mt-0.5">Performing strongly with an average score of {strongSubject.average}%.</p>
                      </div>
                    </div>
                  )}
                  {weakSubject && (
                    <div className="flex gap-3 p-3.5 rounded-lg border border-amber-100 bg-amber-50/40 text-amber-800">
                      <ShieldAlert size={20} className="shrink-0 text-amber-600" />
                      <div>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-amber-700">Needs Focus</h4>
                        <p className="text-sm font-semibold mt-0.5">{weakSubject.name}</p>
                        <p className="text-xs opacity-90 mt-0.5">Average score is {weakSubject.average}%. Actionable exercises are recommended.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Academic Advisor Comments</span>
                {feedbackComment}
              </div>
            </div>
          </div>

          {/* Test trend graph */}
          <div className="p-5 rounded-xl border border-slate-100 bg-white shadow-sm mt-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-brand"/> Test Score Performance Trend
            </h3>
            <div className="h-[250px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-2.5 border border-slate-200 shadow-lg rounded-md text-xs space-y-1">
                              <p className="font-bold text-ink border-b pb-1 mb-1">Date: {payload[0].payload.date}</p>
                              {payload.map((entry) => (
                                <p key={entry.name} style={{ color: entry.color }} className="font-bold">
                                  {entry.name}: {entry.value}%
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                    {subjects.map((subj, idx) => (
                      <Line 
                        key={subj}
                        type="monotone"
                        dataKey={subj}
                        stroke={subjectColors[idx % subjectColors.length]}
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                        connectNulls={true}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400 text-center py-10">Not enough test data to plot trend.</p>
              )}
            </div>
          </div>

          {/* All Test Results (Screen - shows ALL attempted + absent) */}
          {results.length > 0 && (
            <div className="p-5 rounded-xl border border-slate-100 bg-white shadow-sm mt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink flex items-center gap-2 mb-4">
                <Calendar size={16} className="text-brand"/> All Test Results ({results.length} total)
              </h3>
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="min-w-full text-xs md:text-sm text-left">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 font-bold">Date</th>
                      <th className="px-4 py-3 font-bold">Test Title</th>
                      <th className="px-4 py-3 font-bold">Subject</th>
                      <th className="px-4 py-3 font-bold text-right">Marks</th>
                      <th className="px-4 py-3 font-bold text-right">Percentage</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {[...results]
                      .filter(r => r.test?.testDate)
                      .sort((a, b) => new Date(b.test.testDate) - new Date(a.test.testDate))
                      .map((r, idx) => (
                      <tr key={idx} className={`hover:bg-slate-50/50 ${r.isAbsent ? 'bg-rose-50/30' : ''}`}>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{date(r.test?.testDate)}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-ink">{r.test?.title}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">Topic: {r.test?.topic}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold">{r.test?.subject?.name || "-"}</td>
                        <td className="px-4 py-3 text-right font-bold">
                          {r.isAbsent ? "-" : `${r.marksObtained} / ${r.test?.maxMarks}`}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {r.isAbsent ? "-" : `${Math.round(r.percentage)}%`}
                        </td>
                        <td className="px-4 py-3">
                          {r.isAbsent ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded uppercase tracking-wider">Absent</span>
                          ) : (
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                              r.percentage >= 80 ? 'bg-emerald-100 text-emerald-700' : r.percentage >= 50 ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {r.percentage >= 80 ? 'Excellent' : r.percentage >= 50 ? 'Pass' : 'Critical'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PRINT LAYOUT ONLY (COMPRESSED SINGLE A4 PAGE LAYOUT)                  */}
      {/* ========================================================================= */}
      <div className="hidden print:block w-full max-w-4xl mx-auto p-4 bg-white text-ink text-xs print-layout">
        
        {/* Header with Title and Circle Score Gauge */}
        <div className="flex justify-between items-center border-b-2 border-brand pb-3 mb-3">
          <div>
            <h1 className="text-xl font-black text-ink">Kishan Classes</h1>
            <p className="text-[9px] uppercase tracking-wider text-brand font-bold">Monthly Student Progress Report Card</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] font-bold text-slate-800">Month: {currentMonthName || "Current Month"}</p>
              <p className="text-[9px] text-slate-400 font-semibold">Report Date: {new Date().toLocaleDateString('en-IN')}</p>
            </div>
            <div className="w-14 h-14 rounded-full border-4 border-brand flex items-center justify-center font-black text-brand text-sm bg-brand/5">
              {overallStats.average}%
            </div>
          </div>
        </div>

        {/* Student metadata info row */}
        <div className="grid grid-cols-6 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3">
          <div>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Student</span>
            <span className="font-bold text-ink text-[10px] truncate block">{student.user?.name}</span>
          </div>
          <div>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Student ID</span>
            <span className="font-bold text-brand font-mono text-[10px]">{student.studentId}</span>
          </div>
          <div>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Batch</span>
            <span className="font-bold text-slate-700 text-[10px]">{student.batch?.name || "N/A"}</span>
          </div>
          <div>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Guardian Name</span>
            <span className="font-bold text-slate-700 text-[10px] truncate block">{student.guardian?.name || "N/A"}</span>
          </div>
          <div>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Tests Attempted</span>
            <span className="font-bold text-emerald-600 text-[10px]">{overallStats.attempted}</span>
          </div>
          <div>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Tests Missed</span>
            <span className="font-bold text-rose-600 text-[10px]">{overallStats.absent}</span>
          </div>
        </div>

        {/* Performance metrics breakdown side-by-side */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          
          {/* Left: Subject Performance Progress Bars */}
          <div className="border border-slate-100 p-3 rounded-lg flex flex-col justify-between bg-white">
            <h3 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-[9px] flex items-center gap-1 border-b border-slate-100 pb-1 shrink-0">
              <BookOpen size={10} className="text-brand"/> Subject-Wise Performance
            </h3>
            <div className="space-y-2 flex-1 justify-center flex flex-col">
              {subjectData.map(subject => (
                <div key={subject.name} className="space-y-0.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600">
                    <span>{subject.name}</span>
                    <span>{subject.average}% ({subject.count} tests)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        subject.average >= 80 ? 'bg-emerald-500' : subject.average >= 60 ? 'bg-brand' : 'bg-rose-500'
                      }`}
                      style={{ width: `${subject.average}%` }}
                    />
                  </div>
                </div>
              ))}
              {subjectData.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">No subject scores available.</p>
              )}
            </div>
          </div>

          {/* Right: Key Strengths & Remarks */}
          <div className="border border-slate-100 p-3 rounded-lg flex flex-col justify-between bg-white">
            <h3 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-[9px] flex items-center gap-1 border-b border-slate-100 pb-1 shrink-0">
              <Sparkles size={10} className="text-brand"/> Strengths & Insights
            </h3>
            <div className="space-y-2 flex-1 justify-center flex flex-col">
              {strongSubject && (
                <div className="text-[10px]">
                  <span className="font-bold text-emerald-600 uppercase text-[8px] block tracking-wide">Key Strength</span>
                  <span className="font-semibold text-slate-800">{strongSubject.name}</span>
                  <span className="text-slate-500"> — Outstanding average of {strongSubject.average}%</span>
                </div>
              )}
              {weakSubject && (
                <div className="text-[10px]">
                  <span className="font-bold text-amber-600 uppercase text-[8px] block tracking-wide">Area of Improvement</span>
                  <span className="font-semibold text-slate-800">{weakSubject.name}</span>
                  <span className="text-slate-500"> — Targeted practice is recommended (avg: {weakSubject.average}%)</span>
                </div>
              )}
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-md text-[10px] text-slate-600 italic leading-snug">
                "{feedbackComment}"
              </div>
            </div>
          </div>
        </div>

        {/* Small trend chart */}
        <div className="border border-slate-100 p-2.5 rounded-lg mb-3 bg-white">
          <h3 className="font-bold text-slate-800 mb-1.5 uppercase tracking-wider text-[9px] flex items-center gap-1">
            <TrendingUp size={10} className="text-brand"/> Academic score trend over time
          </h3>
          <div className="w-full flex justify-center">
            {chartData.length > 0 ? (
              <LineChart width={700} height={100} data={chartData} margin={{ top: 2, right: 2, left: -32, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{fontSize: 7, fill: '#64748b'}} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{fontSize: 7, fill: '#64748b'}} tickLine={false} axisLine={false} />
                <Legend verticalAlign="top" height={16} iconSize={6} iconType="circle" wrapperStyle={{ fontSize: '7px', fontWeight: 'bold', top: -5 }} />
                {subjects.map((subj, idx) => (
                  <Line 
                    key={subj}
                    type="monotone"
                    dataKey={subj}
                    stroke={subjectColors[idx % subjectColors.length]}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls={true}
                  />
                ))}
              </LineChart>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No trend data available.</p>
            )}
          </div>
        </div>

        {/* Condensed Month's results ledger (Slices to max 4 items for page constraint) */}
        {currentMonthResults.length > 0 && (
          <div className="border border-slate-100 rounded-lg overflow-hidden mb-3">
            <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[9px]">
                Detailed Test ledger: {currentMonthName}
              </h3>
            </div>
            <table className="min-w-full text-[10px] text-left">
              <thead className="bg-slate-100/50 text-[9px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-1 font-bold">Date</th>
                  <th className="px-3 py-1 font-bold">Test Title</th>
                  <th className="px-3 py-1 font-bold">Subject</th>
                  <th className="px-3 py-1 font-bold text-right">Marks</th>
                  <th className="px-3 py-1 font-bold text-right">Score</th>
                  <th className="px-3 py-1 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {currentMonthResults.slice(0, 4).map((r, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-1 whitespace-nowrap">{date(r.test?.testDate)}</td>
                    <td className="px-3 py-1 font-bold text-ink">
                      {r.test?.title} <span className="text-[8px] text-slate-400 font-normal">({r.test?.topic})</span>
                    </td>
                    <td className="px-3 py-1 font-semibold">{r.test?.subject?.name || "-"}</td>
                    <td className="px-3 py-1 text-right font-bold">
                      {r.isAbsent ? "-" : `${r.marksObtained} / ${r.test?.maxMarks}`}
                    </td>
                    <td className="px-3 py-1 text-right font-bold text-brand">
                      {r.isAbsent ? "-" : `${Math.round(r.percentage)}%`}
                    </td>
                    <td className="px-3 py-1">
                      {r.isAbsent ? (
                        <span className="text-[8px] font-bold text-rose-600">Absent</span>
                      ) : (
                        <span className={`text-[8px] font-bold ${r.percentage >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {r.percentage >= 80 ? 'Excellent' : r.percentage >= 50 ? 'Pass' : 'Critical'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Compact Signature Row */}
        <div className="grid grid-cols-2 gap-8 mt-6 pt-3 border-t border-dashed border-slate-200">
          <div className="flex flex-col items-start justify-end">
            <div className="w-32 border-b border-slate-300 h-5" />
            <p className="text-[7px] uppercase font-bold text-slate-400 mt-1">Parent Signature</p>
          </div>
          <div className="flex flex-col items-end justify-end">
            <div className="w-32 border-b border-slate-300 h-5" />
            <p className="text-[7px] uppercase font-bold text-slate-400 mt-1">Class Director Signature</p>
          </div>
        </div>

      </div>
    </div>
  );
};
