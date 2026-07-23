import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/http.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { date, money } from "../utils/format.js";
import {
  Users,
  GraduationCap,
  BookOpen,
  IndianRupee,
  Bell,
  ClipboardList,
  Plus,
  ChevronRight,
  AlertTriangle,
  Award,
  Calendar,
} from "lucide-react";

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get("/dashboard/admin")
      .then(({ data }) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load admin dashboard");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-[400px] place-items-center text-sm text-slate-500">
        <div className="flex flex-col items-center gap-2">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-300 border-t-brand" />
          <span>Loading Dashboard Metrics...</span>
        </div>
      </div>
    );
  }

  if (error) return <EmptyState title="Dashboard Unavailable" message={error} />;

  const cards = data.cards || {};
  const totalStudents = cards.totalStudents ?? data.totalStudents ?? 0;
  const totalTeachers = cards.totalTeachers ?? data.totalTeachers ?? 0;
  const totalBatches = cards.activeBatches ?? data.totalBatches ?? 0;
  const totalCollected = cards.monthlyFeeCollection ?? data.totalCollected ?? 0;
  const totalPending = cards.pendingFees ?? data.totalPending ?? 0;

  const upcomingDueDates = data.upcomingDueDates || [];
  const topPerformers = data.topPerformers || [];
  const feesDueStudents = data.feesDueStudents || [];
  const upcomingTests = data.upcomingTests || [];
  const recentNotices = data.recentNotices || [];
  const recentTests = data.recentTests || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-ink tracking-tight">Admin Control Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">Institute Performance, Dues Overview, & Student Metrics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/fees"
            className="h-10 px-4 bg-brand text-white font-bold text-xs rounded-xl shadow-xs hover:bg-teal-800 transition-all inline-flex items-center gap-1.5"
          >
            <IndianRupee size={15} /> Collect Fees
          </Link>
          <Link
            to="/students"
            className="h-10 px-4 border border-slate-300 bg-white text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all inline-flex items-center gap-1.5"
          >
            <Plus size={15} /> Add Student
          </Link>
        </div>
      </div>

      {/* Primary Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={totalStudents} icon={GraduationCap} tone="emerald" />
        <StatCard label="Total Faculty" value={totalTeachers} icon={Users} tone="indigo" />
        <StatCard label="Active Batches" value={totalBatches} icon={BookOpen} tone="slate" />
        <StatCard label="Outstanding Dues" value={money(totalPending)} icon={AlertTriangle} tone="rose" />
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-600 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider opacity-90 block">Total Fee Collected</span>
            <span className="text-2xl font-black mt-1 block">{money(totalCollected)}</span>
          </div>
          <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center text-white">
            <IndianRupee size={24} />
          </div>
        </div>

        <div className="bg-rose-600 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider opacity-90 block">Total Dues Pending</span>
            <span className="text-2xl font-black mt-1 block">{money(totalPending)}</span>
          </div>
          <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center text-white">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Grid Row: Upcoming Due Dates & Top Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Fee Due Dates */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-ink text-sm flex items-center gap-2">
              <Calendar size={17} className="text-brand" /> Upcoming Fee Due Dates (Next 7 Days)
            </h3>
            <Link to="/fees" className="text-xs font-bold text-brand hover:underline flex items-center gap-0.5">
              Fee Portal <ChevronRight size={14} />
            </Link>
          </div>
          {upcomingDueDates.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No fee dues scheduled in next 7 days</p>
          ) : (
            <div className="space-y-2.5">
              {upcomingDueDates.slice(0, 5).map((item) => (
                <div key={item._id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{item.studentName}</span>
                      <span className="text-[10px] text-slate-400">({item.studentId})</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">Batch: {item.batch} • Due: {money(item.dueAmount)}</span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.urgency === "red"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : item.urgency === "yellow"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {item.daysUntilDue === 0 ? "Due Today" : `In ${item.daysUntilDue} day${item.daysUntilDue > 1 ? "s" : ""}`}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{date(item.dueDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Top Performers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-ink text-sm flex items-center gap-2">
              <Award size={17} className="text-amber-500" /> Monthly Top Students
            </h3>
            <span className="text-xs text-slate-400 font-medium">Last 30 Days</span>
          </div>
          {topPerformers.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No performance records found</p>
          ) : (
            <div className="space-y-2.5">
              {topPerformers.slice(0, 5).map((item) => (
                <div key={item._id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-7 w-7 rounded-lg font-black text-xs flex items-center justify-center ${
                        item.rank === 1
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : item.rank === 2
                          ? "bg-slate-200 text-slate-800 border border-slate-300"
                          : item.rank === 3
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      #{item.rank}
                    </span>
                    <div>
                      <span className="font-bold text-slate-800 block">{item.studentName}</span>
                      <span className="text-[10px] text-slate-500">Batch: {item.batch}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-brand text-sm block">{item.percentage}%</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      Grade {item.grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid Row: Pending Dues & Upcoming Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Highest Pending Dues */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-ink text-sm flex items-center gap-2">
              <AlertTriangle size={17} className="text-rose-500" /> Top Pending Dues by Student
            </h3>
            <Link to="/fees" className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-0.5">
              Collect Fees <ChevronRight size={14} />
            </Link>
          </div>
          {feesDueStudents.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No pending fee dues recorded</p>
          ) : (
            <div className="space-y-2.5">
              {feesDueStudents.slice(0, 5).map((item) => (
                <div key={item._id} className="p-3 rounded-xl border border-rose-100/60 bg-rose-50/30 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{item.studentName}</span>
                      <span className="text-[10px] text-slate-400">({item.studentId})</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">Batch: {item.batch}</span>
                  </div>
                  <span className="font-extrabold text-rose-600 text-sm bg-white px-2.5 py-1 rounded-lg border border-rose-200 shadow-2xs">
                    {money(item.dueAmount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Scheduled Tests */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-ink text-sm flex items-center gap-2">
              <ClipboardList size={17} className="text-indigo-500" /> Upcoming Scheduled Tests
            </h3>
            <Link to="/tests" className="text-xs font-bold text-brand hover:underline flex items-center gap-0.5">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          {upcomingTests.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No upcoming tests scheduled</p>
          ) : (
            <div className="space-y-2.5">
              {upcomingTests.slice(0, 5).map((test) => (
                <div key={test._id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">{test.title}</span>
                    <span className="text-[10px] text-slate-500">
                      {test.subject?.name || test.subject} • Batch: {test.batch?.name || test.batch}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                    {date(test.testDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid Row: Recent Tests & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Batch Tests */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-ink text-sm flex items-center gap-2">
              <ClipboardList size={17} className="text-brand" /> Recent Batch Tests
            </h3>
            <Link to="/tests" className="text-xs font-bold text-brand hover:underline flex items-center gap-0.5">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          {recentTests.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No recent tests recorded</p>
          ) : (
            <div className="space-y-2.5">
              {recentTests.slice(0, 5).map((test) => (
                <div key={test._id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">{test.title}</span>
                    <span className="text-[10px] text-slate-500">{test.subject?.name || test.subject} • Max Marks: {test.maxMarks}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200">
                    {date(test.testDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notices */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-ink text-sm flex items-center gap-2">
              <Bell size={17} className="text-brand" /> Active Announcements
            </h3>
            <Link to="/notices" className="text-xs font-bold text-brand hover:underline flex items-center gap-0.5">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          {recentNotices.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No active notices</p>
          ) : (
            <div className="space-y-2.5">
              {recentNotices.slice(0, 5).map((notice) => (
                <div key={notice._id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">{notice.title}</span>
                    <span className="text-[10px] text-slate-500 truncate block max-w-xs">{notice.message}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-full">
                    {notice.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
