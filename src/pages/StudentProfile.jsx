import { ArrowLeft, BookOpen, Calendar, Mail, Phone, User, Pencil, MessageCircle, ChevronDown, CreditCard, TrendingUp, MessageSquare } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { API_URL, api } from "../api/http.js";
import { date, money } from "../utils/format.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { StudentFeesTab } from "../components/StudentFeesTab.jsx";
import { StudentTestsTab } from "../components/StudentTestsTab.jsx";
import { StudentProgressTab } from "../components/StudentProgressTab.jsx";
import { StudentRemarksTab } from "../components/StudentRemarksTab.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ResourceForm } from "./ResourcePage.jsx";
import { resources } from "../data/resources.js";
import { WhatsAppPreviewModal } from "../components/WhatsAppPreviewModal.jsx";
import { generateWhatsAppMessage } from "../utils/whatsappHelper.js";

// Components
const Skeleton = ({ className = "" }) => <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />;

const PageSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-24 w-full" />
    <div className="grid gap-4 sm:grid-cols-4">
      {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
    </div>
    <Skeleton className="h-80 w-full" />
  </div>
);

const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col">
    <div className="border-b border-slate-100 px-5 py-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-ink flex items-center gap-2">
        {Icon && <Icon size={16} className="text-brand" />}
        {title}
      </h2>
    </div>
    <div className="flex-1 p-5">{children}</div>
  </div>
);

const TabButton = ({ active, label, icon: Icon, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      active ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
    }`}
  >
    <Icon size={16} />
    {label}
  </button>
);

export const StudentProfile = () => {
  const { id } = useParams();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Profile");

  // Load tab on mount or student change
  useEffect(() => {
    const saved = localStorage.getItem(`student_tab_${id}`);
    if (saved) {
      setActiveTab(saved);
    }
  }, [id]);

  // Save tab on change
  useEffect(() => {
    if (id) {
      localStorage.setItem(`student_tab_${id}`, activeTab);
    }
  }, [activeTab, id]);
  const [editing, setEditing] = useState(false);
  const [lookups, setLookups] = useState({});
  const [templates, setTemplates] = useState([]);
  const [waModal, setWaModal] = useState(null);
  const [showWaMenu, setShowWaMenu] = useState(false);

  const studentConfig = useMemo(() => {
    const conf = { ...resources.students };
    if (authUser.role === "teacher") {
      conf.fields = conf.fields.filter(
        f => f.name !== "monthlyFee"
      );
    }
    return conf;
  }, [authUser.role]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/students/${id}/profile`);
      setProfile(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load student profile");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const fetchLookups = async () => {
      const config = resources.students;
      const sources = [...new Set(config.fields.filter((field) => field.source).map((field) => field.source))];
      try {
        const entries = await Promise.all(sources.map((source) => api.get(source).then(({ data }) => [source, data.items || []]).catch(() => [source, []])));
        setLookups(Object.fromEntries(entries));
      } catch (err) {
        setLookups({});
      }
    };
    const fetchTemplates = async () => {
      try {
        const { data } = await api.get("/whatsapp-templates");
        setTemplates(data.items || []);
      } catch (e) {}
    };
    fetchLookups();
    fetchTemplates();
  }, []);

  if (error) return <EmptyState title="Error Loading Profile" message={error} />;
  if (loading) return <PageSkeleton />;
  if (!profile || !profile.student) return <EmptyState title="Student Not Found" />;

  const { student, monthlyTenures, results } = profile;
  const user = student.user || {};

  const handleSendWa = (template) => {
    setShowWaMenu(false);
    if (!student.guardian?.phone) {
      alert("Guardian phone number is missing for this student.");
      return;
    }
    
    // Attempt to compute some variables, progress report needs attendance/performance which can be manually typed.
    const context = {
      student_name: user.name,
      student_id: student.studentId,
      coaching_name: "Kishan Classes",
      guardian_name: student.guardian?.name || "",
      batch: student.batch?.name || "N/A"
    };

    if (template.name === "Progress Report") {
      const completed = results.filter(r => !r.isAbsent && r.percentage !== undefined);
      let overallAverage = "N/A";
      let feedback = "No test records found.";
      if (completed.length > 0) {
        const sum = completed.reduce((sum, r) => sum + r.percentage, 0);
        const avg = Math.round(sum / completed.length);
        overallAverage = `${avg}`;
        if (avg >= 90) {
          feedback = "Outstanding performance! Demonstrating excellent comprehension and consistency.";
        } else if (avg >= 75) {
          feedback = "Good progress. Conceptual understanding is solid with minor improvement needed in specific topics.";
        } else if (avg >= 50) {
          feedback = "Average performance. Encouraged to practice regularly and revise error-prone areas.";
        } else {
          feedback = "Requires dedicated focus, practice, and revision of fundamental concepts.";
        }
      }

      // Group by subject and calculate average
      const groups = {};
      results.forEach(r => {
        if (r.isAbsent || r.percentage === undefined || !r.test?.subject?.name) return;
        const subName = r.test.subject.name;
        if (!groups[subName]) {
          groups[subName] = { total: 0, count: 0 };
        }
        groups[subName].total += r.percentage;
        groups[subName].count += 1;
      });
      const subjectStrings = Object.entries(groups).map(([subName, g]) => {
        return `- ${subName}: ${Math.round(g.total / g.count)}%`;
      });
      const subjectPerformance = subjectStrings.length > 0 ? subjectStrings.join("\n") : "No subject scores available.";

      context.overall_average = overallAverage;
      context.subject_performance = subjectPerformance;
      context.feedback_comments = feedback;
    }

    setWaModal({
      isOpen: true,
      template,
      context,
      recipientPhone: student.guardian.phone,
      recipientName: student.guardian.name,
      title: `Send ${template.name}`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center gap-4 print:hidden">
        <Link to="/students" className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink">{user.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
              Monthly
            </span>
            {authUser.role === "admin" && (
              <button 
                onClick={() => setEditing(true)}
                className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
              >
                <Pencil size={14} />
                Edit
              </button>
            )}
            <div className="relative">
              <button 
                onClick={() => setShowWaMenu(!showWaMenu)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-[#25D366] border border-[#25D366] rounded-md hover:bg-[#1da851] transition-colors"
              >
                <MessageCircle size={14} />
                WhatsApp
                <ChevronDown size={14} />
              </button>
              {showWaMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowWaMenu(false)} />
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-50 py-1">
                    {templates.filter(t => t.category === "Student" || t.category === "Progress" || t.category === "Notices").map(t => (
                      <button
                        key={t._id}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand"
                        onClick={() => handleSendWa(t)}
                      >
                        {t.name}
                      </button>
                    ))}
                    {templates.length === 0 && (
                      <div className="px-4 py-2 text-sm text-slate-400">No templates</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700 border border-slate-200">
              {student.studentId}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 bg-white px-2 rounded-t-xl overflow-x-auto flex kc-scrollbar print:hidden">
        <TabButton active={activeTab === "Profile"} label="Profile" icon={User} onClick={() => setActiveTab("Profile")} />
        {authUser.role !== "teacher" && (
          <TabButton active={activeTab === "Monthly Fees"} label="Monthly Fees" icon={CreditCard} onClick={() => setActiveTab("Monthly Fees")} />
        )}
        <TabButton active={activeTab === "Progress"} label="Progress Report" icon={TrendingUp} onClick={() => setActiveTab("Progress")} />
        <TabButton active={activeTab === "Tests"} label="Tests" icon={BookOpen} onClick={() => setActiveTab("Tests")} />
        <TabButton active={activeTab === "Remarks"} label="Remarks" icon={MessageSquare} onClick={() => setActiveTab("Remarks")} />
      </div>

      {/* Tab Content Rendering */}
      <div className="min-h-[500px]">
        {activeTab === "Profile" && <ProfileTab profile={profile} onAvatarChange={(url) => setProfile(p => ({...p, student: {...p.student, user: {...p.student.user, avatarUrl: url}}}))} />}
        {activeTab === "Monthly Fees" && authUser.role !== "teacher" && <StudentFeesTab profile={profile} onPaymentSuccess={() => window.location.reload()} />}
        {activeTab === "Progress" && <StudentProgressTab student={student} results={results} />}
        {activeTab === "Tests" && <StudentTestsTab student={student} />}
        {activeTab === "Remarks" && <StudentRemarksTab student={student} userRole={authUser.role} currentUserId={authUser._id || authUser.id} />}
      </div>

      {editing && (
        <ResourceForm
          config={studentConfig}
          item={student}
          lookups={lookups}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            fetchProfile();
          }}
        />
      )}
      
      {waModal && (
        <WhatsAppPreviewModal
          isOpen={waModal.isOpen}
          onClose={() => setWaModal(null)}
          title={waModal.title}
          generatedMessage={generateWhatsAppMessage(waModal.template, waModal.context)}
          recipientPhone={waModal.recipientPhone}
          recipientName={waModal.recipientName}
        />
      )}
    </div>
  );
};

/* ─── Profile Tab ─────────────────────────────────────── */
const ProfileTab = ({ profile, onAvatarChange }) => {
  const { user: authUser } = useAuth();
  const { student } = profile;
  const user = student.user || {};

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await api.post(`/students/${student._id}/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (onAvatarChange) onAvatarChange(res.data.avatarUrl);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to upload avatar");
    }
  };

  const getAvatarUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL.replace('/api', '')}${url}`;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col md:flex-row">
      <div className="relative flex items-center justify-center bg-slate-50 p-8 border-b md:border-b-0 md:border-r border-slate-100 min-w-48 group">
        {user.avatarUrl ? (
          <img src={getAvatarUrl(user.avatarUrl)} alt={user.name} className="h-24 w-24 rounded-full object-cover shadow-lg" />
        ) : (
          <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-brand to-teal-700 text-3xl font-bold text-white shadow-lg">
            {user.name ? user.name.charAt(0).toUpperCase() : "S"}
          </div>
        )}
        <label className="absolute inset-0 m-auto flex h-24 w-24 cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 text-white text-xs font-semibold">
          Edit
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </label>
      </div>
      <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Personal Info</h3>
          <div className="flex items-center gap-3 text-sm text-slate-700"><User size={16} className="text-slate-400" />{user.name}</div>
          <div className="flex items-center gap-3 text-sm text-slate-700"><Mail size={16} className="text-slate-400" />{user.email || "No Email"}</div>
          <div className="flex items-center gap-3 text-sm text-slate-700"><Phone size={16} className="text-slate-400" />{user.phone || "No Phone"}</div>
          <div className="flex items-center gap-3 text-sm text-slate-700"><Calendar size={16} className="text-slate-400" />DOB: {student.dateOfBirth ? date(student.dateOfBirth) : "N/A"}</div>
          
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-6">Guardian Info</h3>
          <div className="flex items-center gap-3 text-sm text-slate-700"><User size={16} className="text-slate-400" />{student.guardian?.name || "N/A"}</div>
          <div className="flex items-center gap-3 text-sm text-slate-700"><Phone size={16} className="text-slate-400" />{student.guardian?.phone || "N/A"}</div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Enrollment Info</h3>
          <div className="flex items-center gap-3 text-sm text-slate-700"><Calendar size={16} className="text-slate-400" />Admission Date: {student.admissionDate ? date(student.admissionDate) : "N/A"}</div>
          {student.batch ? (
            <div className="mb-4 rounded-md bg-indigo-50 p-3 border border-indigo-100">
              <h4 className="text-sm font-bold text-indigo-800 flex items-center gap-2 mb-2"><BookOpen size={16} /> Batch: {student.batch?.name}</h4>
              {authUser.role !== "teacher" && (
                <p className="text-sm text-indigo-700 font-medium">Fee Plan: {money(student.monthlyFee)}/month</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No active enrollments.</p>
          )}

          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-6">Subjects</h3>
          {student.subjects && student.subjects.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {student.subjects.map(s => (
                <span key={s._id} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  {s.name}
                </span>
              ))}
            </div>
          ) : (
             <p className="text-sm text-slate-500 mt-2">No subjects assigned.</p>
          )}
        </div>
      </div>
    </div>
  );
};




