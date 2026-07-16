import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { TeacherForcePassword } from "../pages/TeacherForcePassword.jsx";

export const RequireAuth = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading Kishan Classes...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (user.mustChangePassword) {
    return <TeacherForcePassword />;
  }

  if (roles && !roles.map(r => r.toLowerCase()).includes(user.role?.toLowerCase())) return <Navigate to="/" replace />;

  return children;
};
