import { BookOpenCheck, Lock, User as UserIcon, Shield, GraduationCap, School, Smartphone, Download } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Capacitor } from "@capacitor/core";

export const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState("admin"); // 'admin' | 'teacher' | 'student'
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const getPlaceholder = () => {
    switch (activeRole) {
      case "teacher":
        return "Enter Teacher ID (e.g. EMP-001)";
      case "student":
        return "Enter Student ID (e.g. KC-2026-00001)";
      default:
        return "Enter Admin Username (e.g. kishan_admin)";
    }
  };

  const getLabel = () => {
    switch (activeRole) {
      case "teacher":
        return "Teacher ID / Username";
      case "student":
        return "Student ID / Phone";
      default:
        return "Admin Username / Email";
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    console.log(`[LOGIN PAGE] Submitting login request | Role Hint: ${activeRole} | Identifier: "${username.trim()}"`);

    try {
      await login(username, password, activeRole);
      navigate("/");
    } catch (err) {
      console.error("[LOGIN PAGE] Login Error Details:", err);
      
      if (!err.response) {
        setError("Unable to connect to server. Please check your network connection or server status.");
      } else {
        const status = err.response.status;
        const msg = err.response.data?.message;
        const roleTitle = activeRole.charAt(0).toUpperCase() + activeRole.slice(1);

        if (status === 401 || status === 404) {
          setError(msg || `Invalid ${roleTitle} credentials.`);
        } else if (status === 403) {
          setError(msg || "Account is inactive. Please contact administration.");
        } else if (status === 429) {
          setError(msg || "Too many login attempts. Please wait 15 minutes before trying again.");
        } else {
          setError(msg || `Login failed (${status}). Please try again.`);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand text-white shadow-md shadow-brand/20">
            <BookOpenCheck size={28} />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-ink">
            Kishan Classes
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Coaching Management System
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-200/70 p-1.5 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => { setActiveRole("admin"); setError(""); }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
              activeRole === "admin"
                ? "bg-white text-brand shadow-sm"
                : "hover:text-slate-900"
            }`}
          >
            <Shield size={14} />
            Admin
          </button>
          <button
            type="button"
            onClick={() => { setActiveRole("teacher"); setError(""); }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
              activeRole === "teacher"
                ? "bg-white text-brand shadow-sm"
                : "hover:text-slate-900"
            }`}
          >
            <School size={14} />
            Teacher
          </button>
          <button
            type="button"
            onClick={() => { setActiveRole("student"); setError(""); }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
              activeRole === "student"
                ? "bg-white text-brand shadow-sm"
                : "hover:text-slate-900"
            }`}
          >
            <GraduationCap size={14} />
            Student
          </button>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100">
          <form onSubmit={submit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 leading-relaxed">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <UserIcon size={16} className="text-slate-400" />
                {getLabel()}
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={getPlaceholder()}
                className="block h-11 w-full rounded-lg border border-slate-200 px-3 text-sm placeholder-slate-400 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Lock size={16} className="text-slate-400" />
                {activeRole === "student" ? "Password (Date of Birth)" : "Password"}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={activeRole === "student" ? "Enter DOB (e.g. DDMMYYYY or DD-MM-YYYY)" : "Enter your password"}
                className="block h-11 w-full rounded-lg border border-slate-200 px-3 text-sm placeholder-slate-400 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-60"
            >
              {submitting ? "Signing in..." : `Sign in as ${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}`}
            </button>
          </form>
        </div>

        {!Capacitor.isNativePlatform() && (
          <div className="pt-1 text-center">
            <a
              href={import.meta.env.VITE_ANDROID_APK_URL || "/kishan-classes.apk"}
              download="kishan-classes.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white py-3 px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-brand hover:border-brand/30 hover:shadow active:scale-[0.99]"
            >
              <Smartphone size={18} className="text-brand" />
              <span>Download Android Application</span>
              <Download size={16} className="text-slate-400" />
            </a>
          </div>
        )}
      </div>
    </main>
  );
};
