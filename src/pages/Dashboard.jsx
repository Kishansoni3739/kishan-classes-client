import { useEffect, useState } from "react";
import { api } from "../api/http.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { AdminDashboard } from "./AdminDashboard.jsx";
import { date, money } from "../utils/format.js";
import { Eye, Calendar, Award, Bell, GraduationCap, AlertTriangle, BookOpen, Plus, ClipboardList } from "lucide-react";
import { Modal } from "../components/Modal.jsx";
import { Link } from "react-router-dom";

export const Dashboard = () => {
  const { user } = useAuth();

  // Admin gets the full redesigned dashboard
  if (user.role === "admin") return <AdminDashboard />;

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [viewingTeacher, setViewingTeacher] = useState(null);
  const [viewingNotice, setViewingNotice] = useState(null);

  useEffect(() => {
    api
      .get(`/dashboard/${user.role}`)
      .then(({ data }) => setData(data))
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load dashboard");
      });
  }, [user.role]);

  if (error) return <EmptyState title="Dashboard unavailable" message={error} />;
  if (!data) return <div className="text-sm text-slate-500">Loading dashboard...</div>;

  if (user.role === "student") {
    return (
      <>
        <section className="space-y-6">
          <Header title={`${user.name}`} subtitle="Profile, fees, recent results, materials, and notices." />
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Student ID" value={data.student?.studentId || "-"} />
            <StatCard label="Batch" value={data.student?.batch?.name || "-"} tone="slate" />
            <StatCard label="Fee Status" value={data.fee?.status || "No fee"} tone="amber" />
            <StatCard label="Pending" value={money(data.fee?.pendingAmount || 0)} tone="rose" />
          </div>
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <DashboardList
                title="Recently Given Batch Tests"
                items={data.recentTests}
                render={(item) => (
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <span className="font-bold text-slate-800 text-sm block">{item.title}</span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.subject} • Topic: {item.topic}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-500 block">📅 {date(item.testDate)}</span>
                      {item.result ? (
                        item.result.isAbsent ? (
                          <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 mt-0.5 inline-block">Absent</span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 mt-0.5 inline-block">
                            Score: {item.result.marksObtained} / {item.maxMarks} ({item.result.percentage?.toFixed(1)}%)
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 mt-0.5 inline-block">Not Graded Yet</span>
                      )}
                    </div>
                  </div>
                )}
              />
              <DashboardList title="Recent Results" items={data.recentResults} render={(item) => `${item.test?.title || "Test"} (${item.test?.testDate ? date(item.test.testDate) : "-"}) - ${Number.isInteger(item.percentage) ? item.percentage : Number(item.percentage).toFixed(2)}% (${item.grade})`} />
              <DashboardList
                title="Recent Study Materials"
                items={data.materials}
                render={(item) => (
                  <Link to={`/study-materials?openId=${item._id}`} className="flex justify-between items-center w-full group">
                    <div>
                      <span className="font-bold text-slate-800 text-sm block group-hover:text-brand transition-colors">{item.title}</span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.subject?.name || item.subject || "General"}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">📅 {date(item.createdAt)}</span>
                  </Link>
                )}
              />
              <DashboardList
                title="Notices"
                items={data.notices}
                render={(item) => {
                  const badgeStyle =
                    item.priority === "high" ? "bg-rose-50 text-rose-700 border-rose-100" :
                      item.priority === "normal" ? "bg-blue-50 text-blue-700 border-blue-100" :
                        "bg-slate-50 text-slate-600 border-slate-200";
                  return (
                    <div className="flex justify-between items-center w-full cursor-pointer hover:bg-slate-50/50 p-1 rounded transition-colors" onClick={() => setViewingNotice(item)}>
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">{item.title}</span>
                        <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block truncate max-w-xs">{item.message}</span>
                      </div>
                      <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 uppercase tracking-wider shrink-0 ml-3 ${badgeStyle}`}>
                        {item.priority}
                      </span>
                    </div>
                  );
                }}
              />
              <DashboardList
                title="Remarks from Teachers"
                items={data.remarks}
                render={(item) => (
                  <div className="space-y-2 w-full">
                    <div className="flex justify-between items-center w-full">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md ${item.category === "behavioral" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
                        }`}>
                        {item.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        📅 {date(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed italic">"{item.text}"</p>
                    <div className="text-[10px] text-slate-400 text-right">
                      — <span className="font-semibold text-slate-600">{item.teacherName || "Teacher"}</span>
                    </div>
                  </div>
                )}
              />
            </div>

            {/* My Batch Teachers Section */}
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">My Batch Teachers</h3>
                {data.batch?.teachers && data.batch.teachers.length > 0 ? (
                  <div className="space-y-3">
                    {data.batch.teachers.map((t) => {
                      const tUser = t.user || {};
                      const tName = tUser.name || "Teacher";
                      const initial = tName.charAt(0).toUpperCase();

                      return (
                        <div key={t._id} className="flex gap-3 items-center p-3 rounded-lg border border-slate-50 bg-slate-50/30 hover:shadow-sm transition-all relative group">
                          <div className="h-10 w-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-sm shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs text-slate-800 truncate">{tName}</h4>
                            {t.qualification && (
                              <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{t.qualification}</p>
                            )}
                            {t.subjects && t.subjects.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {t.subjects.map(s => (
                                  <span key={s._id} className="text-[9px] font-bold text-brand bg-brand/5 px-1 rounded">
                                    {s.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="text-[9px] text-slate-500 pt-1 space-y-0.5">
                              {tUser.email && <div className="truncate">📧 {tUser.email}</div>}
                              {tUser.phone && <div>📞 {tUser.phone}</div>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewingTeacher(t)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-brand/10 rounded text-brand"
                            title="See Details"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-4">No teachers assigned to your batch yet.</p>
                )}
              </div>
            </div>
          </div>

          {viewingTeacher && (
            <Modal title={`Teacher Profile: ${viewingTeacher.user?.name || "Teacher"}`} onClose={() => setViewingTeacher(null)}>
              <div className="space-y-5">
                <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand to-teal-700 text-2xl font-bold text-white shadow-md">
                    {viewingTeacher.user?.name ? viewingTeacher.user.name.charAt(0).toUpperCase() : "T"}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">{viewingTeacher.user?.name}</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Emp ID: {viewingTeacher.employeeId || "-"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Personal Details</h4>
                    {viewingTeacher.user?.email && <p className="text-sm text-slate-700">📧 <strong>Email:</strong> {viewingTeacher.user.email}</p>}
                    {viewingTeacher.user?.phone && <p className="text-sm text-slate-700">📞 <strong>Phone:</strong> {viewingTeacher.user.phone}</p>}
                    {viewingTeacher.address && <p className="text-sm text-slate-700">📍 <strong>Address:</strong> {viewingTeacher.address}</p>}
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Professional Specs</h4>
                    <p className="text-sm text-slate-700">🎓 <strong>Qualification:</strong> {viewingTeacher.qualification || "N/A"}</p>
                    <p className="text-sm text-slate-700">⏳ <strong>Experience:</strong> {viewingTeacher.experienceYears ? `${viewingTeacher.experienceYears} Years` : "N/A"}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1 mb-2">Assigned Subjects</h4>
                  {viewingTeacher.subjects && viewingTeacher.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {viewingTeacher.subjects.map(s => (
                        <span key={s._id} className="px-2 py-0.5 text-xs font-bold text-brand bg-brand/5 border border-brand/10 rounded">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No assigned subjects.</p>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <button type="button" onClick={() => setViewingTeacher(null)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50">Close</button>
                </div>
              </div>
            </Modal>
          )}
        </section>
        {viewingNotice && (
          <Modal title={viewingNotice.title} onClose={() => setViewingNotice(null)}>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className={`text-xs font-bold border rounded px-2.5 py-0.5 uppercase tracking-wider ${viewingNotice.priority === "high" ? "bg-rose-50 text-rose-700 border-rose-100" :
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
      </>
    );
  }

  if (user.role === "teacher") {
    return (
      <>
        <section className="space-y-6">
          <Header title="Teacher Dashboard" subtitle={`Academic portal for ${user.name}`} />

          {/* Quick Stats */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <StatCard label="Assigned Batches" value={data.cards.assignedBatches} />
            <StatCard label="Students in Batches" value={data.cards.studentCount} tone="amber" />
            <StatCard label="Upcoming Tests" value={data.cards.upcomingTests} tone="slate" />
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link to="/tests" className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-brand/5 hover:border-brand/30 hover:shadow-sm transition-all group">
                <div className="h-10 w-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">
                  <Plus size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-slate-800 truncate">Schedule Test</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Plan upcoming test</p>
                </div>
              </Link>

              <Link to="/tests" className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-brand/5 hover:border-brand/30 hover:shadow-sm transition-all group">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Award size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-slate-800 truncate">Enter Marks</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Grade completed tests</p>
                </div>
              </Link>

              <Link to="/students" className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-brand/5 hover:border-brand/30 hover:shadow-sm transition-all group">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <GraduationCap size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-slate-800 truncate">My Students</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">View profiles & remarks</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Dashboard Content Grid */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <div className="space-y-6">
              <DashboardList
                title="Upcoming Scheduled Tests"
                items={data.upcomingTests}
                render={(item) => (
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <span className="font-bold text-slate-800 text-sm block">{item.title}</span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.subject?.name} • Topic: {item.topic}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">📅 {date(item.testDate)}</span>
                  </div>
                )}
              />

              <DashboardList
                title="Recently Completed Tests"
                items={data.recentlyCompletedTests}
                render={(item) => (
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <span className="font-bold text-slate-800 text-sm block">{item.title}</span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.subject?.name} • Topic: {item.topic}</span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5">Graded</span>
                  </div>
                )}
              />

              <DashboardList
                title="Notices"
                items={data.recentNotices}
                render={(item) => {
                  const badgeStyle =
                    item.priority === "high" ? "bg-rose-50 text-rose-700 border-rose-100" :
                      item.priority === "normal" ? "bg-blue-50 text-blue-700 border-blue-100" :
                        "bg-slate-50 text-slate-600 border-slate-200";
                  return (
                    <div className="flex justify-between items-center w-full cursor-pointer hover:bg-slate-50/50 p-1 rounded transition-colors" onClick={() => setViewingNotice(item)}>
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">{item.title}</span>
                        <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block truncate max-w-xs">{item.message}</span>
                      </div>
                      <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 uppercase tracking-wider shrink-0 ml-3 ${badgeStyle}`}>
                        {item.priority}
                      </span>
                    </div>
                  );
                }}
              />

              <DashboardList
                title="Recent Study Materials"
                items={data.materials}
                render={(item) => (
                  <Link to={`/study-materials?openId=${item._id}`} className="flex justify-between items-center w-full group">
                    <div>
                      <span className="font-bold text-slate-800 text-sm block group-hover:text-brand transition-colors">{item.title}</span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.subject?.name || item.subject || "General"}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">📅 {date(item.createdAt)}</span>
                  </Link>
                )}
              />
            </div>

            <div>
              {/* Low Scores Alerts */}
              <section className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm h-full">
                <div className="border-b border-slate-200 px-4 py-3 font-semibold text-rose-700 bg-rose-50/30 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>Low Performance Alerts (&lt; 50%)</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {data.lowScores && data.lowScores.length > 0 ? (
                    data.lowScores.map((item) => (
                      <div key={item._id} className="px-4 py-3 text-sm flex justify-between items-center hover:bg-slate-50 transition-colors">
                        <div>
                          <span className="font-bold text-slate-800 text-sm block">{item.student?.user?.name}</span>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Test: {item.test?.title} • Subject: {item.test?.subject?.name || "-"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-rose-600 block">{item.marksObtained} / {item.test?.maxMarks}</span>
                          <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 mt-0.5 inline-block">{item.percentage?.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-slate-500 text-center">No recent low performance alerts. All students score above 50%!</div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </section>
        {viewingNotice && (
          <Modal title={viewingNotice.title} onClose={() => setViewingNotice(null)}>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className={`text-xs font-bold border rounded px-2.5 py-0.5 uppercase tracking-wider ${viewingNotice.priority === "high" ? "bg-rose-50 text-rose-700 border-rose-100" :
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
      </>
    );
  }

  return null;
};

const Header = ({ title, subtitle }) => (
  <div>
    <h1 className="text-2xl font-bold text-ink">{title}</h1>
    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
  </div>
);

const DashboardList = ({ title, items = [], render }) => (
  <section className="rounded-md border border-slate-200 bg-white">
    <div className="border-b border-slate-200 px-4 py-3 font-semibold">{title}</div>
    <div className="divide-y divide-slate-100">
      {items.length ? (
        items.map((item) => (
          <div key={item._id} className="px-4 py-3 text-sm text-slate-700">
            {render(item)}
          </div>
        ))
      ) : (
        <div className="px-4 py-6 text-sm text-slate-500">Nothing scheduled yet.</div>
      )}
    </div>
  </section>
);
