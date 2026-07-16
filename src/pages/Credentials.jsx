import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/http.js";
import { KeyRound, User, Lock, CheckCircle } from "lucide-react";

export function Credentials() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [username, setUsername] = useState(user?.username || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password && password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      if (isAdmin) {
        const payload = { username };
        if (password) {
          payload.password = password;
        }
        await api.patch("/admin/change-credentials", payload);
        
        // Update local storage user
        const savedUser = JSON.parse(localStorage.getItem("kc_user") || "{}");
        savedUser.username = username;
        localStorage.setItem("kc_user", JSON.stringify(savedUser));
      } else {
        // Teacher password change
        await api.patch("/teacher/change-password", { password });
      }

      setSuccess("Password updated successfully!");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">
          {isAdmin ? "Change Admin Credentials" : "Change Password"}
        </h1>
        <p className="text-sm text-slate-500">
          {isAdmin 
            ? "Update your username or password. Plain-text passwords are never stored."
            : "Update your account password to secure your login."}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700 font-bold flex items-center gap-1.5">
            <CheckCircle size={14} /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isAdmin && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. kishan_admin"
                  className="h-11 w-full rounded-md border border-slate-300 pl-10 pr-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm font-medium"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isAdmin ? "New Password (Optional)" : "New Password"}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required={!isAdmin}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isAdmin ? "Leave blank to keep current" : "Minimum 6 characters"}
                className="h-11 w-full rounded-md border border-slate-300 pl-10 pr-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Confirm New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required={!isAdmin}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="h-11 w-full rounded-md border border-slate-300 pl-10 pr-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-md bg-brand font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5 mt-2"
          >
            <KeyRound size={16} />
            {submitting ? "Updating..." : isAdmin ? "Update Credentials" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
