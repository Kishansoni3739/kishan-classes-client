import React, { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell.jsx";
import { RequireAuth } from "./components/RequireAuth.jsx";
import { resources } from "./data/resources.js";

// Lazy-loaded page components for bundle splitting
const Dashboard = React.lazy(() => import("./pages/Dashboard.jsx").then(m => ({ default: m.Dashboard })));
const Login = React.lazy(() => import("./pages/Login.jsx").then(m => ({ default: m.Login })));
const ResourcePage = React.lazy(() => import("./pages/ResourcePage.jsx").then(m => ({ default: m.ResourcePage })));
const StudentProfile = React.lazy(() => import("./pages/StudentProfile.jsx").then(m => ({ default: m.StudentProfile })));
const TestsPage = React.lazy(() => import("./pages/TestsPage.jsx"));
const WhatsAppTemplates = React.lazy(() => import("./pages/WhatsAppTemplates.jsx").then(m => ({ default: m.WhatsAppTemplates })));
const NotificationsPanel = React.lazy(() => import("./pages/NotificationsPanel.jsx").then(m => ({ default: m.NotificationsPanel })));
const TeacherProfile = React.lazy(() => import("./pages/TeacherProfile.jsx").then(m => ({ default: m.TeacherProfile })));
const Credentials = React.lazy(() => import("./pages/Credentials.jsx").then(m => ({ default: m.Credentials })));
const StudyMaterialsPage = React.lazy(() => import("./pages/StudyMaterialsPage.jsx").then(m => ({ default: m.StudyMaterialsPage })));
const NotFound = React.lazy(() => import("./pages/NotFound.jsx").then(m => ({ default: m.NotFound })));

// Premium loading spinner fallback
const LoadingFallback = () => (
  <div className="grid min-h-screen place-items-center bg-paper text-sm text-slate-500">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-brand"></div>
      <p className="font-medium">Loading Kishan Classes...</p>
    </div>
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="students/:id" element={<RequireAuth roles={["admin", "teacher"]}><StudentProfile /></RequireAuth>} />
          <Route path="teachers/:id" element={<RequireAuth roles={["admin", "teacher", "student"]}><TeacherProfile /></RequireAuth>} />
          <Route path="tests" element={<TestsPage />} />
          <Route path="fees" element={<ResourcePage resourceKey="fees" />} />
          <Route path="study-materials" element={<StudyMaterialsPage />} />
          <Route path="notifications" element={<RequireAuth roles={["admin", "teacher"]}><NotificationsPanel /></RequireAuth>} />
          <Route path="settings/whatsapp-templates" element={<RequireAuth roles={["admin"]}><WhatsAppTemplates /></RequireAuth>} />
          <Route path="settings/credentials" element={<RequireAuth roles={["admin", "teacher"]}><Credentials /></RequireAuth>} />
          {Object.keys(resources).filter(k => k !== "fees" && k !== "tests" && k !== "study-materials").map((resourceKey) => (
            <Route key={resourceKey} path={resourceKey} element={<ResourcePage resourceKey={resourceKey} />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

