import { ArrowLeft, BookOpen, Calendar, Mail, Phone, User, Pencil, ClipboardList, Award, MapPin, IndianRupee } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { API_URL, api } from "../api/http.js";
import { money } from "../utils/format.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { ResourceForm } from "./ResourcePage.jsx";
import { resources } from "../data/resources.js";
import { useAuth } from "../context/AuthContext.jsx";

const Skeleton = ({ className = "" }) => <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />;

const PageSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-24 w-full" />
    <div className="grid gap-4 sm:grid-cols-3">
      {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
    </div>
    <Skeleton className="h-80 w-full" />
  </div>
);

export const TeacherProfile = () => {
  const { id } = useParams();
  const { user: authUser } = useAuth();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [lookups, setLookups] = useState({});

  const getAvatarUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${API_URL.replace("/api", "")}${url}`;
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const res = await api.post(`/teachers/${teacher._id}/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setTeacher(p => ({
        ...p,
        user: { ...p.user, avatarUrl: res.data.avatarUrl }
      }));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to upload avatar");
    }
  };

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/teachers/${id}`);
      setTeacher(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load teacher profile");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const fetchLookups = async () => {
      const config = resources.teachers;
      const sources = [...new Set(config.fields.filter((field) => field.source).map((field) => field.source))];
      try {
        const entries = await Promise.all(sources.map((source) => api.get(source).then(({ data }) => [source, data.items || []]).catch(() => [source, []])));
        setLookups(Object.fromEntries(entries));
      } catch (err) {
        setLookups({});
      }
    };
    fetchLookups();
  }, []);

  // All hooks MUST be above this line — before any early returns
  const teacherConfig = useMemo(() => {
    const conf = { ...resources.teachers };
    if (authUser && authUser.role === "teacher") {
      conf.fields = conf.fields.filter(
        f => !["employeeId", "salary", "batches", "subjects"].includes(f.name)
      );
    }
    return conf;
  }, [authUser]);

  // Early returns AFTER all hooks
  if (error) return <EmptyState title="Error Loading Profile" message={error} />;
  if (loading) return <PageSkeleton />;
  if (!teacher) return <EmptyState title="Teacher Not Found" />;

  const tUser = teacher.user || {};
  const teacherUserId = teacher.user?._id || teacher.user;
  const isOwnProfile = authUser && teacherUserId && (
    String(authUser.id || "") === String(teacherUserId) ||
    String(authUser._id || "") === String(teacherUserId)
  );
  const canEdit = authUser && (authUser.role === "admin" || (authUser.role === "teacher" && isOwnProfile));
  const canUploadAvatar = authUser && (authUser.role === "admin" || isOwnProfile);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center gap-4 print:hidden">
        {authUser && authUser.role === "admin" && (
          <Link to="/teachers" className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
            <ArrowLeft size={18} />
          </Link>
        )}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink">{tUser.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand/10 text-brand">
              Teacher
            </span>
            {canEdit && (
              <button 
                onClick={() => setEditing(true)}
                className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
              >
                <Pencil size={14} />
                Edit
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Emp ID: {teacher.employeeId}</p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Profile Card & Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col md:flex-row">
            <div className="relative flex items-center justify-center bg-slate-50 p-8 border-b md:border-b-0 md:border-r border-slate-100 min-w-48 group">
              {tUser.avatarUrl ? (
                <img src={getAvatarUrl(tUser.avatarUrl)} alt={tUser.name} className="h-24 w-24 rounded-full object-cover shadow-lg" />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-brand to-teal-700 text-3xl font-bold text-white shadow-lg">
                  {tUser.name ? tUser.name.charAt(0).toUpperCase() : "T"}
                </div>
              )}
              {canUploadAvatar && (
                <label className="absolute inset-0 m-auto flex h-24 w-24 cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 text-white text-xs font-semibold">
                  Edit
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              )}
            </div>
            <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Personal Info</h3>
                <div className="flex items-center gap-3 text-sm text-slate-700"><User size={16} className="text-slate-400" />{tUser.name}</div>
                <div className="flex items-center gap-3 text-sm text-slate-700"><Mail size={16} className="text-slate-400" />{tUser.email || "No Email"}</div>
                <div className="flex items-center gap-3 text-sm text-slate-700"><Phone size={16} className="text-slate-400" />{tUser.phone || "No Phone"}</div>
                <div className="flex items-center gap-3 text-sm text-slate-700"><MapPin size={16} className="text-slate-400" />Address: {teacher.address || "N/A"}</div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Professional details</h3>
                <div className="flex items-center gap-3 text-sm text-slate-700"><Award size={16} className="text-slate-400" />Qualification: {teacher.qualification || "N/A"}</div>
                <div className="flex items-center gap-3 text-sm text-slate-700"><Calendar size={16} className="text-slate-400" />Experience: {teacher.experienceYears ? `${teacher.experienceYears} Years` : "N/A"}</div>
                {authUser && authUser.role === "admin" && (
                  <div className="flex items-center gap-3 text-sm text-slate-700 font-semibold"><IndianRupee size={16} className="text-slate-400" />Salary: {teacher.salary ? money(teacher.salary) : "N/A"}</div>
                )}
              </div>
            </div>
          </div>

          {/* Assigned Batches List */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
              <ClipboardList size={16} className="text-brand" />
              Assigned Batches ({teacher.batches?.length || 0})
            </h3>
            {teacher.batches && teacher.batches.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {teacher.batches.map(b => (
                  <div key={b._id} className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2">
                    <h4 className="font-bold text-slate-800 text-sm">{b.name}</h4>
                    {b.schedule && (
                      <p className="text-xs text-slate-500 font-semibold">🕒 Schedule: {b.schedule}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-4">No batches assigned yet.</p>
            )}
          </div>
        </div>

        {/* Assigned Subjects */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
              <BookOpen size={16} className="text-brand" />
              Assigned Subjects ({teacher.subjects?.length || 0})
            </h3>
            {teacher.subjects && teacher.subjects.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {teacher.subjects.map(s => (
                  <span key={s._id} className="inline-flex items-center rounded-md bg-brand/10 px-3 py-1 text-xs font-bold text-brand border border-brand/10">
                    {s.name} ({s.code || "N/A"})
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-4">No subjects assigned.</p>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <ResourceForm
          config={teacherConfig}
          item={teacher}
          lookups={lookups}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            fetchProfile();
          }}
        />
      )}
    </div>
  );
};
