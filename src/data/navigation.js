import {
  Bell,
  BookOpen,
  CheckSquare,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  ReceiptIndianRupee,
  School,
  TestTube2,
  UsersRound,
  KeyRound
} from "lucide-react";

export const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["admin", "teacher", "student"] },
  { label: "Students", path: "/students", icon: GraduationCap, roles: ["admin", "teacher"] },
  { label: "Teachers", path: "/teachers", icon: UsersRound, roles: ["admin"] },
  { label: "Subjects", path: "/subjects", icon: BookOpen, roles: ["admin"] },
  { label: "Batches", path: "/batches", icon: ClipboardList, roles: ["admin", "teacher"] },
  { label: "Fees", path: "/fees", icon: ReceiptIndianRupee, roles: ["admin", "student"] },
  { label: "Tests & Results", path: "/tests", icon: TestTube2, roles: ["admin", "teacher", "student"] },
  { label: "Materials", path: "/study-materials", icon: FileText, roles: ["admin", "teacher", "student"] },
  { label: "Notices", path: "/notices", icon: Bell, roles: ["admin", "teacher", "student"] },
  { label: "WA Panel", path: "/notifications", icon: MessageSquare, roles: ["admin", "teacher"] },
  { label: "WA Templates", path: "/settings/whatsapp-templates", icon: MessageSquare, roles: ["admin"] },
  { label: "Credentials", path: "/settings/credentials", icon: KeyRound, roles: ["admin", "teacher"] }
];
