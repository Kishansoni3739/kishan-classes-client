import { BookOpenCheck, Lock, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid username or password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand text-white shadow-md shadow-brand/20">
            <BookOpenCheck size={28} />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-ink">
            Kishan Classes
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Sign in to access
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100">
          <form onSubmit={submit} className="space-y-6">
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <UserIcon size={16} className="text-slate-400" />
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                className="block h-11 w-full rounded-lg border border-slate-200 px-3 text-sm placeholder-slate-400 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Lock size={16} className="text-slate-400" />
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="block h-11 w-full rounded-lg border border-slate-200 px-3 text-sm placeholder-slate-400 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-60"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};
