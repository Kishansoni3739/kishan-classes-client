import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell.jsx";
import { RequireAuth } from "./components/RequireAuth.jsx";
import { resources } from "./data/resources.js";
import { Dashboard } from "./pages/Dashboard.jsx";
import { Login } from "./pages/Login.jsx";
import { ResourcePage } from "./pages/ResourcePage.jsx";
import { StudentProfile } from "./pages/StudentProfile.jsx";
import TestsPage from "./pages/TestsPage.jsx";
import { WhatsAppTemplates } from "./pages/WhatsAppTemplates.jsx";
import { NotificationsPanel } from "./pages/NotificationsPanel.jsx";
import { TeacherProfile } from "./pages/TeacherProfile.jsx";
import { Credentials } from "./pages/Credentials.jsx";
import { StudyMaterialsPage } from "./pages/StudyMaterialsPage.jsx";

export default function App() {
  return (
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
