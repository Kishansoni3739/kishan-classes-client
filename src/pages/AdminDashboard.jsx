import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/http.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { date, money } from "../utils/format.js";
import { Users, GraduationCap, BookOpen, IndianRupee, Bell, ClipboardList, Plus, ChevronRight, AlertTriangle } from "lucide-react";

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
  const recentNotices = data.recentNotices || [];
  const recentTests = data.recentTests || data.upcomingTests || [];

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

      {/* Financial Summary Card */}
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

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tests */}
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
