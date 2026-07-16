import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/http.js";
import { BookOpenCheck, Lock } from "lucide-react";

export function TeacherForcePassword() {
  const { user, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await api.patch("/teacher/change-password", { password });
      setSuccess(true);
      
      // Update local storage user and reload to clear mustChangePassword state
      const savedUser = JSON.parse(localStorage.getItem("kc_user") || "{}");
      savedUser.mustChangePassword = false;
      localStorage.setItem("kc_user", JSON.stringify(savedUser));
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-slate-50 place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-soft space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand text-white">
            <BookOpenCheck size={26} />
          </div>
          <h2 className="text-2xl font-bold text-ink">Update Your Password</h2>
          <p className="text-sm text-slate-500 max-w-[280px]">
            This is your first login. For security, please choose a new secure password.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 font-semibold">
            {error}
          </div>
        )}

        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700 font-bold text-center">
            Password updated! Refreshing dashboard...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-md bg-brand font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition-colors"
            >
              {submitting ? "Updating..." : "Change Password & Continue"}
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors pt-2 block"
            >
              Cancel & Sign Out
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
