import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  CreditCard,
  GraduationCap,
  IndianRupee,
  Layers,
  Medal,
  TrendingUp,
  Trophy,
  Users,
  CheckSquare,
  XCircle,
  Clock,
  Bell
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/http.js";
import { useAuth } from "../context/AuthContext.jsx";
import { date, money } from "../utils/format.js";
import { Modal } from "../components/Modal.jsx";

/* ─── Skeleton Loader ────────────────────────────────── */
const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />
);

const CardSkeleton = () => (
  <div className="rounded-xl border border-slate-100 bg-white p-4 md:p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-12 w-12 rounded-xl" />
    </div>
  </div>
);

const TableSkeleton = ({ rows = 3, cols = 4 }) => (
  <div className="divide-y divide-slate-100">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 px-4 md:px-5 py-4">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

/* ─── Empty State ────────────────────────────────────── */
const EmptyRow = ({ message, icon: Icon = AlertCircle }) => (
  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
    <Icon size={36} strokeWidth={1.5} className="mb-2 opacity-50" />
    <span className="text-sm">{message}</span>
  </div>
);

/* ─── Stat Card ──────────────────────────────────────── */
const statCardConfig = [
  { key: "totalStudents", label: "Total Students", shortLabel: "Students", icon: GraduationCap, gradient: "from-teal-500 to-emerald-600", bgLight: "bg-teal-50", textColor: "text-teal-700" },
  { key: "totalTeachers", label: "Total Teachers", shortLabel: "Teachers", icon: Users, gradient: "from-blue-500 to-indigo-600", bgLight: "bg-blue-50", textColor: "text-blue-700" },
  { key: "monthlyFeeCollection", label: "Fee Collection", shortLabel: "Collection", icon: IndianRupee, isMoney: true, gradient: "from-amber-500 to-orange-600", bgLight: "bg-amber-50", textColor: "text-amber-700" },
  { key: "pendingFees", label: "Pending Fees", shortLabel: "Pending", icon: CreditCard, isMoney: true, gradient: "from-rose-500 to-pink-600", bgLight: "bg-rose-50", textColor: "text-rose-700" },
  { key: "activeBatches", label: "Active Batches", shortLabel: "Batches", icon: Layers, gradient: "from-violet-500 to-purple-600", bgLight: "bg-violet-50", textColor: "text-violet-700" }
];

const StatCard = ({ config, value, loading }) => {
  const Icon = config.icon;
  if (loading) return <CardSkeleton />;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-4 md:p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span className="hidden md:inline">{config.label}</span>
            <span className="md:hidden">{config.shortLabel || config.label}</span>
          </p>
          <p className="mt-1.5 text-2xl font-bold text-ink">
            {config.isMoney ? money(value) : (value ?? 0).toLocaleString("en-IN")}
          </p>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${config.gradient} text-white shadow-lg shadow-current/20 transition-transform duration-300 group-hover:scale-110`}>
          <Icon size={22} />
        </div>
      </div>
      {/* Decorative accent bar */}
      <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${config.gradient} opacity-80`} />
    </div>
  );
};

/* ─── Section Card Wrapper ───────────────────────────── */
const SectionCard = ({ title, icon: Icon, children, action }) => (
  <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-100 px-4 md:px-5 py-3 md:py-4">
      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand">
          <Icon size={16} />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink">{title}</h2>
      </div>
      {action}
    </div>
    {children}
  </div>
);

/* ─── Upcoming Tests ─────────────────────────────────── */
const UpcomingTests = ({ tests, loading }) => (
  <SectionCard title="Upcoming Tests" icon={Calendar}>
    {loading ? (
      <TableSkeleton rows={4} cols={4} />
    ) : tests.length === 0 ? (
      <EmptyRow message="No upcoming tests scheduled" icon={Calendar} />
    ) : (
      <div className="overflow-x-auto kc-scrollbar">
        <table className="min-w-full text-xs md:text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3 font-semibold"><span className="hidden md:inline">Test Name</span><span className="md:hidden">Name</span></th>
              <th className="px-5 py-3 font-semibold">Subject</th>
              <th className="px-5 py-3 font-semibold">Batch</th>
              <th className="px-5 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {tests.map((test) => (
              <tr key={test._id} className="transition-colors hover:bg-slate-50/50">
                <td className="px-5 py-3.5 font-medium text-ink">{test.title}</td>
                <td className="px-5 py-3.5 text-slate-600">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    <BookOpen size={12} />
                    {test.subject?.name || "-"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{test.batch?.name || (test.students?.length ? "Specific Students" : "-")}</td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <Calendar size={13} className="text-slate-400" />
                    {date(test.testDate)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </SectionCard>
);

const TestStats = ({ data, loading }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 flex items-center gap-4">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-100 text-emerald-600"><CheckSquare size={24} /></div>
      <div><p className="text-sm font-semibold text-emerald-800">Completed Tests</p><p className="text-2xl font-bold text-emerald-900">{loading ? '-' : data?.cards?.completedTests || 0}</p></div>
    </div>
    <div className="rounded-xl border border-brand/20 bg-brand/5 p-4 flex items-center gap-4">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand"><Clock size={24} /></div>
      <div><p className="text-sm font-semibold text-brand">Today's Tests</p><p className="text-2xl font-bold text-ink">{loading ? '-' : data?.cards?.todayTests || 0}</p></div>
    </div>
    <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 flex items-center gap-4">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-rose-100 text-rose-600"><XCircle size={24} /></div>
      <div><p className="text-sm font-semibold text-rose-800">Cancelled Tests</p><p className="text-2xl font-bold text-rose-900">{loading ? '-' : data?.cards?.cancelledTests || 0}</p></div>
    </div>
  </div>
);

/* ─── Students with Fee Dues ─────────────────────────── */
const FeeDueStudents = ({ students, loading }) => (
  <SectionCard title="Students with Fee Dues" icon={CreditCard}>
    {loading ? (
      <TableSkeleton rows={4} cols={4} />
    ) : students.length === 0 ? (
      <EmptyRow message="No pending fee dues" icon={CreditCard} />
    ) : (
      <div className="overflow-x-auto kc-scrollbar">
        <table className="min-w-full text-xs md:text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3 font-semibold"><span className="hidden md:inline">Student ID</span><span className="md:hidden">ID</span></th>
              <th className="px-5 py-3 font-semibold"><span className="hidden md:inline">Student Name</span><span className="md:hidden">Name</span></th>
              <th className="px-5 py-3 font-semibold">Batch</th>
              <th className="px-5 py-3 font-semibold text-right"><span className="hidden md:inline">Due Amount</span><span className="md:hidden">Due</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {students.map((s) => (
              <tr key={s._id} className="transition-colors hover:bg-slate-50/50">
                <td className="px-5 py-3.5">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-600">{s.studentId}</span>
                </td>
                <td className="px-5 py-3.5 font-medium text-ink">{s.studentName}</td>
                <td className="px-5 py-3.5 text-slate-600">{s.batch}</td>
                <td className="px-5 py-3.5 text-right">
                  <span className={`font-bold ${s.dueAmount >= 20000 ? "text-rose-600" : s.dueAmount >= 10000 ? "text-amber-600" : "text-slate-700"}`}>
                    {money(s.dueAmount)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </SectionCard>
);

/* ─── Upcoming Fee Due Dates ─────────────────────────── */
const urgencyStyles = {
  green: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "On Track" },
  yellow: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Due Soon" },
  red: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", label: "Overdue" }
};

const UpcomingDueDates = ({ fees, loading }) => (
  <SectionCard title="Upcoming Fee Due Dates" icon={AlertCircle}>
    {loading ? (
      <TableSkeleton rows={4} cols={4} />
    ) : fees.length === 0 ? (
      <EmptyRow message="No upcoming due dates" icon={AlertCircle} />
    ) : (
      <div className="overflow-x-auto kc-scrollbar">
        <table className="min-w-full text-xs md:text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3 font-semibold"><span className="hidden md:inline">Student Name</span><span className="md:hidden">Name</span></th>
              <th className="px-5 py-3 font-semibold">Batch</th>
              <th className="px-5 py-3 font-semibold">Due Date</th>
              <th className="px-5 py-3 font-semibold text-right"><span className="hidden md:inline">Amount Due</span><span className="md:hidden">Due</span></th>
              <th className="px-5 py-3 font-semibold text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {fees.map((fee) => {
              const style = urgencyStyles[fee.urgency] || urgencyStyles.green;
              return (
                <tr key={fee._id} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 font-medium text-ink">{fee.studentName}</td>
                  <td className="px-5 py-3.5 text-slate-600">{fee.batch}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <Calendar size={13} className="text-slate-400" />
                      {date(fee.dueDate)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-slate-700">{money(fee.dueAmount)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {fee.daysUntilDue <= 0
                        ? `${Math.abs(fee.daysUntilDue)}d overdue`
                        : fee.daysUntilDue <= 7
                        ? `${fee.daysUntilDue}d left`
                        : style.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </SectionCard>
);

/* ─── Top Performers ─────────────────────────────────── */
const rankIcons = {
  1: { icon: Trophy, color: "from-yellow-400 to-amber-500", ring: "ring-amber-200" },
  2: { icon: Medal, color: "from-slate-300 to-slate-400", ring: "ring-slate-200" },
  3: { icon: Award, color: "from-amber-600 to-amber-700", ring: "ring-amber-200" }
};

const TopPerformers = ({ performers, loading }) => (
  <SectionCard title="Top 5 Performers of the Month" icon={TrendingUp}>
    {loading ? (
      <TableSkeleton rows={5} cols={4} />
    ) : performers.length === 0 ? (
      <EmptyRow message="No results available yet" icon={TrendingUp} />
    ) : (
      <div className="overflow-x-auto kc-scrollbar">
        <table className="min-w-full text-xs md:text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-400">
              <th className="w-16 px-5 py-3 text-center font-semibold">Rank</th>
              <th className="px-5 py-3 font-semibold"><span className="hidden md:inline">Student Name</span><span className="md:hidden">Name</span></th>
              <th className="px-5 py-3 font-semibold">Batch</th>
              <th className="px-5 py-3 font-semibold text-right"><span className="hidden md:inline">Percentage</span><span className="md:hidden">%</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {performers.map((p) => {
              const badge = rankIcons[p.rank];
              const RankIcon = badge?.icon;
              return (
                <tr key={p._id} className={`transition-colors hover:bg-slate-50/50 ${p.rank <= 3 ? "bg-gradient-to-r from-amber-50/40 to-transparent" : ""}`}>
                  <td className="px-5 py-3.5 text-center">
                    {badge ? (
                      <span className={`inline-grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${badge.color} text-white shadow-sm ring-2 ${badge.ring}`}>
                        <RankIcon size={14} />
                      </span>
                    ) : (
                      <span className="inline-grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                        {p.rank}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`font-medium ${p.rank <= 3 ? "text-ink" : "text-slate-700"}`}>{p.studentName}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{p.batch}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold ${
                      p.percentage >= 90
                        ? "bg-emerald-50 text-emerald-700"
                        : p.percentage >= 75
                        ? "bg-blue-50 text-blue-700"
                        : p.percentage >= 60
                        ? "bg-amber-50 text-amber-700"
                        : "bg-rose-50 text-rose-700"
                    }`}>
                      {Number.isInteger(p.percentage) ? p.percentage : Number(p.percentage).toFixed(2)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </SectionCard>
);

/* ─── Recent Notices ─────────────────────────────────── */
const RecentNotices = ({ notices, loading, onViewNotice }) => (
  <SectionCard title="Recent Notices" icon={Bell}>
    {loading ? (
      <TableSkeleton rows={3} cols={4} />
    ) : notices.length === 0 ? (
      <EmptyRow message="No recent notices" icon={Bell} />
    ) : (
      <div className="overflow-x-auto kc-scrollbar">
        <table className="min-w-full text-xs md:text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3 font-semibold">Title</th>
              <th className="px-5 py-3 font-semibold">Audience</th>
              <th className="px-5 py-3 font-semibold">Message</th>
              <th className="px-5 py-3 font-semibold text-center">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {notices.map((n) => (
              <tr key={n._id} className="transition-colors hover:bg-slate-50/50 cursor-pointer" onClick={() => onViewNotice(n)}>
                <td className="px-5 py-3.5 font-medium text-ink">{n.title}</td>
                <td className="px-5 py-3.5 text-slate-600 truncate max-w-[120px] uppercase font-semibold text-[10px]">{n.audience}</td>
                <td className="px-5 py-3.5 text-slate-500 truncate max-w-xs">{n.message}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                    n.priority === "high"
                      ? "bg-rose-50 text-rose-700"
                      : n.priority === "normal"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-slate-50 text-slate-700"
                  }`}>
                    {n.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </SectionCard>
);

/* ─── Error State ────────────────────────────────────── */
const ErrorBanner = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/50 px-6 py-12 text-center">
    <AlertCircle className="mb-3 text-rose-400" size={40} strokeWidth={1.5} />
    <p className="text-sm font-semibold text-rose-700">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors">
        Try Again
      </button>
    )}
  </div>
);

/* ─── Admin Dashboard ────────────────────────────────── */
export const AdminDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewingNotice, setViewingNotice] = useState(null);

  const fetchDashboard = () => {
    setLoading(true);
    setError("");
    api
      .get("/dashboard/admin")
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.message || "Could not load dashboard"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (error) return <ErrorBanner message={error} onRetry={fetchDashboard} />;

  const cards = data?.cards || {};

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Operational overview for Kishan Classes.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCardConfig.map((config) => (
          <StatCard key={config.key} config={config} value={cards[config.key]} loading={loading} />
        ))}
      </div>

      {/* Test Stats */}
      <TestStats data={data} loading={loading} />

      {/* Upcoming Tests – full width */}
      <UpcomingTests tests={data?.upcomingTests || []} loading={loading} />

      {/* Fee Dues */}
      <FeeDueStudents students={data?.feesDueStudents || []} loading={loading} />

      {/* Upcoming Due Dates */}
      <UpcomingDueDates fees={data?.upcomingDueDates || []} loading={loading} />

      {/* Top Performers */}
      <TopPerformers performers={data?.topPerformers || []} loading={loading} />

      {/* Recent Notices */}
      <RecentNotices notices={data?.recentNotices || []} loading={loading} onViewNotice={setViewingNotice} />

      {viewingNotice && (
        <Modal title={viewingNotice.title} onClose={() => setViewingNotice(null)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className={`text-xs font-bold border rounded px-2.5 py-0.5 uppercase tracking-wider ${
                viewingNotice.priority === "high" ? "bg-rose-50 text-rose-700 border-rose-100" :
                viewingNotice.priority === "normal" ? "bg-blue-50 text-blue-700 border-blue-100" :
                "bg-slate-50 text-slate-600 border-slate-200"
              }`}>
                {viewingNotice.priority} Priority
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                Date: {new Date(viewingNotice.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {viewingNotice.message}
            </div>
            {viewingNotice.createdBy?.name && (
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-400 text-right">
                Posted by: <span className="font-semibold text-slate-600">{viewingNotice.createdBy.name} ({viewingNotice.createdBy.role})</span>
              </div>
            )}
            <div className="flex justify-end pt-3">
              <button type="button" onClick={() => setViewingNotice(null)} className="h-10 rounded-md border border-slate-200 px-5 text-sm font-medium hover:bg-slate-50 transition-colors">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
};
