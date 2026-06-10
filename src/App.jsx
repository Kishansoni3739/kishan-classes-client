import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  Home,
  IndianRupee,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  Users,
  WalletCards,
  MessageSquare,
  X,
  Lock,
  User as UserIcon,
  RefreshCw,
  LogOut,
  PieChart as PieChartIcon,
  UserMinus,
  Archive,
  MessageCircle,
  Send,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getAllVisibleFeeRecords, getCompletedFeeTenures, formatFeeTenure, getFeeTenureDates, isOverdueFeeRecord } from "./utils/feeVisibility.js";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { isNative } from "./utils/platform";
import { StudentProgressPDF } from "./reports/StudentProgressPDF";
import { generatePDF } from "./utils/generatePDF";
import { uid, monthKeyFromDate, createCycleBoundary, buildFeeRecord, getGrade, getPerformanceTag, isActiveStudent } from "./utils/shared";
import { seedData, defaultSubjects } from "./utils/seedData";
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const deepBlue = "#1e3a8a";
const rawApiUrl = import.meta.env.VITE_API_URL || "https://kishan-classes-backend.onrender.com";
const API_BASE_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
const STATE_API_URL = `${API_BASE_URL}/api/state`;
const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "students", label: "Students", icon: Users },
  { id: "batches", label: "Batches", icon: GraduationCap },
  { id: "fees", label: "Fees", icon: CreditCard },
  { id: "learning", label: "Learning", icon: BookOpen },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

const studentNavItems = [
  { id: "my-portal", label: "My Portal", icon: UserIcon },
];

const nowIso = () => new Date().toISOString();
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    value || 0,
  );
const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
    : "-";
const formatShortDate = (value) =>
  value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(value)) : "-";
const subjectColors = ["#1e3a8a", "#2563eb", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981"];





function createFeeRecordsForStudent(student) {
  const records = [];
  const admissionDate = new Date(student.admissionDate);
  const start = new Date(admissionDate.getFullYear(), admissionDate.getMonth() + 1, 1);
  let end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

  if (["Dropped", "Completed", "Transferred", "Archived"].includes(student.status) && student.withdrawalDate) {
    const wDate = new Date(student.withdrawalDate);
    const wEnd = new Date(wDate.getFullYear(), wDate.getMonth() + 1, 1);
    if (wEnd < end) {
      end = wEnd;
    }
  }

  const cursor = new Date(start);

  while (cursor <= end) {
    records.push(buildFeeRecord(student, cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return records;
}

function getFirstPayableMonthKey(student) {
  if (!student?.admissionDate) return "";
  const admissionDate = new Date(student.admissionDate);
  const firstPayableDate = new Date(admissionDate.getFullYear(), admissionDate.getMonth() + 1, 1);
  return monthKeyFromDate(firstPayableDate);
}


function getOverdueFeeRows(appState, now = new Date()) {
  return appState.feeRecords
    .filter((record) => isOverdueFeeRecord(record, now))
    .map((record) => {
      const student = appState.students.find((item) => item.id === record.studentId);
      const batch = appState.batches.find((item) => item.id === student?.batchId);
      return {
        ...record,
        student,
        batch,
        balance: Math.max(0, Number(record.amountDue || 0) - Number(record.amountPaid || 0)),
        tenureLabel: student ? formatFeeTenure(getFeeTenureDates(record, student).startDate, getFeeTenureDates(record, student).endDate) : record.monthKey,
      };
    })
    .filter((item) => item.student)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

function buildOverdueFeesPdfDoc(appState, overdueRows, titleSuffix = "Overdue Fees Report") {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const generatedAt = formatDate(new Date().toISOString());
  const totalDue = overdueRows.reduce((sum, row) => sum + row.balance, 0);

  doc.setFontSize(18);
  doc.text(appState.settings.coachingName || "Coaching Center", 40, 42);
  doc.setFontSize(11);
  doc.text(titleSuffix, 40, 62);
  doc.text(`Generated: ${generatedAt}`, 40, 78);
  doc.text(`Total overdue amount: ${formatCurrency(totalDue)}`, 40, 94);
  doc.text("Includes only fee cycles whose due date has already passed.", 40, 110);

  autoTable(doc, {
    startY: 130,
    head: [["Student", "Class", "Batch", "Tenure", "Due Date", "Balance", "Status"]],
    body: overdueRows.map((row) => [
      row.student.fullName,
      row.student.classGrade,
      row.batch?.name || "Unassigned",
      row.tenureLabel,
      formatDate(row.dueDate),
      formatCurrency(row.balance),
      row.status,
    ]),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [30, 58, 138] },
    theme: "striped",
  });

  return doc;
}

// Cross-platform PDF save: uses Capacitor Filesystem + Share on Android,
// falls back to jsPDF's built-in doc.save() on desktop browsers.
async function savePdfDocument(doc, filename) {
  if (isNative()) {
    try {
      const base64Data = doc.output("datauristring").split(",")[1];
      const written = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });
      await Share.share({
        title: filename,
        url: written.uri,
        dialogTitle: "Save or share PDF",
      });
      return true;
    } catch (err) {
      if (err?.message?.includes("cancel")) return false;
      console.error("Native PDF save failed:", err);
      // Last-resort fallback
      doc.save(filename);
      return true;
    }
  }
  doc.save(filename);
  return true;
}

async function generateFeesDuePdf(appState) {
  const overdueRows = getOverdueFeeRows(appState);
  const doc = buildOverdueFeesPdfDoc(appState, overdueRows);
  await savePdfDocument(doc, "overdue-fees-report.pdf");
}

function generateStudentFeesDuePdf(student, appState) {
  const overdueRows = getOverdueFeeRows(appState).filter((row) => row.studentId === student.id);
  const doc = buildOverdueFeesPdfDoc(appState, overdueRows, `${student.fullName} - Overdue Fees Report`);
  const filename = `${student.fullName.replace(/\s+/g, "-").toLowerCase()}-fees-due-report.pdf`;
  return { doc, filename, overdueRows };
}

function buildStudentProgressSummary(student, appState, reportMonth = null) {
  let tests = appState.tests
    .filter((test) => test.studentId === student.id)
    .sort((a, b) => new Date(a.testDate) - new Date(b.testDate));

  if (reportMonth) {
    tests = tests.filter((test) => test.testDate.startsWith(reportMonth));
  }

  const testedSubjects = [...new Set(tests.map((test) => test.subject))];
  const subjectStats = testedSubjects.map((subject) => {
    const subjectTests = tests.filter((test) => test.subject === subject);
    const firstPercent = Math.round((subjectTests[0].marksObtained / subjectTests[0].maxMarks) * 100);
    const latestPercent = Math.round((subjectTests.at(-1).marksObtained / subjectTests.at(-1).maxMarks) * 100);
    const averagePercent = Math.round(
      calculateAverageScore(subjectTests),
    );
    return {
      subject,
      tests: subjectTests.length,
      averagePercent,
      firstPercent,
      latestPercent,
      growth: latestPercent - firstPercent,
    };
  });

  const overallAverage = tests.length
    ? Math.round(calculateAverageScore(tests))
    : 0;
  const latestTest = tests.at(-1) || null;
  const strongest = [...subjectStats].sort((a, b) => b.averagePercent - a.averagePercent)[0] || null;
  const weakest = [...subjectStats].sort((a, b) => a.averagePercent - b.averagePercent)[0] || null;

  return { tests, subjectStats, overallAverage, latestTest, strongest, weakest };
}

function generateStudentProgressPdf(student, appState) {
  const summary = buildStudentProgressSummary(student, appState);
  const batch = appState.batches.find((item) => item.id === student.batchId);
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  doc.setFontSize(18);
  doc.text(appState.settings.coachingName || "Coaching Center", 40, 42);
  doc.setFontSize(11);
  doc.text("Student Progress Report", 40, 62);
  doc.text(`Student: ${student.fullName} (${student.studentId})`, 40, 80);
  doc.text(`Class: ${student.classGrade}    Batch: ${batch?.name || "Unassigned"}`, 40, 96);
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 40, 112);

  autoTable(doc, {
    startY: 132,
    head: [["Overall Progress", "Value"]],
    body: [
      ["Overall average", `${summary.overallAverage}%`],
      ["Tests recorded", String(summary.tests.length)],
      ["Subjects tested", String(summary.subjectStats.length)],
      [
        "Latest test",
        summary.latestTest
          ? `${summary.latestTest.testName} (${summary.latestTest.subject}) - ${summary.latestTest.marksObtained}/${summary.latestTest.maxMarks}`
          : "No tests yet",
      ],
      ["Strongest subject", summary.strongest ? `${summary.strongest.subject} (${summary.strongest.averagePercent}%)` : "N/A"],
      ["Weakest subject", summary.weakest ? `${summary.weakest.subject} (${summary.weakest.averagePercent}%)` : "N/A"],
    ],
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [30, 58, 138] },
    theme: "grid",
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 18,
    head: [["Subject-wise Growth", "Tests", "Average", "First", "Latest", "Growth"]],
    body: summary.subjectStats.length
      ? summary.subjectStats.map((item) => [
        item.subject,
        String(item.tests),
        `${item.averagePercent}%`,
        `${item.firstPercent}%`,
        `${item.latestPercent}%`,
        `${item.growth >= 0 ? "+" : ""}${item.growth}%`,
      ])
      : [["No tested subjects found", "", "", "", "", ""]],
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [37, 99, 235] },
    theme: "striped",
  });

  const filename = `${student.fullName.replace(/\s+/g, "-").toLowerCase()}-progress-report.pdf`;
  return { doc, filename };
}

function canPerformAction() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.role === "testuser") {
      alert("Test User can't do this action.");
      return false;
    }
  } catch (e) { }
  return true;
}

function openWhatsApp(student, message) {
  if (!canPerformAction()) return false;
  const rawNumber = (student.parentWhatsapp || "").replace(/\D/g, "");
  if (!rawNumber) {
    alert(`Parent WhatsApp number is not set for ${student.fullName}. Please edit the student profile and add a WhatsApp number first.`);
    return false;
  }
  const whatsappUrl = `https://wa.me/${rawNumber}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
  return true;
}

function syncStudentFeeRecords(feeRecords, previousStudent, nextStudent) {
  const now = new Date();

  const wDate = nextStudent.withdrawalDate ? new Date(nextStudent.withdrawalDate) : null;
  const wEnd = wDate ? new Date(wDate.getFullYear(), wDate.getMonth() + 1, 1) : null;

  return feeRecords
    .filter((record) => {
      if (record.studentId !== previousStudent.id || record.transactionType === "OPENING_BALANCE") {
        return true;
      }

      if (["Dropped", "Completed", "Transferred", "Archived"].includes(nextStudent.status) && wEnd) {
        const recordDate = new Date(record.dueDate);
        const recordMonthStart = new Date(recordDate.getFullYear(), recordDate.getMonth(), 1);
        if (recordMonthStart > wEnd && record.status !== "Paid" && record.status !== "Partial") {
          return false;
        }
      }
      return true;
    })
    .map((record) => {
      if (record.studentId !== previousStudent.id || record.transactionType === "OPENING_BALANCE") {
        return record;
      }

      const dueDate = new Date(record.dueDate);
      const isCurrentOrFutureMonth =
        dueDate.getFullYear() > now.getFullYear() ||
        (dueDate.getFullYear() === now.getFullYear() && dueDate.getMonth() >= now.getMonth());
      const isEditableStatus = record.status !== "Paid";

      if (!isCurrentOrFutureMonth || !isEditableStatus) {
        return record;
      }

      const amountDue = Number(nextStudent.monthlyFeeAmount || 0);
      const amountPaid = Number(record.amountPaid || 0);
      return {
        ...record,
        amountDue,
        dueDate: createCycleBoundary(dueDate.getFullYear(), dueDate.getMonth(), Number(nextStudent.feeDueDay || 1)).toISOString(),
        status: amountPaid >= amountDue ? "Paid" : amountPaid > 0 ? "Partial" : "Pending",
      };
    });
}



function replacePlaceholders(template, data) {
  if (!template) return "";
  let result = template;
  Object.entries(data).forEach(([key, value]) => {
    const valStr = value !== undefined && value !== null ? String(value) : "";
    // Handle new {{variable}} syntax
    result = result.replaceAll(`{{${key}}}`, valStr);
    // Backward compatibility for [Variable] syntax
    result = result.replaceAll(`[${key}]`, valStr);
    // Capitalized backward compatibility
    const capKey = key.charAt(0).toUpperCase() + key.slice(1);
    result = result.replaceAll(`[${capKey}]`, valStr);
  });
  return result;
}

function generateStudentId(index, year) {
  return `CC-${year}-${String(index).padStart(3, "0")}`;
}

// ─────────────────────────────────────────────────────────
// DRY Helpers
// ─────────────────────────────────────────────────────────

function calculateTestPercentage(test) {
  if (!test || !test.maxMarks) return 0;
  return (Number(test.marksObtained) / Number(test.maxMarks)) * 100;
}

function calculateAverageScore(tests) {
  if (!tests || tests.length === 0) return 0;
  const totalPercent = tests.reduce((sum, test) => sum + calculateTestPercentage(test), 0);
  return totalPercent / tests.length;
}

export function calculateFeeSummary(feeRecords, isOverdueFeeRecord) {
  const previousBalance = feeRecords.filter(r => r.transactionType === "OPENING_BALANCE").reduce((sum, r) => sum + (Number(r.amountDue) || 0), 0);
  const generatedMonthlyDues = feeRecords.filter(r => r.transactionType !== "OPENING_BALANCE").reduce((sum, r) => sum + (Number(r.amountDue) || 0), 0);
  const paymentsReceived = feeRecords.reduce((sum, r) => sum + (Number(r.amountPaid) || 0), 0);
  const currentOutstanding = Math.max(0, previousBalance + generatedMonthlyDues - paymentsReceived);

  return { previousBalance, generatedMonthlyDues, paymentsReceived, currentOutstanding };
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function apiFetch(endpoint, options = {}, retries = 2, backoff = 1000) {
  const headers = { ...options.headers };
  const token = localStorage.getItem("token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!options.body || typeof options.body === "string") {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const timeout = options.timeout || 60000;
  const timeoutController = new AbortController();
  const id = setTimeout(() => timeoutController.abort(), timeout);

  // Link external signal to our internal controller
  const externalSignal = options.signal;
  const abortHandler = () => timeoutController.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(id);
      throw new DOMException("Aborted", "AbortError");
    }
    externalSignal.addEventListener("abort", abortHandler);
  }

  console.log(`[Frontend:API] 🚀 Initiating request to: ${endpoint}`, { method: options.method || 'GET', timeout });
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: timeoutController.signal
    });

    clearTimeout(id);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", abortHandler);
    }

    // Retry on transient server errors (5xx) or rate limits (429)
    if (!response.ok && (response.status >= 500 || response.status === 429) && retries > 0) {
      console.warn(`[Frontend:API] ⚠️ Transient error on ${endpoint} (${response.status}). Retrying...`);
      throw new Error("Transient server error");
    }
    
    console.log(`[Frontend:API] ✅ Success: ${endpoint} (${response.status})`);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", abortHandler);
    }

    // Only retry on network errors or transient errors, NOT on aborts
    if (error?.name !== 'AbortError' && retries > 0) {
      console.warn(`[Frontend:API] ⚠️ Network error on ${endpoint}. Retrying in ${backoff}ms...`, error);
      await wait(backoff);
      return apiFetch(endpoint, options, retries - 1, backoff * 2);
    }

    if (error?.name === 'AbortError') {
      if (externalSignal && externalSignal.aborted) {
        console.log(`[Frontend:API] 🛑 Request to ${endpoint} cancelled by application logic (unmount).`);
        throw new Error("Request cancelled by application.");
      }
      console.error(`[Frontend:API] ❌ Request to ${endpoint} TIMED OUT after ${timeout}ms.`);
      throw new Error("Request timed out. Please check your internet connection or try again.");
    }
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
      console.error(`[Frontend:API] ❌ Network error (offline or unreachable) for ${endpoint}`);
      throw new Error("Network error. You might be offline or the server is unreachable.");
    }
    console.error(`[Frontend:API] ❌ Unhandled error on ${endpoint}:`, error);
    throw error;
  }
}

function App() {
  console.log("[Frontend:App] ⚛️ App Component Rendered", { timestamp: new Date().toISOString() });
  
  const [appState, setAppState] = useState(seedData);
  const [activePage, setActivePage] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user && user.role !== "admin" && user.role !== "testuser") {
        return "my-portal";
      }
    } catch { }
    return "dashboard";
  });
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [parentActiveStudentId, setParentActiveStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentFilterStatus, setStudentFilterStatus] = useState("Active");
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [withdrawStudentModalOpen, setWithdrawStudentModalOpen] = useState(false);
  const [batchFormOpen, setBatchFormOpen] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [scheduleTestModalOpen, setScheduleTestModalOpen] = useState(false);
  const [notificationModal, setNotificationModal] = useState(null);
  const [bulkNotificationType, setBulkNotificationType] = useState(null);
  const [broadcastConfig, setBroadcastConfig] = useState(null);
  const [transientNotification, setTransientNotification] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [studentToPrint, setStudentToPrint] = useState(null);
  const [feeFilters, setFeeFilters] = useState({ batchId: "all", classGrade: "all", monthKey: "all", status: "all" });
  const [learningFilter, setLearningFilter] = useState({ studentId: "", batchId: "all", subject: "all" });
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("token") || null);
  const [authUser, setAuthUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
  });
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const initialDataLoadedRef = useRef(false);
  const prevTestsRef = useRef();

  const isAdmin = authUser?.role === "admin";
  const isTestUser = authUser?.role === "testuser";
  const currentNavItems = isAdmin || isTestUser ? navItems : studentNavItems;

  const saveQueueRef = useRef(Promise.resolve());

  // Enforce access control on route change or login
  useEffect(() => {
    if (authUser && !isAdmin && !isTestUser && activePage !== "my-portal") {
      setActivePage("my-portal");
    }
  }, [authUser, isAdmin, isTestUser, activePage]);

  async function handleLogin(username, password) {
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      setAuthToken(data.token);
      setAuthUser(data.user);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setActivePage(data.user.role === "admin" ? "dashboard" : "my-portal");
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleLogout() {
    setAuthToken(null);
    setAuthUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAppState(seedData());
  }

  async function handleUpdateAdmin(username, password) {
    if (authUser?.role === "testuser") {
      addToast("Test User can't do this action.", "danger");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/update-admin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...fetchHeaders },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update admin");
      addToast("Admin credentials updated. Please log in again.");
      handleLogout();
    } catch (err) {
      addToast(err.message, "danger");
    }
  }

  const fetchHeaders = useMemo(() => {
    return authToken ? { "Authorization": `Bearer ${authToken}` } : {};
  }, [authToken]);

  // Fix #7: Stabilize addToast with useCallback
  const addToast = useCallback((title, tone = "success") => {
    const id = uid();
    setToasts((current) => [...current, { id, title, tone }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const visibleFeeRecords = useMemo(() => getAllVisibleFeeRecords(appState.feeRecords), [appState.feeRecords]);
  const dashboardData = useMemo(() => computeDashboard({ ...appState, feeRecords: visibleFeeRecords }), [appState, visibleFeeRecords]);
  const pendingStudents = useMemo(
    () =>
      appState.students.filter((student) =>
        visibleFeeRecords.some((record) => record.studentId === student.id && record.computedStatus !== "Paid" && record.computedStatus !== "Upcoming"),
      ),
    [appState.students, visibleFeeRecords],
  );

  const selectedStudent = appState.students.find((student) => student.id === selectedStudentId) ?? null;
  const selectedBatch = appState.batches.find((batch) => batch.id === selectedBatchId) ?? null;

  const loadStateFromDatabase = useCallback(async (cancelledObj = { cancelled: false }, signal) => {
    if (!authToken) {
      console.log("[Frontend:State] ⏸️ loadStateFromDatabase skipped: No authToken present.");
      return;
    }
    console.log("[Frontend:State] 🔄 Starting loadStateFromDatabase...");
    setIsRefreshing(true);
    try {
      const response = await apiFetch('/api/state', { headers: fetchHeaders, timeout: 60000, signal });
      let templatesRes = null;
      if (isAdmin) {
        templatesRes = await apiFetch('/api/message-templates', { headers: fetchHeaders, timeout: 60000, signal });
      }

      if (!response.ok) {
        console.error(`[Frontend:State] ❌ Failed to load main state payload. Status: ${response.status}`);
        if (response.status === 401) {
          console.warn("[Frontend:State] 🔒 Unauthorized (401). Triggering logout...");
          handleLogout();
        }
        throw new Error("Failed to load state");
      }

      console.log("[Frontend:State] 📥 Parsing state payload response...");
      const data = await response.json();
      if (isAdmin && templatesRes?.ok) {
        data.messageTemplates = await templatesRes.json();
      } else {
        data.messageTemplates = [];
      }
      if (!cancelledObj.cancelled) {
        if (!initialDataLoadedRef.current) {
          // On first load, seed prevTestsRef from localStorage to survive app restarts
          if (authUser?.role === "student" && authUser?.studentId) {
            const storageKey = `lastSeenTestIds_${authUser.studentId}`;
            const stored = localStorage.getItem(storageKey);
            if (stored) {
              try {
                const seenIds = JSON.parse(stored);
                // Build a fake "previous tests" array with just IDs for comparison
                prevTestsRef.current = seenIds.map((id) => ({ id }));
              } catch {
                prevTestsRef.current = data.tests;
              }
            } else {
              // First time ever — treat all current tests as "seen" (no spam on first login)
              prevTestsRef.current = data.tests;
              localStorage.setItem(storageKey, JSON.stringify(data.tests.map((t) => t.id)));
            }
          } else {
            prevTestsRef.current = data.tests;
          }
          initialDataLoadedRef.current = true;
        }
        console.log(`[Frontend:State] ✅ State successfully updated in UI.`);
        setAppState(data);
        setIsDatabaseReady(true);
      } else {
        console.log("[Frontend:State] 🛑 State update skipped: Component unmounted or polling superseded.");
      }
    } catch (error) {
      console.error("[Frontend:State] 💥 Error caught in loadStateFromDatabase:", error);
      if (!cancelledObj.cancelled) {
        setIsDatabaseReady(false);
        addToast("Server storage unavailable. Using temporary in-memory data.", "danger");
      }
    } finally {
      if (!cancelledObj.cancelled) {
        setIsRefreshing(false);
      }
    }
  }, [authToken, fetchHeaders, addToast, authUser]);

  useEffect(() => {
    let timeoutId;
    const controller = new AbortController();
    const cancelledObj = { cancelled: false };

    if (authToken) {
      const poll = async () => {
        if (cancelledObj.cancelled) return;
        console.log("[Frontend:Polling] ⏰ Triggering polling request...");
        await loadStateFromDatabase(cancelledObj, controller.signal);
        if (!cancelledObj.cancelled) {
          console.log("[Frontend:Polling] ⏱️ Scheduling next poll in 30s...");
          // Recursive setTimeout ensures the next poll ONLY begins after the current one completes
          timeoutId = setTimeout(poll, 30000);
        }
      };

      poll();

      return () => {
        cancelledObj.cancelled = true;
        controller.abort(); // Properly abort any pending fetch requests on unmount
        clearTimeout(timeoutId);
      };
    }
    return () => {
      cancelledObj.cancelled = true;
      controller.abort();
    };
  }, [authToken, loadStateFromDatabase]);

  // Trigger local notification ONLY for the latest new test score (not all new scores)
  useEffect(() => {
    if (!authUser || authUser.role !== "student") return;

    if (prevTestsRef.current && appState.tests) {
      const prevIds = new Set(prevTestsRef.current.map((t) => t.id));
      const newTests = appState.tests.filter((t) => t.studentId === authUser.studentId && !prevIds.has(t.id));

      if (newTests.length > 0) {
        // Sort by testDate descending, pick only the latest one
        const sorted = [...newTests].sort((a, b) => new Date(b.testDate) - new Date(a.testDate));
        const latest = sorted[0];

        const notification = {
          title: `New Test Score: ${latest.subject}`,
          body: `You scored ${latest.marksObtained}/${latest.maxMarks} in ${latest.testName}`,
          id: Math.floor(Math.random() * 1000000),
          schedule: { at: new Date(Date.now() + 1000) },
        };

        LocalNotifications.requestPermissions().then((result) => {
          if (result.display === 'granted') {
            LocalNotifications.schedule({ notifications: [notification] });
          }
        });

        // Persist all current test IDs to localStorage so restarts don't re-notify
        const storageKey = `lastSeenTestIds_${authUser.studentId}`;
        localStorage.setItem(storageKey, JSON.stringify(appState.tests.map((t) => t.id)));
      }
    }
    prevTestsRef.current = appState.tests;
  }, [appState.tests, authUser]);

  // Fix #6: persistState is now a ref-stable callback
  const persistState = useCallback((nextState) => {
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const response = await apiFetch('/api/state', {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...fetchHeaders },
          body: JSON.stringify(nextState),
          timeout: 20000
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorText = errorData.error || await response.text();
          console.error("Server Error:", errorText);
          if (response.status === 401) handleLogout();
          throw new Error(errorText);
        }
        setIsDatabaseReady(true);
      })
      .catch((err) => {
        setIsDatabaseReady(false);
        addToast(err.message || "Could not save to server storage", "danger");
      });
  }, [addToast, fetchHeaders]);

  const latestStateRef = useRef(appState);
  latestStateRef.current = appState;

  // Fix: Synchronous state resolution to prevent data loss on save
  function updateState(recipe) {
    if (authUser?.role === "testuser") {
      addToast("Test User can't do this action.", "danger");
      return;
    }
    const nextState = recipe(JSON.parse(JSON.stringify(latestStateRef.current)));
    setAppState(nextState);
    latestStateRef.current = nextState;
    persistState(nextState);
  }

  function handleStudentSave(formData) {
    const isEditing = !!editingStudent;
    const { openingBalance, ...studentData } = formData;
    let savedStudent = null;
    updateState((draft) => {
      if (isEditing) {
        const index = draft.students.findIndex((item) => item.id === editingStudent.id);
        const updatedStudent = { ...draft.students[index], ...studentData };
        draft.students[index] = updatedStudent;
        draft.feeRecords = syncStudentFeeRecords(draft.feeRecords, editingStudent, updatedStudent);
        savedStudent = updatedStudent;

        const existingOpeningBalance = draft.feeRecords.find(r => r.studentId === updatedStudent.id && r.transactionType === "OPENING_BALANCE");
        if (existingOpeningBalance) {
          existingOpeningBalance.amountDue = Number(openingBalance) || 0;
          existingOpeningBalance.lastUpdatedBy = authUser?.username || "system";
          existingOpeningBalance.status = existingOpeningBalance.amountPaid >= existingOpeningBalance.amountDue ? "Paid" : existingOpeningBalance.amountPaid > 0 ? "Partial" : "Pending";
        } else if (Number(openingBalance) > 0) {
          draft.feeRecords.push({
            id: uid(),
            studentId: updatedStudent.id,
            monthKey: "OPENING",
            amountDue: Number(openingBalance),
            amountPaid: 0,
            dueDate: new Date(updatedStudent.admissionDate).toISOString(),
            paymentDate: "",
            mode: "",
            remarks: "Migrated outstanding dues from manual records",
            status: "Pending",
            transactionType: "OPENING_BALANCE",
            createdBy: authUser?.username || "system"
          });
        }
      } else {
        const currentYear = new Date().getFullYear();
        let maxIndex = 0;
        draft.students.forEach(s => {
          if (s.studentId && s.studentId.startsWith(`CC-${currentYear}-`)) {
            const parts = s.studentId.split('-');
            if (parts.length === 3) {
              const idx = parseInt(parts[2], 10);
              if (!isNaN(idx) && idx > maxIndex) {
                maxIndex = idx;
              }
            }
          }
        });

        const student = {
          id: uid(),
          studentId: generateStudentId(maxIndex + 1, currentYear),
          ...studentData,
        };
        draft.students.push(student);
        draft.feeRecords.push(...createFeeRecordsForStudent(student));
        if (Number(openingBalance) > 0) {
          draft.feeRecords.push({
            id: uid(),
            studentId: student.id,
            monthKey: "OPENING",
            amountDue: Number(openingBalance),
            amountPaid: 0,
            dueDate: new Date(student.admissionDate).toISOString(),
            paymentDate: "",
            mode: "",
            remarks: "Migrated outstanding dues from manual records",
            status: "Pending",
            transactionType: "OPENING_BALANCE",
            createdBy: authUser?.username || "system"
          });
        }
        savedStudent = student;
      }
      return draft;
    });
    setStudentFormOpen(false);
    setEditingStudent(null);
    addToast(isEditing ? "Student updated" : "Student added");

    // Trigger transient (non-persisted) WhatsApp notification to parent
    if (savedStudent && savedStudent.parentWhatsapp) {
      if (!isEditing) {
        setTransientNotification(buildNewEnrollmentPayload(latestStateRef.current, savedStudent));
      }
    }
  }

  function handleBatchSave(formData) {
    updateState((draft) => {
      if (editingBatch) {
        const index = draft.batches.findIndex((item) => item.id === editingBatch.id);
        draft.batches[index] = { ...draft.batches[index], ...formData };
      } else {
        draft.batches.push({ id: uid(), ...formData });
      }
      return draft;
    });
    setBatchFormOpen(false);
    setEditingBatch(null);
    addToast(editingBatch ? "Batch updated" : "Batch created");
  }

  // Fix #11: Delete confirmation dialog
  async function deleteStudent(studentId) {
    if (authUser?.role === "testuser") {
      addToast("Test User can't do this action.", "danger");
      return;
    }
    const student = appState.students.find((s) => s.id === studentId);
    if (!window.confirm(`Are you sure you want to delete "${student?.fullName || 'this student'}"? This will remove all their fee records, test scores, and notifications. This action cannot be undone.`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/students/${studentId}`, { method: 'DELETE', headers: fetchHeaders });
      if (!res.ok) {
        if (res.status === 401) handleLogout();
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Server error");
      }
      setAppState((current) => {
        const draft = structuredClone(current);
        draft.students = draft.students.filter((student) => student.id !== studentId);
        draft.feeRecords = draft.feeRecords.filter((record) => record.studentId !== studentId);
        draft.tests = draft.tests.filter((test) => test.studentId !== studentId);
        draft.notificationLogs = draft.notificationLogs.filter((log) => log.studentId !== studentId);
        return draft;
      });
      if (selectedStudentId === studentId) setSelectedStudentId(null);
      addToast("Student deleted", "danger");
    } catch (err) {
      console.error("Delete error:", err);
      addToast("Failed to delete student", "danger");
    }
  }

  // Fix #11: Delete confirmation dialog
  function deleteBatch(batchId) {
    if (authUser?.role === "testuser") {
      addToast("Test User can't do this action.", "danger");
      return;
    }
    const batch = appState.batches.find((b) => b.id === batchId);
    const enrolledCount = appState.students.filter((s) => s.batchId === batchId).length;
    if (!window.confirm(`Are you sure you want to delete batch "${batch?.name || 'this batch'}"?${enrolledCount > 0 ? ` ${enrolledCount} student(s) will be unassigned.` : ''} This action cannot be undone.`)) return;
    updateState((draft) => {
      draft.batches = draft.batches.filter((batch) => batch.id !== batchId);
      draft.students = draft.students.map((student) =>
        student.batchId === batchId ? { ...student, batchId: "" } : student,
      );
      return draft;
    });
    if (selectedBatchId === batchId) setSelectedBatchId(null);
    addToast("Batch deleted", "danger");
  }

  async function deleteNotificationLog(logId) {
    if (authUser?.role === "testuser") {
      addToast("Test User can't do this action.", "danger");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this notification log? This action cannot be undone.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notification-logs/${logId}`, { method: 'DELETE', headers: fetchHeaders });
      if (!res.ok) {
        if (res.status === 401) handleLogout();
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Server error");
      }
      setAppState((current) => {
        const draft = structuredClone(current);
        draft.notificationLogs = draft.notificationLogs.filter((log) => log.id !== logId);
        return draft;
      });
      addToast("Notification log deleted", "danger");
    } catch (err) {
      console.error("Delete log error:", err);
      addToast("Failed to delete notification log", "danger");
    }
  }

  function savePayment(payment) {
    updateState((draft) => {
      const index = draft.feeRecords.findIndex((record) => record.id === payment.id);
      const nextRecord = {
        ...payment,
        status:
          Number(payment.amountPaid) >= Number(payment.amountDue)
            ? "Paid"
            : Number(payment.amountPaid) > 0
              ? "Partial"
              : "Pending",
      };

      if (index >= 0) {
        draft.feeRecords[index] = {
          ...draft.feeRecords[index],
          ...nextRecord,
        };
      } else {
        draft.feeRecords.push(nextRecord);
      }
      return draft;
    });
    setPaymentModal(null);
    addToast("Payment updated");

    // Trigger transient (non-persisted) WhatsApp notification to parent
    const student = latestStateRef.current.students.find((s) => s.id === payment.studentId);
    if (student && student.parentWhatsapp) {
      const finalStatus = Number(payment.amountPaid) >= Number(payment.amountDue)
        ? "Paid" : Number(payment.amountPaid) > 0 ? "Partial" : "Pending";
      setTransientNotification(buildFeePaymentUpdatePayload(latestStateRef.current, student, payment, finalStatus));
    }
  }

  function saveTestScore(score) {
    let computedGrade = "";
    updateState((draft) => {
      const isAbsent = score.remarks === "Absent on Test Day";
      const percent = (Number(score.marksObtained) / Number(score.maxMarks || 1)) * 100;
      computedGrade = isAbsent ? "-" : getGrade(percent, draft.settings.gradeBoundaries);

      const newScoreData = {
        ...score,
        batchId: draft.students.find((student) => student.id === score.studentId)?.batchId || "",
        grade: computedGrade,
        performanceTag: isAbsent ? "Absent" : getPerformanceTag(percent),
      };

      if (score.id && !score.scheduledTestId) {
        // Edit existing score
        const index = draft.tests.findIndex(t => t.id === score.id);
        if (index >= 0) {
          draft.tests[index] = newScoreData;
        }
      } else {
        draft.tests.unshift({ id: uid(), ...newScoreData });
        if (score.scheduledTestId) {
          draft.scheduledTests = draft.scheduledTests.filter(t => t.id !== score.scheduledTestId);
        }
      }
      return draft;
    });
    setScoreModalOpen(false);
    addToast("Test score saved");

    // Only send notification if it's a new score
    if (!score.id || score.scheduledTestId) {
      const student = latestStateRef.current.students.find((s) => s.id === score.studentId);
      if (student && student.parentWhatsapp) {
        setTransientNotification(buildTestScorePayload(latestStateRef.current, student, score, computedGrade));
      }
    }
  }

  function deleteTestScore(testId) {
    if (authUser?.role === "testuser") {
      addToast("Test User can't do this action.", "danger");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this test score?")) return;
    updateState((draft) => {
      draft.tests = draft.tests.filter((test) => test.id !== testId);
      return draft;
    });
    addToast("Test score deleted");
  }

  function handleDeleteScheduledTestGroup(groupInfo) {
    updateState((draft) => {
      draft.scheduledTests = draft.scheduledTests.filter(
        (t) =>
          !(
            t.batchId === groupInfo.batchId &&
            t.subject === groupInfo.subject &&
            t.testName === groupInfo.testName &&
            t.testDate === groupInfo.testDate
          )
      );
      return draft;
    });
    addToast("Scheduled test deleted");
  }

  function handleScheduleTestSave(testData, studentIds) {
    let newTests = [];
    updateState((draft) => {
      studentIds.forEach(studentId => {
        const student = draft.students.find((s) => s.id === studentId);
        if (student) {
          const t = {
            id: uid(),
            studentId,
            batchId: student.batchId || "",
            subject: testData.subject,
            testName: testData.testName,
            testDate: testData.testDate,
            maxMarks: testData.maxMarks
          };
          draft.scheduledTests.push(t);
          newTests.push(t);
        }
      });
      return draft;
    });
    setScheduleTestModalOpen(false);
    addToast("Test(s) scheduled successfully");
    if (newTests.length > 0) {
      setNotificationCandidates(newTests);
      setBulkNotificationType("scheduled_tests");
    }
  }

  function saveSettings(nextSettings) {
    updateState((draft) => ({ ...draft, settings: nextSettings }));
    addToast("Settings saved");
  }

  function logNotification(studentId, type, message) {
    updateState((draft) => {
      draft.notificationLogs.unshift({
        id: uid(),
        studentId,
        date: nowIso(),
        type,
        message: message.slice(0, 120),
        status: "Sent",
      });
      return draft;
    });
  }

  async function exportFeesReport() {
    const rows = filteredFeeGrid.rows
      .map(
        (row) => `<tr><td>${row.student.fullName}</td>${row.cells
          .map((cell) => `<td>${cell.status} (${cell.amountPaid}/${cell.amountDue})</td>`)
          .join("")}</tr>`,
      )
      .join("");

    const html = `<!doctype html><html><head><title>Fees Report</title><style>body{font-family:Arial;padding:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#eff6ff}</style></head><body><h2>Fees Report</h2><table><thead><tr><th>Student</th>${months.map((m) => `<th>${m}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
    if (isNative()) {
      try {
        const written = await Filesystem.writeFile({
          path: "fees-report.html",
          data: btoa(unescape(encodeURIComponent(html))),
          directory: Directory.Cache,
        });
        await Share.share({ title: "Fees Report", url: written.uri, dialogTitle: "Save or share report" });
      } catch (err) {
        if (!err?.message?.includes("cancel")) console.error("Share failed:", err);
      }
    } else {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
    addToast("Fees report generated");
  }

  async function exportOverdueFeesPdf() {
    await generateFeesDuePdf(appState);
    addToast("Overdue fees PDF downloaded");
  }

  async function exportStudentProgressPdf(student, type = "monthly") {
    try {
      let reportMonth = null;
      if (type === "monthly") {
        const studentTests = appState.tests
          .filter((t) => t.studentId === student.id)
          .sort((a, b) => new Date(b.testDate) - new Date(a.testDate));
        if (studentTests.length > 0) {
          reportMonth = studentTests[0].testDate.substring(0, 7);
        } else {
          reportMonth = new Date().toISOString().substring(0, 7);
        }
      }

      setStudentToPrint({ student, type, reportMonth });
      addToast(`Generating ${type} PDF...`, "info");
      const filename = `${student.fullName.replace(/\s+/g, "-").toLowerCase()}-${type}-progress-report.pdf`;

      setTimeout(async () => {
        try {
          const doc = await generatePDF(`pdf-report-template-${student.id}`);
          await savePdfDocument(doc, filename);
          setStudentToPrint(null);
          addToast("Student progress PDF downloaded", "success");
        } catch (err) {
          console.error("PDF Generation Error:", err);
          setStudentToPrint(null);
          addToast("Failed to generate PDF. Check console for details.", "danger");
        }
      }, 1500); // 1.5s delay allows React to render and Recharts to animate
    } catch (e) {
      console.error(e);
      addToast("Failed to generate PDF", "danger");
      setStudentToPrint(null);
    }
  }

  function sendStudentFeesPdfToParent(student) {
    const overdueRows = getOverdueFeeRows(appState).filter((row) => row.studentId === student.id);
    if (!overdueRows.length) {
      addToast("No overdue fees found for this student", "danger");
      return;
    }

    const batch = appState.batches.find((b) => b.id === student.batchId);
    const totalDue = overdueRows.reduce((sum, row) => sum + row.balance, 0);
    const lines = [
      `📋 *OVERDUE FEES REPORT*`,
      `🏫 ${appState.settings.coachingName}`,
      `━━━━━━━━━━━━━━━━━━`,
      `👤 *Student:* ${student.fullName}`,
      `🆔 *ID:* ${student.studentId}`,
      `📚 *Class:* ${student.classGrade}`,
      `🎓 *Batch:* ${batch?.name || "Unassigned"}`,
      `📅 *Date:* ${formatDate(new Date().toISOString())}`,
      ``,
      `💰 *Total Overdue: ${formatCurrency(totalDue)}*`,
      ``,
      `📌 *Details:*`,
    ];

    overdueRows.forEach((row, i) => {
      lines.push(`${i + 1}. ${row.tenureLabel}`);
      lines.push(`   Due: ${formatDate(row.dueDate)} | Balance: ${formatCurrency(row.balance)} | ${row.status}`);
    });

    lines.push(``, `Please clear the pending dues at the earliest. Thank you! 🙏`);

    const sent = openWhatsApp(student, lines.join("\n"));
    if (sent) addToast("Fees report sent on WhatsApp");
  }

  function sendStudentProgressPdfToParent(student) {
    const summary = buildStudentProgressSummary(student, appState);
    const batch = appState.batches.find((b) => b.id === student.batchId);
    const lines = [
      `📊 *STUDENT PROGRESS REPORT*`,
      `🏫 ${appState.settings.coachingName}`,
      `━━━━━━━━━━━━━━━━━━`,
      `👤 *Student:* ${student.fullName}`,
      `🆔 *ID:* ${student.studentId}`,
      `📚 *Class:* ${student.classGrade}`,
      `🎓 *Batch:* ${batch?.name || "Unassigned"}`,
      `📅 *Date:* ${formatDate(new Date().toISOString())}`,
      ``,
      `📈 *Overall Summary:*`,
      `• Overall Average: *${summary.overallAverage}%*`,
      `• Total Tests: ${summary.tests.length}`,
      `• Subjects Tested: ${summary.subjectStats.length}`,
    ];

    if (summary.latestTest) {
      lines.push(`• Latest Test: ${summary.latestTest.testName} (${summary.latestTest.subject}) — ${summary.latestTest.marksObtained}/${summary.latestTest.maxMarks}`);
    }
    if (summary.strongest) {
      lines.push(`• 💪 Strongest: ${summary.strongest.subject} (${summary.strongest.averagePercent}%)`);
    }
    if (summary.weakest) {
      lines.push(`• 📝 Needs Work: ${summary.weakest.subject} (${summary.weakest.averagePercent}%)`);
    }

    if (summary.subjectStats.length) {
      lines.push(``, `📚 *Subject-wise Performance:*`);
      summary.subjectStats.forEach((s) => {
        const arrow = s.growth >= 0 ? "📈" : "📉";
        lines.push(`• ${s.subject}: Avg ${s.averagePercent}% | Growth: ${s.growth >= 0 ? "+" : ""}${s.growth}% ${arrow}`);
      });
    }

    lines.push(``, `Keep encouraging your child! 🌟 Thank you! 🙏`);

    const sent = openWhatsApp(student, lines.join("\n"));
    if (sent) addToast("Progress report sent on WhatsApp");
  }

  const filteredStudents = useMemo(() => {
    const term = studentSearch.toLowerCase();
    return appState.students.filter(
      (student) => {
        const matchesSearch = student.fullName.toLowerCase().includes(term) ||
          student.studentId.toLowerCase().includes(term) ||
          student.classGrade.toLowerCase().includes(term);
        const st = student.status || "Active";
        const matchesStatus = studentFilterStatus === "All" || st === studentFilterStatus;
        return matchesSearch && matchesStatus;
      }
    );
  }, [appState.students, studentSearch, studentFilterStatus]);

  const filteredFeeGrid = useMemo(() => buildFeeGrid(appState, feeFilters), [appState, feeFilters]);
  const learningView = useMemo(() => buildLearningView(appState, learningFilter), [appState, learningFilter]);
  const notificationCandidates = useMemo(() => buildNotificationCandidates(appState), [appState]);

  if (!authUser) {
    return <LoginPage onLogin={handleLogin} error={loginError} isLoading={isLoggingIn} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 hidden min-h-screen flex-col border-r border-slate-200 bg-[#1e3a8a] px-3 py-5 text-white shadow-2xl md:flex ${sidebarCollapsed ? "w-22" : "w-72"
            } transition-all duration-300`}
        >
          <div className="mb-8 flex items-center justify-between gap-3 px-2">
            {!sidebarCollapsed && (
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Management</p>
                <h1 className="text-xl font-semibold">{appState.settings.coachingName}</h1>
              </div>
            )}
            <button
              className="rounded-full border border-blue-300/40 bg-white/10 p-2 transition hover:bg-white/20"
              onClick={() => setSidebarCollapsed((value) => !value)}
            >
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.id;
              return (
                <button
                  key={item.id}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${active ? "bg-white text-[#1e3a8a] shadow-lg" : "text-blue-100 hover:bg-white/10"
                    }`}
                  onClick={() => {
                    setSelectedStudentId(null);
                    setSelectedBatchId(null);
                    setActivePage(item.id);
                  }}
                >
                  <Icon size={18} />
                  {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {!sidebarCollapsed && (
            <div className="rounded-3xl bg-white/10 p-4 text-sm text-blue-100 mt-auto mb-4">
              <p className="font-semibold text-white">Academic Year</p>
              <p>{appState.settings.academicYear}</p>
              {isAdmin && <p className="mt-3">Active batches: {appState.batches.length}</p>}
            </div>
          )}

          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-red-200 transition hover:bg-white/10 ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
          >
            <LogOut size={18} />
            {!sidebarCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </aside>

        <main className="flex-1 overflow-hidden">
          <div className="bg-[#1e3a8a] px-4 py-3 text-white md:hidden flex justify-between items-center">
            <div className="mb-3">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Management</p>
              <h1 className="text-lg font-semibold">{appState.settings.coachingName}</h1>
            </div>
            <div className="flex gap-2">
              <button onClick={() => loadStateFromDatabase()} className="rounded-full p-2 text-blue-200 hover:bg-white/10">
                <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
              </button>
              <button onClick={handleLogout} className="rounded-full p-2 text-red-200 hover:bg-white/10">
                <LogOut size={18} />
              </button>
            </div>
          </div>
          <div className="bg-[#1e3a8a] px-4 pb-2 md:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {currentNavItems.map((item) => {
                const Icon = item.icon;
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${active ? "bg-white text-[#1e3a8a]" : "bg-white/10 text-white"
                      }`}
                    onClick={() => {
                      setSelectedStudentId(null);
                      setSelectedBatchId(null);
                      setActivePage(item.id);
                    }}
                  >
                    <Icon size={14} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Coaching Center Suite</p>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {currentNavItems.find((item) => item.id === activePage)?.label || "Overview"}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => loadStateFromDatabase()} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 transition hidden md:block" title="Refresh Data">
                  <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
                </button>
                <div
                  className={`rounded-2xl px-4 py-2 text-sm font-medium ${isDatabaseReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                >
                  {isDatabaseReady ? "Server storage connected" : "Waiting for server sync"}
                </div>
                {isAdmin && (
                  <button
                    className="rounded-2xl bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-blue-800"
                    onClick={() => {
                      if (activePage === "students") {
                        setEditingStudent(null);
                        setStudentFormOpen(true);
                      } else if (activePage === "batches") {
                        setEditingBatch(null);
                        setBatchFormOpen(true);
                      } else if (activePage === "learning") {
                        setScoreModalOpen(true);
                      }
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Plus size={16} /> Quick Add
                    </span>
                  </button>
                )}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                  Today: {formatDate(new Date().toISOString())}
                </div>
              </div>
            </div>
          </div>

          <div className="h-[calc(100vh-96px)] overflow-y-auto px-4 py-6 md:px-8">
            {activePage === "dashboard" && (
              <DashboardPage
                appState={appState}
                data={dashboardData}
                onNavigate={(page) => setActivePage(page)}
                onOpenStudent={(studentId) => {
                  setSelectedStudentId(studentId);
                  setActivePage("students");
                }}
              />
            )}

            {activePage === "students" && (
              <StudentsPage
                appState={appState}
                students={filteredStudents}
                selectedStudent={selectedStudent}
                search={studentSearch}
                setSearch={setStudentSearch}
                studentFilterStatus={studentFilterStatus}
                setStudentFilterStatus={setStudentFilterStatus}
                onAdd={() => {
                  setEditingStudent(null);
                  setStudentFormOpen(true);
                }}
                onEdit={(student) => {
                  setEditingStudent(student);
                  setStudentFormOpen(true);
                }}
                onExportProgress={exportStudentProgressPdf}
                onSendFeesPdf={sendStudentFeesPdfToParent}
                onSendProgressPdf={sendStudentProgressPdfToParent}
                onDelete={deleteStudent}
                onOpen={(studentId) => setSelectedStudentId(studentId)}
                onDeleteNotification={deleteNotificationLog}
                onEditScore={(test) => setScoreModalOpen(test)}
                onDeleteScore={deleteTestScore}
                onSendNotification={setTransientNotification}
                onWithdraw={(student) => {
                  setEditingStudent(student);
                  setWithdrawStudentModalOpen(true);
                }}
                onArchive={(student) => {
                  if (window.confirm(`Are you sure you want to archive ${student.fullName}?`)) {
                    handleStudentSave({ ...student, status: "Archived" });
                    logNotification(student.id, "System Audit", "Student record archived.");
                  }
                }}
              />
            )}

            {activePage === "batches" && (
              <BatchesPage
                appState={appState}
                selectedBatch={selectedBatch}
                onAdd={() => {
                  setEditingBatch(null);
                  setBatchFormOpen(true);
                }}
                onEdit={(batch) => {
                  setEditingBatch(batch);
                  setBatchFormOpen(true);
                }}
                onDelete={deleteBatch}
                onOpen={(batchId) => setSelectedBatchId(batchId)}
                onStudentOpen={(studentId) => {
                  setSelectedStudentId(studentId);
                  setActivePage("students");
                }}
              />
            )}

            {activePage === "fees" && (
              <FeesPage
                appState={appState}
                feeGrid={filteredFeeGrid}
                feeFilters={feeFilters}
                setFeeFilters={setFeeFilters}
                onCellClick={setPaymentModal}
                onExport={exportFeesReport}
                onExportPdf={exportOverdueFeesPdf}
              />
            )}

            {activePage === "learning" && (
              <LearningPage
                appState={appState}
                learningView={learningView}
                filter={learningFilter}
                setFilter={setLearningFilter}
                onAddScore={(test) => setScoreModalOpen(test || true)}
                onSaveScore={saveTestScore}
                onScheduleTest={() => setScheduleTestModalOpen(true)}
                onSendScore={(payload) => setNotificationModal(payload)}
                onDeleteGroup={handleDeleteScheduledTestGroup}
                isAdmin={isAdmin}
                onEditScore={(test) => setScoreModalOpen(test)}
                onDeleteScore={deleteTestScore}
              />
            )}

            {activePage === "notifications" && (
              <NotificationsPage
                appState={appState}
                candidates={notificationCandidates}
                onOpenNotification={setNotificationModal}
                onBulk={(type, payload) => {
                  setBulkNotificationType(type);
                  if (type === "broadcast") setBroadcastConfig(payload);
                }}
                onTemplateSave={(templates) => {
                  saveSettings({ ...appState.settings, templates });
                }}
              />
            )}

            {activePage === "settings" && <SettingsPage settings={appState.settings} onSave={saveSettings} onUpdateAdmin={handleUpdateAdmin} onNavigate={setActivePage} />}

            {activePage === "message-templates" && <MessageTemplatesPage
              appState={appState}
              onSave={async (id, data) => {
                const res = await fetch(`${API_BASE_URL}/api/message-templates/${id}`, {
                  method: 'PUT',
                  headers: { ...fetchHeaders, 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                if (res.ok) {
                  const updated = await res.json();
                  setAppState(prev => ({
                    ...prev,
                    messageTemplates: prev.messageTemplates.map(t => t._id === id ? updated : t)
                  }));
                  addToast("Template updated successfully", "success");
                } else {
                  addToast("Failed to update template", "danger");
                }
              }}
              onReset={async (id) => {
                const res = await fetch(`${API_BASE_URL}/api/message-templates/${id}/reset`, {
                  method: 'POST',
                  headers: fetchHeaders
                });
                if (res.ok) {
                  const updated = await res.json();
                  setAppState(prev => ({
                    ...prev,
                    messageTemplates: prev.messageTemplates.map(t => t._id === id ? updated : t)
                  }));
                  addToast("Template reset to default", "success");
                } else {
                  addToast("Failed to reset template", "danger");
                }
              }}
              onPreview={async (content, data) => {
                const res = await fetch(`${API_BASE_URL}/api/message-templates/preview`, {
                  method: 'POST',
                  headers: { ...fetchHeaders, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content, data })
                });
                if (res.ok) {
                  const json = await res.json();
                  return json.preview;
                }
                return "Preview failed";
              }}
              onBack={() => setActivePage("settings")}
            />}

            {activePage === "my-portal" && appState.students.length > 0 && (
              <div>
                {appState.students.length > 1 && (
                  <div className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700">Multiple Students Found</h4>
                      <p className="text-xs text-slate-500">Switch between your children's profiles</p>
                    </div>
                    <select
                      className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
                      value={parentActiveStudentId || appState.students[0].id}
                      onChange={(e) => setParentActiveStudentId(e.target.value)}
                    >
                      {appState.students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({s.classGrade})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <StudentProfile
                  student={appState.students.find((s) => s.id === parentActiveStudentId) || appState.students[0]}
                  appState={appState}
                  isAdmin={isAdmin}
                  onExportProgress={exportStudentProgressPdf}
                  onSendFeesPdf={sendStudentFeesPdfToParent}
                  onSendProgressPdf={sendStudentProgressPdfToParent}
                  onDeleteNotification={deleteNotificationLog}
                  onEditScore={(test) => setScoreModalOpen(test)}
                  onDeleteScore={deleteTestScore}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      <ToastStack toasts={toasts} />

      {studentFormOpen && (
        <StudentFormModal
          appState={appState}
          isAdmin={isAdmin}
          initialValue={editingStudent}
          onClose={() => {
            setStudentFormOpen(false);
            setEditingStudent(null);
          }}
          onSave={handleStudentSave}
        />
      )}

      {withdrawStudentModalOpen && (
        <WithdrawStudentModal
          student={editingStudent}
          onClose={() => {
            setWithdrawStudentModalOpen(false);
            setEditingStudent(null);
          }}
          onSave={(updatedStudent) => {
            handleStudentSave(updatedStudent);
            logNotification(
              updatedStudent.id,
              "System Audit",
              `Student Withdrawn on ${updatedStudent.withdrawalDate} due to ${updatedStudent.withdrawalReason || "unspecified reason"}. Notes: ${updatedStudent.withdrawalNotes || "None"}`
            );
            setWithdrawStudentModalOpen(false);
          }}
        />
      )}

      {batchFormOpen && (
        <BatchFormModal
          initialValue={editingBatch}
          onClose={() => {
            setBatchFormOpen(false);
            setEditingBatch(null);
          }}
          onSave={handleBatchSave}
        />
      )}

      {paymentModal && (
        <PaymentModal
          record={paymentModal}
          student={appState.students.find((student) => student.id === paymentModal.studentId)}
          onClose={() => setPaymentModal(null)}
          onSave={savePayment}
        />
      )}

      {scoreModalOpen && (
        <ScoreEntryModal
          appState={appState}
          initialData={typeof scoreModalOpen === "object" ? scoreModalOpen : null}
          onClose={() => setScoreModalOpen(false)}
          onSave={saveTestScore}
        />
      )}

      {bulkNotificationType && (
        <BulkNotificationModal
          appState={appState}
          type={bulkNotificationType}
          candidates={notificationCandidates}
          broadcastConfig={broadcastConfig}
          onClose={() => setBulkNotificationType(null)}
          onOpenNotification={setNotificationModal}
        />
      )}

      {notificationModal && (
        <NotificationModal
          payload={notificationModal}
          onClose={() => setNotificationModal(null)}
          onSent={(studentId, type, message) => {
            logNotification(studentId, type, message);
            addToast("WhatsApp link opened");
          }}
        />
      )}

      {scheduleTestModalOpen && (
        <ScheduleTestModal
          appState={appState}
          onClose={() => setScheduleTestModalOpen(false)}
          onSave={handleScheduleTestSave}
        />
      )}

      {transientNotification && (
        <TransientNotificationModal
          payload={transientNotification}
          onClose={() => setTransientNotification(null)}
          onSent={() => {
            addToast("WhatsApp message opened for parent");
            setTransientNotification(null);
          }}
        />
      )}

      {/* Hidden PDF Template Renderer */}
      {studentToPrint && (
        <div style={{ position: 'fixed', top: '200vh', left: 0, zIndex: -9999 }}>
          <StudentProgressPDF
            student={studentToPrint.student}
            summary={buildStudentProgressSummary(studentToPrint.student, appState, studentToPrint.reportMonth)}
            appState={appState}
            reportType={studentToPrint.type}
            reportMonth={studentToPrint.reportMonth}
          />
        </div>
      )}
    </div>
  );
}

function computeDashboard(appState) {
  const currentMonthKey = monthKeyFromDate(new Date());
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const activeStudents = appState.students.filter(s => !s.status || s.status === "Active");
  const currentMonthRecords = appState.feeRecords.filter((record) => record.monthKey === currentMonthKey);
  const totalCollected = currentMonthRecords.reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);
  const allVisibleRecords = getAllVisibleFeeRecords(appState.feeRecords, appState.students);

  const pendingFees = allVisibleRecords.reduce((sum, record) => {
    if (record.status !== "Paid") {
      return sum + Math.max(0, Number(record.amountDue || 0) - Number(record.amountPaid || 0));
    }
    return sum;
  }, 0);

  const pendingMap = {};
  allVisibleRecords.forEach(record => {
    if (record.status !== "Paid" && record.transactionType !== "OPENING_BALANCE") {
      if (!pendingMap[record.studentId]) pendingMap[record.studentId] = [];
      pendingMap[record.studentId].push(record);
    }
  });

  const studentsWithPending = Object.entries(pendingMap)
    .map(([studentId, records]) => {
      const student = appState.students.find(s => s.id === studentId);
      if (!student) return null;
      records.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      const oldest = records[0];
      const totalDue = records.reduce((sum, r) => sum + Math.max(0, Number(r.amountDue || 0) - Number(r.amountPaid || 0)), 0);
      return {
        ...oldest,
        overdueCount: records.length,
        totalDue,
        student,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const upcomingDueDates = activeStudents
    .map((student) => {
      const dueDate = new Date(currentYear, currentMonth, Number(student.feeDueDay || appState.settings.feeDueDay || 1));
      const diff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      const currentMonthRecord = appState.feeRecords.find(
        (record) => record.studentId === student.id && record.monthKey === currentMonthKey,
      );
      const amountDue = Number(currentMonthRecord?.amountDue ?? student.monthlyFeeAmount ?? 0);
      const amountPaid = Number(currentMonthRecord?.amountPaid ?? 0);
      const status =
        currentMonthRecord?.status ??
        (amountPaid >= amountDue ? "Paid" : amountPaid > 0 ? "Partial" : "Pending");

      return {
        id: currentMonthRecord?.id || `${student.id}-${currentMonthKey}`,
        studentId: student.id,
        monthKey: currentMonthKey,
        amountDue,
        amountPaid,
        dueDate: dueDate.toISOString(),
        paymentDate: currentMonthRecord?.paymentDate || "",
        mode: currentMonthRecord?.mode || "",
        remarks: currentMonthRecord?.remarks || "Awaiting payment",
        status,
        student,
        diff,
      };
    })
    .filter((item) => item.diff >= 0 && item.diff <= 7 && item.computedStatus !== "Paid" && item.computedStatus !== "Upcoming")
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const recentScores = [...appState.tests]
    .sort((a, b) => new Date(b.testDate) - new Date(a.testDate))
    .slice(0, 5)
    .map((test) => ({
      ...test,
      student: appState.students.find((student) => student.id === test.studentId),
    }));

  const monthlyCollection = months.map((label, index) => {
    const key = `${new Date().getFullYear()}-${String(index + 1).padStart(2, "0")}`;
    const total = appState.feeRecords
      .filter((record) => record.monthKey === key)
      .reduce((sum, record) => sum + Number(record.amountPaid || 0), 0);
    return { month: label, amount: total };
  });

  const batchDistribution = appState.batches.map((batch) => ({
    name: batch.name,
    value: activeStudents.filter((student) => student.batchId === batch.id).length,
  }));

  const topPerformers = activeStudents
    .map((student) => {
      const scores = appState.tests.filter((test) => test.studentId === student.id);
      const average = scores.length
        ? calculateAverageScore(scores)
        : 0;
      return { student, average };
    })
    .sort((a, b) => b.average - a.average)
    .slice(0, 5);

  return {
    totalStudents: activeStudents.length,
    totalCollected,
    pendingFees,
    activeBatches: appState.batches.length,
    upcomingDueDates,
    studentsWithPending,
    recentScores,
    monthlyCollection,
    batchDistribution,
    topPerformers,
  };
}

function buildFeeGrid(appState, filters) {
  const rows = appState.students
    .filter((student) => (filters.batchId === "all" ? true : student.batchId === filters.batchId))
    .filter((student) => (filters.classGrade === "all" ? true : student.classGrade === filters.classGrade))
    .map((student) => {
      const firstPayableMonthKey = getFirstPayableMonthKey(student);
      const cells = months.map((label, index) => {
        const monthKey = `${new Date().getFullYear()}-${String(index + 1).padStart(2, "0")}`;
        if (firstPayableMonthKey && monthKey < firstPayableMonthKey) {
          return {
            id: `${student.id}-${monthKey}-na`,
            studentId: student.id,
            monthKey,
            monthLabel: label,
            tenureLabel: "N/A",
            amountDue: 0,
            amountPaid: 0,
            dueDate: "",
            paymentDate: "",
            mode: "",
            remarks: "",
            status: "NotApplicable",
          };
        }
        const record =
          appState.feeRecords.find((item) => item.studentId === student.id && item.monthKey === monthKey) || {
            id: uid(),
            studentId: student.id,
            monthKey,
            amountDue: student.monthlyFeeAmount,
            amountPaid: 0,
            dueDate: (() => {
              const [mYear, mMonth] = monthKey.split("-");
              return createCycleBoundary(Number(mYear), Number(mMonth) - 1, Number(student.feeDueDay || 1)).toISOString();
            })(),
            paymentDate: "",
            mode: "",
            remarks: "",
            status: "Pending",
          };
        const dates = getFeeTenureDates(record, student);
        let computedStatus = record.status;
        if (new Date() < dates.startDate && record.status === "Pending") {
          computedStatus = "Upcoming";
        }
        const tenureLabelStr = formatFeeTenure(dates.startDate, dates.endDate);
        return { ...record, status: computedStatus, monthLabel: tenureLabelStr, tenureLabel: tenureLabelStr };
      });
      return { student, cells };
    });

  const filteredRows = rows.filter((row) => {
    if (filters.monthKey === "all" && filters.status === "all") return true;
    return row.cells.some(
      (cell) =>
        cell.status !== "NotApplicable" &&
        (filters.monthKey === "all" || cell.monthKey === filters.monthKey) &&
        (filters.status === "all" || cell.status === filters.status),
    );
  });

  const allVisibleRecords = getAllVisibleFeeRecords(appState.feeRecords, appState.students);

  const totals = appState.feeRecords.reduce((acc, record) => {
    acc.collected += Number(record.amountPaid || 0);
    return acc;
  }, { collected: 0, due: 0, pending: 0 });

  allVisibleRecords.forEach(record => {
    totals.due += Number(record.amountDue || 0);
    if (record.status !== "Paid") {
      totals.pending += Math.max(0, Number(record.amountDue || 0) - Number(record.amountPaid || 0));
    }
  });

  const pendingMap = {};
  allVisibleRecords.forEach(record => {
    if (record.status !== "Paid" && record.transactionType !== "OPENING_BALANCE") {
      if (!pendingMap[record.studentId]) pendingMap[record.studentId] = 0;
      pendingMap[record.studentId]++;
    }
  });

  const defaulters = Object.entries(pendingMap)
    .map(([studentId, pendingCount]) => {
      const student = appState.students.find(s => s.id === studentId);
      return { student, pendingCount };
    })
    .filter(item => item.student && item.pendingCount >= 2);


  return { rows: filteredRows, totals, defaulters };
}

function buildLearningView(appState, filter) {
  const studentScores = appState.tests
    .filter((test) => (filter.studentId ? test.studentId === filter.studentId : true))
    .filter((test) => (filter.batchId === "all" ? true : test.batchId === filter.batchId))
    .filter((test) => (filter.subject === "all" ? true : test.subject === filter.subject))
    .sort((a, b) => new Date(a.testDate) - new Date(b.testDate));

  const trend = studentScores.map((test) => ({
    date: test.testDate.slice(5),
    subject: test.subject,
    percent: Math.round((test.marksObtained / test.maxMarks) * 100),
    testName: test.testName,
  }));

  const subjectAverages = Object.values(
    studentScores.reduce((acc, test) => {
      if (!acc[test.subject]) acc[test.subject] = { subject: test.subject, total: 0, count: 0 };
      acc[test.subject].total += (test.marksObtained / test.maxMarks) * 100;
      acc[test.subject].count += 1;
      return acc;
    }, {}),
  ).map((entry) => ({ subject: entry.subject, average: Math.round(entry.total / entry.count) }));

  const strongest = [...subjectAverages].sort((a, b) => b.average - a.average)[0];
  const weakest = [...subjectAverages].sort((a, b) => a.average - b.average)[0];
  const improvement =
    studentScores.length >= 2
      ? Math.round(
        ((studentScores.at(-1).marksObtained / studentScores.at(-1).maxMarks -
          studentScores.at(-2).marksObtained / studentScores.at(-2).maxMarks) *
          100),
      )
      : 0;

  const batchAnalytics = appState.batches.map((batch) => {
    const batchScores = appState.tests.filter((test) => test.batchId === batch.id);
    const subjectSummary = Object.values(
      batchScores.reduce((acc, test) => {
        if (!acc[test.subject]) acc[test.subject] = { subject: test.subject, total: 0, count: 0 };
        acc[test.subject].total += (test.marksObtained / test.maxMarks) * 100;
        acc[test.subject].count += 1;
        return acc;
      }, {}),
    ).map((entry) => ({ subject: entry.subject, average: Math.round(entry.total / entry.count) }));

    return {
      batch,
      subjectSummary,
      passFail: [
        { name: "Pass", value: batchScores.filter((test) => (test.marksObtained / test.maxMarks) * 100 >= 40).length },
        { name: "Fail", value: batchScores.filter((test) => (test.marksObtained / test.maxMarks) * 100 < 40).length },
      ],
    };
  });

  const subjectRankings = appState.settings.subjects.reduce((acc, subject) => {
    const entries = appState.students
      .map((student) => {
        const tests = appState.tests.filter((test) => test.studentId === student.id && test.subject === subject);
        if (!tests.length) return null;
        const average = calculateAverageScore(tests);
        return { name: student.fullName, average: Math.round(average) };
      })
      .filter(Boolean)
      .sort((a, b) => b.average - a.average);
    acc[subject] = { top: entries.slice(0, 3), bottom: [...entries].reverse().slice(0, 3) };
    return acc;
  }, {});

  const tags = { excellent: 0, good: 0, average: 0, needsImprovement: 0 };
  studentScores.forEach((test) => {
    const p = (test.marksObtained / test.maxMarks) * 100;
    if (p >= 90) tags.excellent++;
    else if (p >= 75) tags.good++;
    else if (p >= 50) tags.average++;
    else tags.needsImprovement++;
  });

  return { studentScores, trend, subjectAverages, strongest, weakest, improvement, batchAnalytics, subjectRankings, tags };
}

function buildNotificationCandidates(appState) {
  const today = new Date();
  return appState.feeRecords
    .filter((record) => record.computedStatus !== "Paid" && record.computedStatus !== "Upcoming")
    .map((record) => {
      const student = appState.students.find((item) => item.id === record.studentId);
      if (!student) return null;
      const dueDate = new Date(record.dueDate);
      const diff = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
      let reminderType = "Friendly Reminder";
      if (diff === 0) reminderType = "Due Today";
      if (diff <= -3) reminderType = "Overdue Notice";
      if (diff <= -7) reminderType = "Final Notice";
      return { student, record, reminderType };
    })
    .filter(Boolean);
}

function DashboardPage({ appState, data, onNavigate, onOpenStudent }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <SummaryCard title="Total Students" value={data.totalStudents} icon={Users} />
        <SummaryCard title="Collected This Month" value={formatCurrency(data.totalCollected)} icon={IndianRupee} />
        <SummaryCard
          title="Pending Fees"
          value={formatCurrency(data.pendingFees)}
          icon={AlertTriangle}
          accent={data.pendingFees > 0 ? "danger" : "warning"}
        />
        <SummaryCard title="Active Batches" value={data.activeBatches} icon={GraduationCap} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <Panel title="Fees Collection Trend" icon={BarChart3}>
          <ChartBox>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.monthlyCollection}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]} fill={deepBlue} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </Panel>
        <Panel title="Batch Distribution" icon={ClipboardList}>
          <ChartBox>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.batchDistribution} dataKey="value" nameKey="name" outerRadius={95} label>
                  {data.batchDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={subjectColors[index % subjectColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Upcoming Fee Due Dates" icon={Calendar}>
          <div className="space-y-3">
            {data.upcomingDueDates.length ? (
              data.upcomingDueDates.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onOpenStudent(item.student?.id)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <div>
                    <p className="font-medium">{item.student?.fullName}</p>
                    <p className="text-sm text-slate-500">{formatDate(item.dueDate)}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    {formatCurrency(item.amountDue - item.amountPaid)}
                  </span>
                </button>
              ))
            ) : (
              <EmptyState label="No fee due dates in the next 7 days." />
            )}
          </div>
        </Panel>

        <Panel title="Students With Pending Fees" icon={WalletCards}>
          <div className="space-y-3">
            {data.studentsWithPending.slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-2xl border border-red-100 bg-red-50 p-3">
                <p className="font-medium text-red-900">{item.student?.fullName}</p>
                <p className="text-sm text-red-700">
                  {item.overdueCount} overdue cycle{item.overdueCount > 1 ? "s" : ""} • Total due {formatCurrency(item.totalDue)}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Top 5 Performers" icon={CheckCircle2}>
          <div className="space-y-3">
            {data.topPerformers.map((item, index) => (
              <div key={item.student.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <div>
                  <p className="font-medium">
                    #{index + 1} {item.student.fullName}
                  </p>
                  <p className="text-sm text-slate-500">{item.student.classGrade}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  {item.average.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recent Test Scores" icon={FileText}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-3">Student</th>
                <th className="pb-3">Subject</th>
                <th className="pb-3">Test</th>
                <th className="pb-3">Score</th>
                <th className="pb-3">Grade</th>
              </tr>
            </thead>
            <tbody>
              {data.recentScores.map((score) => (
                <tr key={score.id} className="border-t border-slate-100">
                  <td className="py-3">{score.student?.fullName}</td>
                  <td className="py-3">{score.subject}</td>
                  <td className="py-3">{score.testName}</td>
                  <td className="py-3">
                    {score.marksObtained}/{score.maxMarks}
                  </td>
                  <td className="py-3">
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                      {score.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard title="Manage Students" description="Admission, profiles, fees and performance details." action={() => onNavigate("students")} />
        <ActionCard title="Track Fees" description="Update payment cells, monitor outstanding and export reports." action={() => onNavigate("fees")} />
        <ActionCard title="Send Reminders" description="Open WhatsApp-ready reminder templates for parents." action={() => onNavigate("notifications")} />
      </div>
    </div>
  );
}

function StudentsPage({ appState, students, selectedStudent, search, setSearch, studentFilterStatus, setStudentFilterStatus, onAdd, onEdit, onExportProgress, onSendFeesPdf, onSendProgressPdf, onDelete, onOpen, onDeleteNotification, onEditScore, onDeleteScore, onSendNotification, onWithdraw, onArchive }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel
        title="Student Directory"
        icon={Users}
        action={
          <button className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white" onClick={onAdd}>
            Add Student
          </button>
        }
      >
        <div className="mb-4 flex gap-2">
          {["Active", "Inactive", "Dropped", "Archived", "All"].map((tab) => (
            <button
              key={tab}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${studentFilterStatus === tab ? "bg-[#1e3a8a] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              onClick={() => setStudentFilterStatus(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Search size={16} className="text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, student ID, or class"
            className="w-full border-none bg-transparent outline-none"
          />
        </div>

        <div className="space-y-3">
          {students.map((student) => {
            const batch = appState.batches.find((item) => item.id === student.batchId);
            return (
              <div key={student.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <button className="text-left" onClick={() => onOpen(student.id)}>
                    <h3 className="text-lg font-semibold text-slate-900">{student.fullName}</h3>
                    <p className="text-sm text-slate-500">
                      {student.studentId} • {student.classGrade} • {batch?.name || "Unassigned"}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{student.subjects.join(", ")}</p>
                  </button>
                  <div className="flex gap-2">
                    <IconButton icon={Eye} label="View" onClick={() => onOpen(student.id)} />
                    <IconButton icon={Edit3} label="Edit" onClick={() => onEdit(student)} />
                    <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => onDelete(student.id)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Student Profile" icon={FileText}>
        {selectedStudent ? <StudentProfile student={selectedStudent} appState={appState} isAdmin={true} onExportProgress={onExportProgress} onSendFeesPdf={onSendFeesPdf} onSendProgressPdf={onSendProgressPdf} onDeleteNotification={onDeleteNotification} onEditScore={onEditScore} onDeleteScore={onDeleteScore} onSendNotification={onSendNotification} onWithdraw={onWithdraw} onArchive={onArchive} /> : <EmptyState label="Select a student to open the full profile." />}
      </Panel>
    </div>
  );
}

function StudentProfile({ student, appState, isAdmin, onExportProgress, onSendFeesPdf, onSendProgressPdf, onDeleteNotification, onEditScore, onDeleteScore, onSendNotification, onWithdraw, onArchive }) {
  const batch = appState.batches.find((item) => item.id === student.batchId);
  const rawFeeRecords = appState.feeRecords.filter((record) => record.studentId === student.id);
  const allFeeRecords = getCompletedFeeTenures(rawFeeRecords, student);
  const feeHistory = [...allFeeRecords].sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
  const tests = appState.tests.filter((test) => test.studentId === student.id).sort((a, b) => new Date(b.testDate) - new Date(a.testDate));
  const notifications = appState.notificationLogs.filter((log) => log.studentId === student.id);
  const [tab, setTab] = useState("fees");

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-[#1e3a8a] to-blue-500 p-5 text-white">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-2xl font-semibold">{student.fullName}</h3>
            <p className="mt-1 text-blue-100">
              {student.studentId} • {student.classGrade}
            </p>
            <p className="mt-4 text-sm text-blue-100">
              Batch: {batch?.name || "Unassigned"} • Subjects: {student.subjects.join(", ")}
            </p>
          </div>
          {student.photo ? (
            <img src={student.photo} alt={student.fullName} className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white/30" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold">
              {student.fullName.charAt(0)}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <InfoPill label="Father's Name" value={student.fatherName} />
        <InfoPill label="Mother's Name" value={student.motherName} />
        <InfoPill label="Student Contact" value={student.contactNumber} />
        <InfoPill label="Parent WhatsApp" value={student.parentWhatsapp} />
        <InfoPill label="Email" value={student.email} />
        <InfoPill label="Fee Plan" value={`${formatCurrency(student.monthlyFeeAmount)} / month`} />
        <InfoPill label="Address" value={student.address} className="md:col-span-2" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <h4 className="text-lg font-bold text-slate-800 mb-4">Enrollment Status</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <InfoPill label="Status" value={<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${student.status === 'Dropped' ? 'bg-red-100 text-red-800' : student.status === 'Archived' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'}`}>{student.status || 'Active'}</span>} />
          <InfoPill label="Admission Date" value={formatDate(student.admissionDate)} />
          {student.withdrawalDate && (
            <>
              <InfoPill label="Withdrawal Date" value={formatDate(student.withdrawalDate)} />
              <InfoPill label="Reason" value={student.withdrawalReason || "Not specified"} />
              {student.withdrawalNotes && <InfoPill label="Notes" value={student.withdrawalNotes} className="md:col-span-2" />}
            </>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MessageCircle size={20} className="text-[#1e3a8a]" /> Telegram Notifications</h4>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between">
          <div className="mb-4 sm:mb-0">
            <p className="font-semibold text-slate-800">Telegram Account</p>
            <p className="text-sm text-slate-500">{student.telegramParentChatId ? "Connected ✅" : "Not connected ❌"}</p>
          </div>
          {!student.telegramParentChatId && (
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`${API_BASE_URL}/api/telegram/link-token?type=parent`, {
                    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
                  });
                  const data = await res.json();
                  if (data.linkUrl) window.open(data.linkUrl, '_blank');
                  else alert(data.error || "Failed to generate link");
                } catch (err) {
                  alert("Error connecting to Telegram");
                }
              }}
              className="rounded-xl bg-[#229ED9] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1C8BBE]"
            >
              Connect Telegram (Parent Contact)
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-3">
          {(!student.status || student.status === "Active") && (
            <button
              className="rounded-xl border border-slate-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition flex items-center gap-2"
              onClick={() => onWithdraw(student)}
            >
              <UserMinus size={16} /> Withdraw Student
            </button>
          )}
          {["Dropped", "Completed", "Transferred"].includes(student.status) && (() => {
            const { currentOutstanding } = calculateFeeSummary(allFeeRecords, isOverdueFeeRecord);

            return currentOutstanding === 0 && (
              <button
                className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition flex items-center gap-2"
                onClick={() => onArchive(student)}
              >
                <Archive size={16} /> Archive Student
              </button>
            );
          })()}
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
            onClick={() => onSendNotification(buildTemplatePayload(appState, student, "student_login_credentials", {}))}
          >
            <Lock size={16} /> Send Login Credentials
          </button>
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
            onClick={() => onSendNotification(buildTemplatePayload(appState, student, "password_reset", {}))}
          >
            <RefreshCw size={16} /> Send Password Reset
          </button>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <h4 className="text-lg font-bold text-slate-800 mb-4">Fee Summary</h4>
        <div className="grid gap-4 md:grid-cols-4">
          {(() => {
            const { previousBalance, generatedMonthlyDues, paymentsReceived, currentOutstanding } = calculateFeeSummary(allFeeRecords, isOverdueFeeRecord);

            return (
              <>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Opening Due Balance</p>
                  <p className="mt-1 text-xl font-bold text-slate-800">{formatCurrency(previousBalance)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Generated Monthly Dues</p>
                  <p className="mt-1 text-xl font-bold text-slate-800">+{formatCurrency(generatedMonthlyDues)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payments Received</p>
                  <p className="mt-1 text-xl font-bold text-emerald-600">-{formatCurrency(paymentsReceived)}</p>
                </div>
                <div className="md:border-l md:border-slate-200 md:pl-4">
                  <p className="text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">Total Outstanding</p>
                  <p className={`mt-1 text-2xl font-black ${currentOutstanding > 0 ? "text-red-600" : "text-[#1e3a8a]"}`}>{formatCurrency(currentOutstanding)}</p>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ...(!isAdmin ? [["analytics", "Performance Analytics"]] : []),
          ["fees", "Fee Payment History"],
          ["tests", "Test Scores History"],
          ...(!isAdmin ? [["scheduled", "Scheduled Tests"]] : []),
          ...(isAdmin ? [["notifications", "Notification Log"]] : []),
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${tab === value ? "bg-[#1e3a8a] text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => onExportProgress(student, "monthly")}
          className="rounded-full bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white"
        >
          Download Monthly Report
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => onExportProgress(student, "overall")}
              className="rounded-full border border-[#1e3a8a] text-[#1e3a8a] px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Download Overall Report
            </button>
            <button
              onClick={() => onSendFeesPdf(student)}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white"
            >
              Send Fees Info
            </button>
            <button
              onClick={() => onSendProgressPdf(student)}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
            >
              Send Progress Info
            </button>
          </>
        )}
      </div>

      {tab === "fees" && (
        <div className="space-y-3">
          {feeHistory.map((record) => (
            <div key={record.id} className="rounded-2xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{record.tenureLabel}</p>
                <StatusBadge status={record.status} />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {formatCurrency(record.amountPaid)} paid out of {formatCurrency(record.amountDue)} • {record.mode || "Not marked"}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "tests" && (
        <div className="space-y-3">
          {tests.map((test) => (
            <div key={test.id} className="rounded-2xl border border-slate-200 p-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{test.testName}</p>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${test.remarks === "Absent on Test Day" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                      {test.remarks === "Absent on Test Day" ? "Absent" : `${test.marksObtained}/${test.maxMarks}`}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {test.subject} • {formatDate(test.testDate)}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                      onClick={() => onEditScore && onEditScore(test)}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 transition"
                      onClick={() => {
                        if (window.confirm("Delete this score?")) {
                          onDeleteScore && onDeleteScore(test.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "notifications" && isAdmin && (
        <div className="space-y-3">
          {notifications.map((log) => (
            <div key={log.id} className="rounded-2xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{log.type}</p>
                    <span className="text-sm text-slate-500">{formatDate(log.date)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{log.message}</p>
                </div>
                <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => onDeleteNotification(log.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "scheduled" && !isAdmin && (() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const upcoming = (appState.scheduledTests || [])
          .filter((t) => t.studentId === student.id && t.testDate >= todayStr)
          .sort((a, b) => new Date(a.testDate) - new Date(b.testDate));
        return (
          <div className="space-y-3">
            {upcoming.length > 0 ? (
              upcoming.map((test) => (
                <div key={test.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/30">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{test.testName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {test.subject} • Max Marks: {test.maxMarks}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-800">
                        <Calendar size={12} />
                        {formatDate(test.testDate)}
                      </span>
                      {(() => {
                        const daysUntil = Math.ceil((new Date(test.testDate) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
                        return (
                          <p className={`mt-1 text-xs font-medium ${daysUntil <= 1 ? "text-red-600" : daysUntil <= 3 ? "text-amber-600" : "text-slate-400"
                            }`}>
                            {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <Calendar size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No upcoming scheduled tests.</p>
                <p className="text-xs text-slate-400 mt-1">Tests will appear here when your teacher schedules them.</p>
              </div>
            )}
          </div>
        );
      })()}

      {tab === "analytics" && <StudentAnalytics studentId={student.id} />}
    </div>
  );
}

function BatchesPage({ appState, selectedBatch, onAdd, onEdit, onDelete, onOpen, onStudentOpen }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Panel
        title="Batch Management"
        icon={GraduationCap}
        action={
          <button className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white" onClick={onAdd}>
            Add Batch
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {appState.batches.map((batch) => {
            const enrolled = appState.students.filter((student) => student.batchId === batch.id && isActiveStudent(student)).length;
            const occupancy = batch.maxStudents ? Math.round((enrolled / batch.maxStudents) * 100) : 0;
            const tone = occupancy > 90 ? "bg-red-500" : occupancy >= 70 ? "bg-amber-500" : "bg-emerald-500";
            return (
              <div key={batch.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <button className="w-full text-left" onClick={() => onOpen(batch.id)}>
                  <h3 className="text-lg font-semibold">{batch.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {batch.timing} • {batch.teacher}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">{batch.days.join(", ")}</p>
                </button>
                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Capacity</span>
                    <span>
                      {enrolled}/{batch.maxStudents}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full ${tone}`} style={{ width: `${Math.min(occupancy, 100)}%` }} />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <IconButton icon={Eye} label="Open" onClick={() => onOpen(batch.id)} />
                  <IconButton icon={Edit3} label="Edit" onClick={() => onEdit(batch)} />
                  <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => onDelete(batch.id)} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title={selectedBatch ? `${selectedBatch.name} Students` : "Batch Details"} icon={Users}>
        {selectedBatch ? (
          <div className="space-y-3">
            {appState.students
              .filter((student) => student.batchId === selectedBatch.id && isActiveStudent(student))
              .map((student) => (
                <button
                  key={student.id}
                  onClick={() => onStudentOpen(student.id)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <div>
                    <p className="font-medium">{student.fullName}</p>
                    <p className="text-sm text-slate-500">{student.classGrade}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{student.subjects.length} subjects</span>
                </button>
              ))}
          </div>
        ) : (
          <EmptyState label="Select a batch card to view enrolled students." />
        )}
      </Panel>
    </div>
  );
}

function FeesPage({ appState, feeGrid, feeFilters, setFeeFilters, onCellClick, onExport, onExportPdf }) {
  const completion = feeGrid.totals.due ? Math.min(100, Math.round((feeGrid.totals.collected / feeGrid.totals.due) * 100)) : 0;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Fees Dashboard" icon={CreditCard}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total Collected</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(feeGrid.totals.collected)}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total Pending</p>
              <p className="mt-2 text-2xl font-semibold text-red-600">
                {formatCurrency(feeGrid.totals.pending)}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
              <span>Collection Progress</span>
              <span>{completion}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#1e3a8a]" style={{ width: `${completion}%` }} />
            </div>
          </div>
        </Panel>

        <Panel
          title="Defaulters"
          icon={AlertTriangle}
          action={
            <div className="flex gap-2">
              <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium" onClick={onExport}>
                <span className="flex items-center gap-2">
                  <Download size={14} /> HTML Report
                </span>
              </button>
              <button className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white" onClick={onExportPdf}>
                <span className="flex items-center gap-2">
                  <Download size={14} /> Overdue PDF
                </span>
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            {feeGrid.defaulters.map((item) => (
              <div key={item.student.id} className="rounded-2xl border border-red-100 bg-red-50 p-3 text-red-900">
                <p className="font-medium">{item.student.fullName}</p>
                <p className="text-sm">{item.pendingCount} months pending</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Quick Filters" icon={Filter}>
        <div className="grid gap-3 md:grid-cols-4">
          <FilterSelect
            value={feeFilters.batchId}
            onChange={(value) => setFeeFilters((prev) => ({ ...prev, batchId: value }))}
            options={[{ value: "all", label: "All Batches" }, ...appState.batches.map((batch) => ({ value: batch.id, label: batch.name }))]}
          />
          <FilterSelect
            value={feeFilters.classGrade}
            onChange={(value) => setFeeFilters((prev) => ({ ...prev, classGrade: value }))}
            options={[{ value: "all", label: "All Classes" }, ...[...new Set(appState.students.map((student) => student.classGrade))].map((value) => ({ value, label: value }))]}
          />
          <FilterSelect
            value={feeFilters.monthKey}
            onChange={(value) => setFeeFilters((prev) => ({ ...prev, monthKey: value }))}
            options={[{ value: "all", label: "All Months" }, ...months.map((month, index) => ({ value: `${new Date().getFullYear()}-${String(index + 1).padStart(2, "0")}`, label: month }))]}
          />
          <FilterSelect
            value={feeFilters.status}
            onChange={(value) => setFeeFilters((prev) => ({ ...prev, status: value }))}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "Paid", label: "Paid" },
              { value: "Pending", label: "Pending" },
              { value: "Partial", label: "Partial" },
            ]}
          />
        </div>
      </Panel>

      <Panel title="Month-wise Fee Tracker" icon={WalletCards}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-[1100px] text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="pb-3 pr-4">Student</th>
                {months.map((month) => (
                  <th key={month} className="pb-3 pr-4">
                    {month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {feeGrid.rows.map((row) => (
                <tr key={row.student.id} className="border-t border-slate-100">
                  <td className="py-3 pr-4 font-medium">{row.student.fullName}</td>
                  {row.cells.map((cell) => {
                    if (cell.status === "NotApplicable") {
                      return (
                        <td key={cell.monthKey} className="py-3 pr-4">
                          <div className="w-full rounded-xl bg-slate-100 px-3 py-4 text-center text-xs font-medium text-slate-400">
                            -
                          </div>
                        </td>
                      );
                    }

                    const tone =
                      cell.status === "Paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : cell.status === "Partial"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700";

                    return (
                      <td key={cell.monthKey} className="py-3 pr-4">
                        <button onClick={() => onCellClick(cell)} className={`w-full rounded-xl px-3 py-2 text-left ${tone}`}>
                          <div className="text-[11px] font-medium opacity-80">{cell.tenureLabel}</div>
                          <div className="mt-1 text-xs font-semibold">
                            {cell.status === "Paid" ? "Paid" : cell.status === "Partial" ? "Partial" : "Pending"}
                          </div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function LearningPage({ appState, learningView, filter, setFilter, onAddScore, onSaveScore, onScheduleTest, onSendScore, onDeleteGroup, isAdmin, onEditScore, onDeleteScore }) {
  const [selectedTopSubject, setSelectedTopSubject] = useState("");
  const [showAllTestHistory, setShowAllTestHistory] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState("");

  useEffect(() => {
    const subjects = Object.keys(learningView.subjectRankings);
    if ((!selectedTopSubject || !subjects.includes(selectedTopSubject)) && subjects.length > 0) {
      setSelectedTopSubject(subjects[0]);
    }
  }, [learningView.subjectRankings, selectedTopSubject]);

  const groupedTestsMap = {};
  (appState.scheduledTests || []).forEach((test) => {
    const key = `${test.batchId}_${test.subject}_${test.testName}_${test.testDate}`;
    if (!groupedTestsMap[key]) {
      groupedTestsMap[key] = {
        key,
        batchId: test.batchId,
        subject: test.subject,
        testName: test.testName,
        testDate: test.testDate,
        maxMarks: test.maxMarks,
        tests: [],
      };
    }
    groupedTestsMap[key].tests.push(test);
  });
  const todayStr = new Date().toISOString().slice(0, 10);
  const groupedTests = Object.values(groupedTestsMap)
    .filter((g) => g.testDate >= todayStr)
    .sort((a, b) => new Date(a.testDate) - new Date(b.testDate));

  const [expandedGroup, setExpandedGroup] = useState(null);

  return (
    <div className="space-y-6">
      <Panel
        title="Learning Tracker"
        icon={BookOpen}
        action={
          <div className="flex items-center gap-2">
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700" onClick={onScheduleTest}>
              Schedule Test
            </button>
            <button className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white" onClick={() => onAddScore()}>
              Enter Score
            </button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <FilterSelect
            value={filter.studentId}
            onChange={(value) => setFilter((prev) => ({ ...prev, studentId: value }))}
            options={[{ value: "", label: "All Students" }, ...appState.students.map((student) => ({ value: student.id, label: student.fullName }))]}
          />
          <FilterSelect
            value={filter.batchId}
            onChange={(value) => setFilter((prev) => ({ ...prev, batchId: value }))}
            options={[{ value: "all", label: "All Batches" }, ...appState.batches.map((batch) => ({ value: batch.id, label: batch.name }))]}
          />
          <FilterSelect
            value={filter.subject}
            onChange={(value) => setFilter((prev) => ({ ...prev, subject: value }))}
            options={[{ value: "all", label: "All Subjects" }, ...appState.settings.subjects.map((subject) => ({ value: subject, label: subject }))]}
          />
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Score Trend Over Time" icon={BarChart3}>
          <ChartBox>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={learningView.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="percent" stroke={deepBlue} strokeWidth={3} dot={{ r: 4 }} animationDuration={900} />
              </LineChart>
            </ResponsiveContainer>
          </ChartBox>
        </Panel>

        <Panel title="Auto Insights" icon={CheckCircle2}>
          <div className="space-y-4">
            <InsightTile label="Strongest Subject" value={learningView.strongest ? `${learningView.strongest.subject} (${learningView.strongest.average}%)` : "-"} />
            <InsightTile label="Weakest Subject" value={learningView.weakest ? `${learningView.weakest.subject} (${learningView.weakest.average}%)` : "-"} />
            <InsightTile label="Improvement" value={`${learningView.improvement >= 0 ? "+" : ""}${learningView.improvement}%`} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel title="Subject-wise Average Comparison" icon={ClipboardList}>
          <ChartBox>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={learningView.subjectAverages}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="subject" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="average" fill={deepBlue} radius={[4, 4, 0, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </Panel>

        <Panel title="Performance Distribution" icon={PieChartIcon}>
          <div className="flex h-[280px] items-center justify-center rounded-3xl bg-slate-50">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Excellent (90%+)", value: learningView.tags.excellent },
                    { name: "Good (75-89%)", value: learningView.tags.good },
                    { name: "Average (50-74%)", value: learningView.tags.average },
                    { name: "Needs Improvement (<50%)", value: learningView.tags.needsImprovement },
                  ]}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  animationDuration={900}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#3b82f6" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Top 3 and Bottom 3 by Subject" icon={Users}>
          <div className="space-y-4">
            {Object.keys(learningView.subjectRankings).length > 0 && (
              <SelectField
                label="Select Subject"
                value={selectedTopSubject}
                onChange={setSelectedTopSubject}
                options={Object.keys(learningView.subjectRankings).map((subj) => ({ value: subj, label: subj }))}
              />
            )}
            {(() => {
              const ranking = learningView.subjectRankings[selectedTopSubject];
              if (!ranking) return <div className="text-sm text-slate-500">No data for selected subject</div>;
              return (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold">{selectedTopSubject}</p>
                  <p className="mt-2 text-sm text-slate-600">Top: {ranking.top.map((item) => `${item.name} (${item.average}%)`).join(", ") || "-"}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Bottom: {ranking.bottom.map((item) => `${item.name} (${item.average}%)`).join(", ") || "-"}
                  </p>
                </div>
              );
            })()}
          </div>
        </Panel>

        {groupedTests.length > 0 && (
          <Panel title="Scheduled Tests" icon={FileText}>
            <div className="space-y-3">
              {groupedTests.map((group) => {
                const isExpanded = expandedGroup === group.key;
                const batchName = appState.batches.find((b) => b.id === group.batchId)?.name || "Unknown Batch";
                const isPassed = group.testDate < todayStr;

                return (
                  <div key={group.key} className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div
                      className="bg-slate-50 p-4 cursor-pointer hover:bg-slate-100 transition flex items-center justify-between"
                      onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
                    >
                      <div>
                        <p className="font-medium text-slate-900">{group.subject} - {group.testName}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(group.testDate)} • {batchName} • {group.tests.length} Students
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={isPassed}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${isPassed ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-red-100 text-red-800 hover:bg-red-200"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Are you sure you want to delete this scheduled test for all students?")) {
                              onDeleteGroup(group);
                            }
                          }}
                        >
                          Delete Test
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="p-4 border-t border-slate-200 bg-white space-y-2">
                        {group.tests.map((test) => {
                          const student = appState.students.find((item) => item.id === test.studentId);
                          if (!student) return null;
                          return (
                            <div key={test.id} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/50">
                              <span className="text-sm font-medium">{student.fullName}</span>
                              <div className="flex gap-2">
                                <button
                                  className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-200"
                                  onClick={() => onAddScore(test)}
                                >
                                  Enter Score
                                </button>
                                <button
                                  disabled={isPassed}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isPassed ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-amber-100 text-amber-800 hover:bg-amber-200"}`}
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to mark ${student.fullName} as absent?`)) {
                                      onSaveScore({ ...test, marksObtained: 0, remarks: "Absent on Test Day", scheduledTestId: test.id });
                                    }
                                  }}
                                >
                                  Absent
                                </button>
                                <button
                                  disabled={isPassed}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isPassed ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"}`}
                                  onClick={() => {
                                    onSendScore(buildTestPrepNotificationPayload(appState, student, test));
                                  }}
                                >
                                  Notify
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        <Panel
          title="Full Test History"
          icon={FileText}
          action={
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student..."
                  className="rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                />
              </div>
              <button
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                onClick={() => setShowAllTestHistory(!showAllTestHistory)}
              >
                {showAllTestHistory ? "Show Less" : "See All"}
              </button>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-3">Student</th>
                  <th className="pb-3">Subject</th>
                  <th className="pb-3">Test</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Score</th>
                  <th className="pb-3">Grade</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let history = [...learningView.studentScores].reverse();
                  if (historySearchQuery) {
                    const lowerQuery = historySearchQuery.toLowerCase();
                    history = history.filter(test => {
                      const student = appState.students.find((item) => item.id === test.studentId);
                      return student && student.fullName.toLowerCase().includes(lowerQuery);
                    });
                  }
                  if (!showAllTestHistory) {
                    history = history.slice(0, 10);
                  }
                  return history.map((test) => {
                    const student = appState.students.find((item) => item.id === test.studentId);
                    if (!student) return null;
                    return (
                      <tr key={test.id} className="border-t border-slate-100">
                        <td className="py-3">{student?.fullName}</td>
                        <td className="py-3">{test.subject}</td>
                        <td className="py-3">{test.testName}</td>
                        <td className="py-3">{formatDate(test.testDate)}</td>
                        <td className="py-3">
                          {test.remarks === "Absent on Test Day" ? (
                            <span className="text-red-600 font-semibold">Absent</span>
                          ) : (
                            `${test.marksObtained}/${test.maxMarks}`
                          )}
                        </td>
                        <td className="py-3">{test.grade}</td>
                        <td className="py-3 flex gap-2">
                          <button
                            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
                            onClick={() =>
                              onSendScore(
                                buildTestScorePayload(appState, student, test, test.grade),
                              )
                            }
                          >
                            Send WhatsApp
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function NotificationsPage({ appState, candidates, onOpenNotification, onBulk, onTemplateSave }) {
  const [templates, setTemplates] = useState(appState.settings.templates);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");

  const [telegramAudience, setTelegramAudience] = useState("all");
  const [telegramBatch, setTelegramBatch] = useState("all");
  const [telegramMessage, setTelegramMessage] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleTelegramBroadcast = async () => {
    setIsBroadcasting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/telegram/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          audience: telegramAudience,
          batchId: telegramAudience === "batch" ? telegramBatch : undefined,
          message: telegramMessage
        })
      });
      const data = await res.json();
      if (data.ok) {
        alert(`Broadcast sent successfully!\nSent: ${data.result.sent}\nFailed: ${data.result.failed}`);
        setTelegramMessage("");
      } else {
        alert(data.error || "Broadcast failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error sending broadcast");
    } finally {
      setIsBroadcasting(false);
    }
  };

  useEffect(() => {
    setTemplates(appState.settings.templates);
  }, [appState.settings.templates]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel
          title="Fee Reminders"
          icon={Bell}
          action={
            <button className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white" onClick={() => onBulk("fees")}>
              Send to Defaulters
            </button>
          }
        >
          <div className="space-y-3">
            {candidates.map((item) => (
              <div key={item.record.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.student.fullName}</p>
                    <p className="text-sm text-slate-500">
                      {item.reminderType} • Due {formatDate(item.record.dueDate)}
                    </p>
                  </div>
                  <button
                    className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
                    onClick={() =>
                      onOpenNotification(buildFeeNotificationPayload(appState, item.student, item.record, item.reminderType))
                    }
                  >
                    Open Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Score Report Broadcast"
          icon={SendIcon}
          action={
            <button className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white" onClick={() => onBulk("scores")}>
              Send to Batch
            </button>
          }
        >
          <div className="space-y-3">
            {[...appState.tests]
              .sort((a, b) => new Date(b.testDate) - new Date(a.testDate))
              .slice(0, 8)
              .map((test) => {
                const student = appState.students.find((item) => item.id === test.studentId);
                if (!student) return null;
                return (
                  <div key={test.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-semibold">
                      {test.testName} • {student?.fullName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {test.subject} • {test.marksObtained}/{test.maxMarks}
                    </p>
                    <button
                      className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
                      onClick={() =>
                        onOpenNotification(
                          buildTestScorePayload(appState, student, test, test.grade),
                        )
                      }
                    >
                      Open Score Message
                    </button>
                  </div>
                );
              })}
          </div>
        </Panel>
      </div>

      <Panel title="General Announcement Broadcast" icon={Bell}>
        <div className="grid gap-4">
          <InputField
            label="Subject / Title"
            value={broadcastSubject}
            onChange={setBroadcastSubject}
            placeholder="e.g. Upcoming Holidays"
          />
          <TextAreaField
            label="Message Content"
            value={broadcastMessage}
            onChange={setBroadcastMessage}
            placeholder="e.g. The coaching center will remain closed for 3 days starting from tomorrow."
          />
          <div>
            <button
              className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={!broadcastSubject.trim() || !broadcastMessage.trim()}
              onClick={() => onBulk("broadcast", { subject: broadcastSubject, message: broadcastMessage })}
            >
              Prepare Broadcast for All Students
            </button>
          </div>
        </div>
      </Panel>
      <Panel title="Telegram Broadcast" icon={MessageCircle}>
        <div className="grid gap-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Audience</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
                value={telegramAudience}
                onChange={e => setTelegramAudience(e.target.value)}
              >
                <option value="all">All Connected (Students & Parents)</option>
                <option value="all_students">All Connected Students</option>
                <option value="all_parents">All Connected Parents</option>
                <option value="batch">Specific Batch</option>
              </select>
            </div>
            {telegramAudience === "batch" && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Batch</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
                  value={telegramBatch}
                  onChange={e => setTelegramBatch(e.target.value)}
                >
                  <option value="all">Select Batch</option>
                  {appState.batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <TextAreaField
            label="Telegram Message"
            value={telegramMessage}
            onChange={setTelegramMessage}
            placeholder="Type your message here... Markdown is supported (*bold*, _italic_)"
          />
          <div>
            <button
              className="rounded-xl bg-[#229ED9] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 flex items-center gap-2"
              disabled={!telegramMessage.trim() || isBroadcasting}
              onClick={handleTelegramBroadcast}
            >
              <Send size={16} /> {isBroadcasting ? "Sending..." : "Send Telegram Broadcast"}
            </button>
          </div>
        </div>
      </Panel>

    </div>
  );
}

function SettingsPage({ settings, onSave, onUpdateAdmin, onNavigate }) {
  const [form, setForm] = useState(settings);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  useEffect(() => setForm(settings), [settings]);

  return (
    <div className="space-y-6">
      <Panel title="Center Settings" icon={Settings}>
        <div className="grid gap-5 md:grid-cols-2">
          <InputField label="Coaching Center Name" value={form.coachingName} onChange={(value) => setForm((prev) => ({ ...prev, coachingName: value }))} />
          <InputField label="Center Phone" value={form.phone} onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))} />
          <InputField label="Center Address" value={form.address} onChange={(value) => setForm((prev) => ({ ...prev, address: value }))} />
          <InputField label="Academic Year" value={form.academicYear} onChange={(value) => setForm((prev) => ({ ...prev, academicYear: value }))} />
          <InputField label="Fee Due Day" type="number" value={form.feeDueDay} onChange={(value) => setForm((prev) => ({ ...prev, feeDueDay: Number(value) }))} />
          <InputField label="Logo URL / Base64" value={form.logo} onChange={(value) => setForm((prev) => ({ ...prev, logo: value }))} />
          <TextAreaField
            label="Subjects List (comma separated)"
            value={form.subjects.join(", ")}
            onChange={(value) => setForm((prev) => ({ ...prev, subjects: value.split(",").map((item) => item.trim()).filter(Boolean) }))}
          />
          <div className="rounded-3xl border border-slate-200 p-4">
            <p className="mb-3 font-semibold">Grade Boundaries</p>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["aPlus", "A+"],
                ["a", "A"],
                ["b", "B"],
                ["c", "C"],
                ["d", "D"],
              ].map(([key, label]) => (
                <InputField
                  key={key}
                  label={`${label} threshold`}
                  type="number"
                  value={form.gradeBoundaries[key]}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      gradeBoundaries: { ...prev.gradeBoundaries, [key]: Number(value) },
                    }))
                  }
                />
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 p-4 flex flex-col justify-center items-start gap-3 bg-slate-50">
            <div>
              <p className="font-semibold text-slate-800">Message Templates</p>
              <p className="text-sm text-slate-500">Manage automated messages for WhatsApp, SMS, and Email.</p>
            </div>
            <button className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white flex items-center gap-2" onClick={() => onNavigate("message-templates")}>
              <MessageSquare size={16} /> Manage Templates
            </button>
          </div>
        </div>
        <div className="mt-5">
          <button className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white" onClick={() => onSave(form)}>
            <span className="flex items-center gap-2">
              <Save size={16} /> Save Settings
            </span>
          </button>
        </div>
      </Panel>

      <Panel title="Admin Credentials" icon={Lock}>
        <div className="grid gap-5 md:grid-cols-2">
          <InputField label="New Admin Username" value={adminUsername} onChange={setAdminUsername} />
          <InputField label="New Admin Password" type="password" value={adminPassword} onChange={setAdminPassword} />
        </div>
        <div className="mt-5 text-sm text-slate-500 mb-4">
          Updating the admin credentials will log you out immediately. You will need to log back in with your new credentials.
        </div>
        <div>
          <button
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={!adminUsername.trim() || !adminPassword.trim()}
            onClick={() => {
              if (window.confirm("Are you sure you want to change the admin credentials? You will be logged out.")) {
                onUpdateAdmin(adminUsername, adminPassword);
              }
            }}
          >
            Update Credentials
          </button>
        </div>
      </Panel>
    </div>
  );
}

function ScheduleTestModal({ appState, onClose, onSave }) {
  const [form, setForm] = useState({
    batchId: "all",
    subject: appState.settings.subjects[0] || "",
    testName: "",
    testDate: new Date().toISOString().slice(0, 10),
    maxMarks: 100,
  });

  const [selectedStudents, setSelectedStudents] = useState([]);
  const [error, setError] = useState("");

  const handleSave = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (form.testDate < todayStr) {
      setError("Cannot schedule a test for a past date.");
      return;
    }
    setError("");
    onSave(form, selectedStudents);
  };

  const filteredStudents = useMemo(() => {
    return form.batchId === "all"
      ? appState.students.filter(isActiveStudent)
      : appState.students.filter((s) => s.batchId === form.batchId && isActiveStudent(s));
  }, [form.batchId, appState.students]);

  useEffect(() => {
    setSelectedStudents(filteredStudents.map(s => s.id));
  }, [filteredStudents]);

  const toggleStudent = (id) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(prev => prev.filter(sId => sId !== id));
    } else {
      setSelectedStudents(prev => [...prev, id]);
    }
  };

  return (
    <ModalShell title="Schedule Test" onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Batch"
          value={form.batchId}
          onChange={(value) => setForm((prev) => ({ ...prev, batchId: value }))}
          options={[{ value: "all", label: "All Students" }, ...appState.batches.map(b => ({ value: b.id, label: b.name }))]}
        />
        <SelectField
          label="Subject"
          value={form.subject}
          onChange={(value) => setForm((prev) => ({ ...prev, subject: value }))}
          options={appState.settings.subjects}
        />
        <InputField label="Test Name" value={form.testName} onChange={(value) => setForm((prev) => ({ ...prev, testName: value }))} />
        <InputField label="Test Date" type="date" value={form.testDate} onChange={(value) => setForm((prev) => ({ ...prev, testDate: value }))} />
        <InputField label="Max Marks" type="number" value={form.maxMarks} onChange={(value) => setForm((prev) => ({ ...prev, maxMarks: Number(value) }))} />
      </div>

      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

      <div className="mt-6">
        <label className="mb-2 block text-sm font-medium text-slate-700">Select Students</label>
        <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 p-2 space-y-1">
          {filteredStudents.map(student => (
            <label key={student.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedStudents.includes(student.id)}
                onChange={() => toggleStudent(student.id)}
                className="rounded border-slate-300"
              />
              <span className="text-sm font-medium">{student.fullName}</span>
            </label>
          ))}
          {filteredStudents.length === 0 && (
            <div className="p-2 text-sm text-slate-500">No students found.</div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium" onClick={onClose}>
          Cancel
        </button>
        <button
          className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={handleSave}
          disabled={!form.testName || selectedStudents.length === 0}
        >
          Schedule Test
        </button>
      </div>
    </ModalShell>
  );
}

function TransientNotificationModal({ payload, onClose, onSent }) {
  const whatsappUrl = `https://wa.me/${(payload.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(payload.message)}`;
  return (
    <ModalShell title={payload.title} onClose={onClose} width="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
          <Bell size={16} className="shrink-0" />
          <span>📱 Temporary notification — <strong>not saved</strong> to logs or database</span>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="mb-2 text-sm font-medium text-slate-500">Message Preview</p>
          <p className="whitespace-pre-wrap text-slate-800">{payload.message}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            onClick={onClose}
          >
            Skip
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition flex items-center gap-2"
            onClick={(e) => {
              if (!canPerformAction()) {
                e.preventDefault();
                return;
              }
              onSent();
            }}
          >
            <SendIcon size={14} /> Send via WhatsApp
          </a>
        </div>
      </div>
    </ModalShell>
  );
}

function WithdrawStudentModal({ student, onClose, onSave }) {
  const [form, setForm] = useState({
    withdrawalDate: new Date().toISOString().slice(0, 10),
    withdrawalReason: "",
    withdrawalNotes: "",
  });

  return (
    <ModalShell title={`Withdraw Student: ${student.fullName}`} onClose={onClose}>
      <div className="space-y-4">
        <InputField label="Withdrawal Date" type="date" value={form.withdrawalDate} onChange={(value) => setForm((prev) => ({ ...prev, withdrawalDate: value }))} />
        <SelectField
          label="Reason for Leaving"
          value={form.withdrawalReason}
          onChange={(value) => setForm((prev) => ({ ...prev, withdrawalReason: value }))}
          options={[
            { value: "", label: "Select Reason (Optional)" },
            { value: "Joined Another Coaching", label: "Joined Another Coaching" },
            { value: "Relocated", label: "Relocated" },
            { value: "Financial Reasons", label: "Financial Reasons" },
            { value: "Personal Reasons", label: "Personal Reasons" },
            { value: "Course Completed", label: "Course Completed" },
            { value: "Other", label: "Other" }
          ]}
        />
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Notes (Optional)</label>
          <textarea
            className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
            rows="3"
            value={form.withdrawalNotes}
            onChange={(e) => setForm((prev) => ({ ...prev, withdrawalNotes: e.target.value }))}
            placeholder="Any additional context..."
          ></textarea>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium" onClick={onClose}>
          Cancel
        </button>
        <button
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          onClick={() => onSave({ ...student, status: "Dropped", ...form })}
          disabled={!form.withdrawalDate}
        >
          Confirm Withdrawal
        </button>
      </div>
    </ModalShell>
  );
}

function StudentFormModal({ appState, initialValue, onClose, onSave, isAdmin }) {
  const defaultAdmissionDate = new Date().toISOString().slice(0, 10);
  const defaultFeeDueDay = Number(defaultAdmissionDate.slice(8, 10));

  const existingOpeningRecord = initialValue ? appState.feeRecords.find(r => r.studentId === initialValue.id && r.transactionType === "OPENING_BALANCE") : null;
  const initialOpeningBalance = existingOpeningRecord ? existingOpeningRecord.amountDue : 0;

  const [form, setForm] = useState(
    initialValue ? { ...initialValue, openingBalance: initialOpeningBalance } : {
      fullName: "",
      fatherName: "",
      motherName: "",
      dateOfBirth: "",
      gender: "Male",
      contactNumber: "",
      parentWhatsapp: "",
      email: "",
      address: "",
      photo: "",
      admissionDate: defaultAdmissionDate,
      classGrade: "Class 6",
      subjects: [],
      batchId: appState.batches[0]?.id || "",
      totalCourseFee: 0,
      monthlyFeeAmount: 0,
      discount: 0,
      feeDueDay: defaultFeeDueDay,
      openingBalance: 0,
      status: "Active",
    },
  );

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, photo: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  function handleAdmissionDateChange(value) {
    setForm((prev) => ({
      ...prev,
      admissionDate: value,
      feeDueDay: initialValue ? prev.feeDueDay : Number(value.slice(8, 10)),
    }));
  }

  return (
    <ModalShell title={initialValue ? "Edit Student" : "Add Student"} onClose={onClose} width="max-w-5xl">
      <div className="grid gap-4 md:grid-cols-3">
        <InputField label="Full Name" value={form.fullName} onChange={(value) => setForm((prev) => ({ ...prev, fullName: value }))} />
        <InputField label="Father's Name" value={form.fatherName} onChange={(value) => setForm((prev) => ({ ...prev, fatherName: value }))} />
        <InputField label="Mother's Name" value={form.motherName} onChange={(value) => setForm((prev) => ({ ...prev, motherName: value }))} />
        <InputField label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(value) => setForm((prev) => ({ ...prev, dateOfBirth: value }))} />
        <SelectField
          label="Gender"
          value={form.gender}
          onChange={(value) => setForm((prev) => ({ ...prev, gender: value }))}
          options={["Male", "Female", "Other"]}
        />
        <InputField label="Student Contact" value={form.contactNumber} onChange={(value) => setForm((prev) => ({ ...prev, contactNumber: value }))} />
        <InputField label="Parent WhatsApp" value={form.parentWhatsapp} onChange={(value) => setForm((prev) => ({ ...prev, parentWhatsapp: value }))} />
        <InputField label="Email Address" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
        <InputField label="Admission Date" type="date" value={form.admissionDate} onChange={handleAdmissionDateChange} />
        <SelectField
          label="Class / Grade"
          value={form.classGrade}
          onChange={(value) => setForm((prev) => ({ ...prev, classGrade: value }))}
          options={["None", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"]}
        />
        <SelectField
          label="Batch"
          value={form.batchId}
          onChange={(value) => setForm((prev) => ({ ...prev, batchId: value }))}
          options={appState.batches.map((batch) => ({ value: batch.id, label: batch.name }))}
        />
        <SelectField
          label="Enrollment Status"
          value={form.status || "Active"}
          onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
          options={[
            { value: "Active", label: "Active" },
            { value: "Inactive", label: "Inactive" },
            { value: "Dropped", label: "Dropped" },
            { value: "Completed", label: "Completed" },
            { value: "Transferred", label: "Transferred" }
          ]}
        />
        <InputField label="Total Course Fee" type="number" value={form.totalCourseFee} onChange={(value) => setForm((prev) => ({ ...prev, totalCourseFee: Number(value) }))} />
        <InputField label="Monthly Fee Amount" type="number" value={form.monthlyFeeAmount} onChange={(value) => setForm((prev) => ({ ...prev, monthlyFeeAmount: Number(value) }))} />
        <InputField label="Discount" type="number" value={form.discount} onChange={(value) => setForm((prev) => ({ ...prev, discount: Number(value) }))} />
        <InputField label="Fee Due Date (day)" type="number" value={form.feeDueDay} onChange={(value) => setForm((prev) => ({ ...prev, feeDueDay: Number(value) }))} />
        <div className="md:col-span-3">
          <label className="mb-2 block text-sm font-medium text-slate-700">Opening Due Balance (₹) <span className="text-xs text-slate-500 font-normal ml-2">(Enter any pending amount from manual records before migration to the CMS)</span></label>
          <input
            type="number"
            disabled={!isAdmin}
            value={form.openingBalance}
            onChange={(e) => setForm((prev) => ({ ...prev, openingBalance: Math.max(0, Number(e.target.value)) }))}
            className={`w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] ${!isAdmin ? 'bg-slate-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div className="md:col-span-3">
          <TextAreaField label="Full Address" value={form.address} onChange={(value) => setForm((prev) => ({ ...prev, address: value }))} />
        </div>
        <div className="md:col-span-3">
          <label className="mb-2 block text-sm font-medium text-slate-700">Subjects Enrolled</label>
          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {appState.settings.subjects.map((subject) => {
              const active = form.subjects.includes(subject);
              return (
                <button
                  type="button"
                  key={subject}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      subjects: active ? prev.subjects.filter((item) => item !== subject) : [...prev.subjects, subject],
                    }))
                  }
                  className={`rounded-full px-3 py-2 text-sm font-medium ${active ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-600"}`}
                >
                  {subject}
                </button>
              );
            })}
          </div>
        </div>
        <div className="md:col-span-3">
          <label className="mb-2 block text-sm font-medium text-slate-700">Photo Upload</label>
          <input type="file" accept="image/*" onChange={handlePhoto} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3" />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium" onClick={onClose}>
          Cancel
        </button>
        <button
          className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={!form.fullName.trim() || !form.monthlyFeeAmount}
          onClick={() => {
            if (!form.fullName.trim()) { alert("Student name is required."); return; }
            if (!form.monthlyFeeAmount || form.monthlyFeeAmount <= 0) { alert("Monthly fee amount must be greater than 0."); return; }
            if (form.feeDueDay < 1 || form.feeDueDay > 28) { alert("Fee due day must be between 1 and 28."); return; }
            onSave(form);
          }}
        >
          Save Student
        </button>
      </div>
    </ModalShell>
  );
}

function BatchFormModal({ initialValue, onClose, onSave }) {
  const [form, setForm] = useState(
    initialValue || {
      name: "",
      timing: "",
      days: ["Mon", "Wed", "Fri"],
      maxStudents: 20,
      teacher: "",
    },
  );

  return (
    <ModalShell title={initialValue ? "Edit Batch" : "Add Batch"} onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <InputField label="Batch Name" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
        <InputField label="Timing" value={form.timing} onChange={(value) => setForm((prev) => ({ ...prev, timing: value }))} />
        <InputField label="Max Students" type="number" value={form.maxStudents} onChange={(value) => setForm((prev) => ({ ...prev, maxStudents: Number(value) }))} />
        <InputField label="Assigned Teacher Name" value={form.teacher} onChange={(value) => setForm((prev) => ({ ...prev, teacher: value }))} />
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">Days</label>
          <div className="flex flex-wrap gap-2">
            {days.map((day) => {
              const active = form.days.includes(day);
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      days: active ? prev.days.filter((item) => item !== day) : [...prev.days, day],
                    }))
                  }
                  className={`rounded-full px-3 py-2 text-sm font-medium ${active ? "bg-[#1e3a8a] text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium" onClick={onClose}>
          Cancel
        </button>
        <button
          className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={!form.name.trim()}
          onClick={() => {
            if (!form.name.trim()) { alert("Batch name is required."); return; }
            if (!form.timing.trim()) { alert("Timing is required (e.g. '4:00 PM - 5:30 PM')."); return; }
            if (form.maxStudents < 1) { alert("Max students must be at least 1."); return; }
            onSave(form);
          }}
        >
          Save Batch
        </button>
      </div>
    </ModalShell>
  );
}

function PaymentModal({ record, student, onClose, onSave }) {
  const [form, setForm] = useState(record);
  const dates = getFeeTenureDates(record, student);
  const tenureLabel = formatFeeTenure(dates.startDate, dates.endDate);

  return (
    <ModalShell title={`Update Payment • ${student?.fullName || "Student"}`} onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <InputField label="Amount Paid" type="number" value={form.amountPaid} onChange={(value) => setForm((prev) => ({ ...prev, amountPaid: Number(value) }))} />
        <InputField label="Payment Date" type="date" value={form.paymentDate} onChange={(value) => setForm((prev) => ({ ...prev, paymentDate: value }))} />
        <SelectField label="Mode" value={form.mode} onChange={(value) => setForm((prev) => ({ ...prev, mode: value }))} options={["Cash", "Online", "UPI", "Cheque"]} />
        <InputField label="Remarks" value={form.remarks} onChange={(value) => setForm((prev) => ({ ...prev, remarks: value }))} />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium" onClick={onClose}>
          Cancel
        </button>
        <button
          className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white"
          onClick={() => onSave({ ...form, amountPaid: form.amountDue, status: "Paid" })}
        >
          Mark as Paid
        </button>
        <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white" onClick={() => onSave(form)}>
          Save Payment
        </button>
      </div>
    </ModalShell>
  );
}

function ScoreEntryModal({ appState, initialData, onClose, onSave }) {
  const [form, setForm] = useState({
    studentId: initialData?.studentId || appState.students[0]?.id || "",
    subject: initialData?.subject || appState.settings.subjects[0] || "",
    testName: initialData?.testName || "",
    testDate: initialData?.testDate || new Date().toISOString().slice(0, 10),
    maxMarks: initialData?.maxMarks || 100,
    marksObtained: 0,
    remarks: "",
    scheduledTestId: initialData?.id || null
  });

  const percent = Math.round((Number(form.marksObtained) / Number(form.maxMarks || 1)) * 100);
  const grade = getGrade(percent, appState.settings.gradeBoundaries);
  const tag = getPerformanceTag(percent);

  return (
    <ModalShell title="Enter Test / Exam Score" onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Student"
          value={form.studentId}
          onChange={(value) => setForm((prev) => ({ ...prev, studentId: value }))}
          options={appState.students.map((student) => ({ value: student.id, label: student.fullName }))}
        />
        <SelectField
          label="Subject"
          value={form.subject}
          onChange={(value) => setForm((prev) => ({ ...prev, subject: value }))}
          options={appState.settings.subjects}
        />
        <InputField label="Test Name / Title" value={form.testName} onChange={(value) => setForm((prev) => ({ ...prev, testName: value }))} />
        <InputField label="Test Date" type="date" value={form.testDate} onChange={(value) => setForm((prev) => ({ ...prev, testDate: value }))} />
        <InputField label="Max Marks" type="number" value={form.maxMarks} onChange={(value) => setForm((prev) => ({ ...prev, maxMarks: Number(value) }))} />
        <InputField label="Marks Obtained" type="number" value={form.marksObtained} onChange={(value) => setForm((prev) => ({ ...prev, marksObtained: Number(value) }))} />
        <div className="md:col-span-2">
          <TextAreaField label="Remarks / Teacher Notes" value={form.remarks} onChange={(value) => setForm((prev) => ({ ...prev, remarks: value }))} />
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        Auto Grade: <span className="font-semibold text-slate-900">{grade}</span> • Performance Tag:{" "}
        <span className="font-semibold text-slate-900">{tag}</span>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium" onClick={onClose}>
          Cancel
        </button>
        <button className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white" onClick={() => onSave(form)}>
          Save Score
        </button>
      </div>
    </ModalShell>
  );
}

function NotificationModal({ payload, onClose, onSent }) {
  const whatsappUrl = `https://wa.me/${payload.phone.replace(/\D/g, "")}?text=${encodeURIComponent(payload.message)}`;
  return (
    <ModalShell title={payload.title} onClose={onClose} width="max-w-3xl">
      <div className="space-y-4">
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="mb-2 text-sm font-medium text-slate-500">Message Preview</p>
          <p className="whitespace-pre-wrap text-slate-800">{payload.message}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium" onClick={onClose}>
            Close
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white"
            onClick={(e) => {
              if (!canPerformAction()) {
                e.preventDefault();
                return;
              }
              onSent(payload.studentId, payload.type, payload.message);
            }}
          >
            Send via WhatsApp
          </a>
        </div>
      </div>
    </ModalShell>
  );
}

function BulkNotificationModal({ appState, type, candidates, broadcastConfig, onClose, onOpenNotification }) {
  const testsByBatch = [...appState.tests].sort((a, b) => new Date(b.testDate) - new Date(a.testDate));
  const groupedBatches = appState.batches.map((batch) => ({
    batch,
    tests: testsByBatch.filter((test) => test.batchId === batch.id).slice(0, 5),
  }));

  return (
    <ModalShell
      title={type === "fees" ? "Send Fee Reminders to All Defaulters" : type === "broadcast" ? "General Broadcast" : type === "scheduled_tests" ? "Send Test Schedule to Batch" : "Send Score Report to Batch"}
      onClose={onClose}
      width="max-w-4xl"
    >
      <div className="space-y-3">
        {type === "fees" ? (
          candidates.map((item) => (
            <div key={item.record.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
              <div>
                <p className="font-medium">{item.student.fullName}</p>
                <p className="text-sm text-slate-500">
                  {item.reminderType} • {formatCurrency(item.record.amountDue - item.record.amountPaid)}
                </p>
              </div>
              <button
                className="rounded-xl bg-[#1e3a8a] px-3 py-2 text-xs font-semibold text-white"
                onClick={() => onOpenNotification(buildFeeNotificationPayload(appState, item.student, item.record, item.reminderType))}
              >
                Open Send Button
              </button>
            </div>
          ))
        ) : type === "broadcast" ? (
          appState.students.map((student) => (
            <div key={student.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
              <div>
                <p className="font-medium">{student.fullName}</p>
                <p className="text-sm text-slate-500">{broadcastConfig?.subject}</p>
              </div>
              <button
                className="rounded-xl bg-[#1e3a8a] px-3 py-2 text-xs font-semibold text-white"
                onClick={() => onOpenNotification(buildBroadcastPayload(appState, student, broadcastConfig))}
              >
                Open Send Button
              </button>
            </div>
          ))
        ) : type === "scheduled_tests" ? (
          candidates.map((test) => {
            const student = appState.students.find(s => s.id === test.studentId);
            if (!student) return null;
            return (
              <div key={test.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <p className="font-medium">{student.fullName}</p>
                  <p className="text-sm text-slate-500">
                    {test.subject} • {test.testName} • {formatDate(test.testDate)}
                  </p>
                </div>
                <button
                  className="rounded-xl bg-[#1e3a8a] px-3 py-2 text-xs font-semibold text-white"
                  onClick={() => onOpenNotification(buildTestPrepNotificationPayload(appState, student, test))}
                >
                  Open Send Button
                </button>
              </div>
            );
          })
        ) : (
          groupedBatches.map((item) => (
            <div key={item.batch.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="font-semibold">{item.batch.name}</p>
              <div className="mt-3 space-y-3">
                {item.tests.map((test) => {
                  const student = appState.students.find((entry) => entry.id === test.studentId);
                  if (!student) return null;
                  return (
                    <div key={test.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                      <div>
                        <p className="font-medium">{student?.fullName}</p>
                        <p className="text-sm text-slate-500">
                          {test.subject} • {test.testName}
                        </p>
                      </div>
                      <button
                        className="rounded-xl bg-[#1e3a8a] px-3 py-2 text-xs font-semibold text-white"
                        onClick={() =>
                          onOpenNotification(buildTestScorePayload(appState, student, test, test.grade))
                        }
                      >
                        Open Send Button
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </ModalShell>
  );
}

function buildTemplatePayload(appState, student, templateKey, data, payloadOverrides = {}) {
  const template = appState.messageTemplates?.find(t => t.templateKey === templateKey);
  const content = template?.content || "";
  const batch = appState.batches?.find(b => b.id === student.batchId);
  const message = replacePlaceholders(content, {
    studentName: student.fullName,
    parentName: student.fatherName || student.motherName || "Parent",
    studentId: student.studentId,
    class: student.classGrade,
    subjects: student.subjects ? student.subjects.join(", ") : "",
    batch: batch ? batch.name : "",
    contactNumber: appState.settings.phone,
    coachingName: appState.settings.coachingName,
    ...data
  });

  return {
    title: payloadOverrides.title || `${template?.templateName || templateKey} • ${student.fullName}`,
    studentId: student.id,
    type: payloadOverrides.type || template?.templateName || "Notification",
    phone: student.parentWhatsapp,
    message,
    ...payloadOverrides
  };
}


function buildNewEnrollmentPayload(appState, student) {
  return buildTemplatePayload(appState, student, "new_student_admission", {
    admissionDate: formatDate(student.admissionDate),
  });
}

function buildTestScorePayload(appState, student, score, grade) {
  const percent = Math.round((Number(score.marksObtained) / Number(score.maxMarks || 1)) * 100);
  return buildTemplatePayload(appState, student, "marks_published", {
    testName: score.testName,
    subject: score.subject,
    marks: score.marksObtained,
    maxMarks: score.maxMarks,
    percentage: percent,
    grade: grade,
    remarks: score.remarks,
  });
}

function buildFeePaymentUpdatePayload(appState, student, payment, status) {
  const dates = getFeeTenureDates(payment, student);
  const tenureLabelStr = formatFeeTenure(dates.startDate, dates.endDate) || payment.monthKey;
  return buildTemplatePayload(appState, student, "payment_confirmation", {
    month: tenureLabelStr,
    paymentAmount: payment.amountPaid,
    mode: payment.mode,
  });
}

function buildTestPrepNotificationPayload(appState, student, test) {
  return buildTemplatePayload(appState, student, "test_created", {
    subject: test.subject,
    testName: test.testName,
    testDate: formatDate(test.testDate),
    maxMarks: test.maxMarks,
  });
}

function buildFeeNotificationPayload(appState, student, record, reminderType) {
  let templateKey = "fee_due_reminder";
  if (reminderType === "Overdue Notice" || reminderType === "Final Notice") {
    templateKey = "fee_overdue_reminder";
  }

  const allFeeRecords = getCompletedFeeTenures(appState.feeRecords, student);
  const { currentOutstanding } = calculateFeeSummary(allFeeRecords, isOverdueFeeRecord);

  return buildTemplatePayload(appState, student, templateKey, {
    dueAmount: record.amountDue - record.amountPaid,
    totalOutstanding: currentOutstanding,
    dueDate: formatDate(record.dueDate),
    month: record.tenureLabel || record.monthKey,
  }, { type: reminderType, title: `${reminderType} • ${student.fullName}` });
}


function buildBroadcastPayload(appState, student, config) {
  // Fallback to old behavior since broadcast message is provided dynamically by user
  const parentName = student.fatherName || student.motherName || "Parent";
  const message = replacePlaceholders(`Dear {{parentName}},\n\n📢 *{{subject}}*\n\n{{message}}\n\n— {{coachingName}}`, {
    parentName,
    subject: config.subject,
    message: config.message,
    coachingName: appState.settings.coachingName,
  });
  return {
    title: `${config.subject} • ${student.fullName}`,
    studentId: student.id,
    type: "Broadcast",
    phone: student.parentWhatsapp,
    message,
  };
}

function SummaryCard({ title, value, icon: Icon, accent = "primary" }) {
  const accentMap = {
    primary: "from-white to-blue-50",
    danger: "from-white to-red-50",
    warning: "from-white to-amber-50",
  };
  return (
    <div className={`rounded-3xl border border-slate-200 bg-gradient-to-br ${accentMap[accent]} p-5 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className="rounded-2xl bg-[#1e3a8a] p-3 text-white shadow-lg">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children, action }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-3 text-[#1e3a8a]">
            <Icon size={18} />
          </div>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ChartBox({ children }) {
  return <div className="rounded-3xl bg-slate-50 p-4">{children}</div>;
}

function ActionCard({ title, description, action }) {
  return (
    <button onClick={action} className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </button>
  );
}

function EmptyState({ label }) {
  return <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">{label}</div>;
}

function StatusBadge({ status }) {
  const tone =
    status === "Paid"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Partial"
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

function IconButton({ icon: Icon, label, tone = "default", onClick }) {
  const cls =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100";
  return (
    <button onClick={onClick} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${cls}`}>
      <span className="flex items-center gap-2">
        <Icon size={14} /> {label}
      </span>
    </button>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white"
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  const normalized = options.map((option) => (typeof option === "string" ? { value: option, label: option } : option));
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white"
      >
        {normalized.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterSelect({ value, onChange, options }) {
  return <SelectField label="" value={value} onChange={onChange} options={options} />;
}

function ModalShell({ title, onClose, children, width = "max-w-2xl" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-[32px] bg-white p-6 shadow-2xl ${width}`}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          <button className="rounded-full bg-slate-100 p-2 text-slate-500" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ToastStack({ toasts }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] space-y-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto min-w-[260px] rounded-2xl px-4 py-3 text-white shadow-lg ${toast.tone === "danger" ? "bg-red-500" : "bg-[#1e3a8a]"
            }`}
        >
          {toast.title}
        </div>
      ))}
    </div>
  );
}

function InsightTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SendIcon(props) {
  return <Bell {...props} />;
}

function LoginPage({ onLogin, error, isLoading }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 overflow-hidden relative">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-900 opacity-80" />
      <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
      <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[100px] animate-pulse delay-1000" />

      <div className="relative z-10 w-full max-w-md p-8 md:p-12 mx-4 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
            <Lock className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
          <p className="text-blue-200 text-sm">Sign in to your coaching center portal</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-2xl text-sm backdrop-blur-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); onLogin(username, password); }} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">Username or Student ID</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 px-5 py-3 rounded-2xl outline-none focus:bg-white/20 focus:border-white/40 transition"
              placeholder="e.g. admin or CC-2026-001"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 px-5 py-3 rounded-2xl outline-none focus:bg-white/20 focus:border-white/40 transition"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-semibold py-4 rounded-2xl shadow-lg transition duration-200 mt-4 flex justify-center items-center gap-2"
          >
            {isLoading ? <RefreshCw className="animate-spin" size={20} /> : "Sign In"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-white/50 space-y-4">
          <p>Student default: ID / Date of Birth (DDMMYYYY)</p>
          {!isNative() && (
            <div className="pt-2 flex justify-center">
              <a
                href="/app-release.apk"
                download
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-blue-200 rounded-xl transition border border-white/10"
              >
                <Download size={16} />
                Download Android App
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageTemplatesPage({ appState, onSave, onReset, onPreview, onBack }) {
  const [activeTab, setActiveTab] = useState("whatsapp");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewingTemplate, setPreviewingTemplate] = useState(null);

  const categories = [
    { id: "all", label: "All Categories" },
    { id: "admission", label: "Admission" },
    { id: "fee", label: "Fee Updates" },
    { id: "exam", label: "Exam & Results" },
    { id: "attendance", label: "Attendance" },
    { id: "general", label: "General" },
    { id: "announcement", label: "Announcements" },
  ];

  const channels = [
    { id: "whatsapp", label: "WhatsApp" },
    { id: "sms", label: "SMS (Coming Soon)" },
    { id: "telegram", label: "Telegram Notifications" },
  ];

  const filteredTemplates = (appState.messageTemplates || []).filter(t => {
    if (t.channel !== activeTab) return false;
    if (selectedCategory !== "all" && t.category !== selectedCategory) return false;
    if (searchQuery && !t.templateName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50 transition text-slate-600" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Message Templates</h2>
          <p className="text-slate-500 text-sm">Manage automated system messages.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        {channels.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveTab(c.id)}
            className={`pb-3 px-2 text-sm font-semibold border-b-2 transition ${activeTab === c.id ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-64 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Categories</p>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`w-full text-left px-4 py-2 rounded-xl text-sm font-medium transition ${selectedCategory === c.id ? "bg-[#1e3a8a]/10 text-[#1e3a8a]" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map(t => (
              <div key={t._id} className="group relative rounded-3xl border border-slate-200 bg-white p-5 hover:border-[#1e3a8a]/30 hover:shadow-lg transition cursor-pointer flex flex-col" onClick={() => setEditingTemplate(t)}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-slate-800 leading-tight">{t.templateName}</h3>
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${t.isActive ? "bg-emerald-500" : "bg-slate-300"}`} title={t.isActive ? "Active" : "Inactive"} />
                </div>
                <p className="text-xs text-slate-500 mb-4 bg-slate-100 w-fit px-2 py-0.5 rounded-full capitalize">{t.category}</p>
                <div className="mt-auto">
                  <p className="text-[10px] text-slate-400">Updated: {new Date(t.lastUpdatedAt).toLocaleDateString()}</p>
                  <p className="text-[10px] text-slate-400 truncate">By {t.lastUpdatedBy}</p>
                </div>
                <div className="absolute inset-0 bg-[#1e3a8a]/5 opacity-0 group-hover:opacity-100 transition rounded-3xl pointer-events-none" />
              </div>
            ))}
            {filteredTemplates.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500">
                <MessageSquare className="mx-auto mb-3 opacity-20" size={48} />
                <p>No templates found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {editingTemplate && (
        <TemplateEditorModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSave={async (data) => {
            await onSave(editingTemplate._id, data);
            setEditingTemplate(null);
          }}
          onReset={() => {
            if (window.confirm("Are you sure you want to reset this template to its default content?")) {
              onReset(editingTemplate._id);
              setEditingTemplate(null);
            }
          }}
          onPreviewClick={() => setPreviewingTemplate(editingTemplate)}
        />
      )}

      {previewingTemplate && (
        <TemplatePreviewModal
          template={previewingTemplate}
          onClose={() => setPreviewingTemplate(null)}
          onPreview={onPreview}
        />
      )}
    </div>
  );
}

function TemplateEditorModal({ template, onClose, onSave, onReset, onPreviewClick }) {
  const [content, setContent] = useState(template.content);
  const [isActive, setIsActive] = useState(template.isActive);
  const textareaRef = useRef(null);

  const insertVariable = (variable) => {
    const textToInsert = `{{${variable}}}`;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + textToInsert + content.substring(end);
    setContent(newContent);

    // Reset focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  return (
    <ModalShell title={`Edit: ${template.templateName}`} onClose={onClose} width="max-w-4xl">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message Content</label>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full h-64 rounded-2xl border border-slate-200 p-4 text-sm font-medium text-slate-800 outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] whitespace-pre-wrap leading-relaxed"
              placeholder="Type your message here..."
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 accent-[#1e3a8a]" />
              <span className="text-sm font-medium text-slate-700">Template Active</span>
            </label>
          </div>
        </div>

        <div className="md:w-72 space-y-4">
          <div className="rounded-2xl bg-blue-50/50 border border-blue-100 p-4">
            <p className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
              <Plus size={16} /> Insert Variables
            </p>
            <div className="flex flex-wrap gap-2">
              {template.variables.map(v => (
                <button
                  key={v}
                  onClick={() => insertVariable(v)}
                  className="px-2 py-1 rounded bg-white border border-blue-200 text-xs font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition"
                  title={`Insert {{${v}}}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onPreviewClick}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2"
          >
            <Eye size={16} /> Preview Data
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
        <button onClick={onReset} className="text-sm font-semibold text-red-600 hover:text-red-700 transition px-2 py-1">
          Reset to Default
        </button>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="rounded-xl px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
            Cancel
          </button>
          <button
            onClick={() => onSave({ content, isActive })}
            className="rounded-xl bg-[#1e3a8a] px-6 py-2 text-sm font-semibold text-white shadow hover:bg-blue-900 transition flex items-center gap-2"
          >
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function TemplatePreviewModal({ template, onClose, onPreview }) {
  const [previewText, setPreviewText] = useState("Loading preview...");
  const [data, setData] = useState({});

  useEffect(() => {
    // Generate dummy data based on required variables
    const dummy = {};
    template.variables.forEach(v => {
      switch (v) {
        case "studentName": dummy[v] = "Rahul Kumar"; break;
        case "parentName": dummy[v] = "Rajesh Kumar"; break;
        case "studentId": dummy[v] = "CC-2026-001"; break;
        case "class": dummy[v] = "Class 10"; break;
        case "batch": dummy[v] = "Morning Batch A"; break;
        case "dueAmount": dummy[v] = "2500"; break;
        case "totalOutstanding": dummy[v] = "2500"; break;
        case "paymentAmount": dummy[v] = "2500"; break;
        case "month": dummy[v] = "June"; break;
        case "dueDate": dummy[v] = "10 Jun 2026"; break;
        case "admissionDate": dummy[v] = "01 Jun 2026"; break;
        case "mode": dummy[v] = "UPI"; break;
        case "testName": dummy[v] = "Weekly Test 1"; break;
        case "subject": dummy[v] = "Mathematics"; break;
        case "marks": dummy[v] = "45"; break;
        case "maxMarks": dummy[v] = "50"; break;
        case "percentage": dummy[v] = "90"; break;
        case "grade": dummy[v] = "A+"; break;
        case "rank": dummy[v] = "1"; break;
        case "coachingName": dummy[v] = "Kishan Classes"; break;
        case "contactNumber": dummy[v] = "+91 9876543210"; break;
        case "date": dummy[v] = "05 Jun 2026"; break;
        case "subjects": dummy[v] = "Mathematics, Science"; break;
        default: dummy[v] = `[${v}]`;
      }
    });
    setData(dummy);
  }, [template]);

  useEffect(() => {
    if (Object.keys(data).length > 0) {
      onPreview(template.content, data).then(setPreviewText);
    }
  }, [data, template.content, onPreview]);

  return (
    <ModalShell title={`Preview: ${template.templateName}`} onClose={onClose} width="max-w-2xl">
      <div className="space-y-4">
        <div className="rounded-3xl bg-slate-50 p-6 border border-slate-100">
          <p className="whitespace-pre-wrap text-slate-800 leading-relaxed">{previewText}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold hover:bg-slate-50 transition" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
function StudentAnalytics({ studentId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/analytics/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          throw new Error("Failed to load analytics");
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [studentId]);

  if (loading) return <div className="py-12 text-center text-slate-500">Loading analytics...</div>;
  if (error) return <div className="py-12 text-center text-red-500">{error}</div>;
  if (!data || !data.summary) return <div className="py-12 text-center text-slate-500">No data available</div>;

  const { summary, growthTrend, subjectPerformance, batchComparison, insights } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overall Average</p>
          <p className="mt-2 text-3xl font-black text-[#1e3a8a]">{summary.overallAverage}%</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Improvement</p>
          <p className={`mt-2 text-3xl font-black ${summary.improvementPercentage > 0 ? "text-emerald-600" : summary.improvementPercentage < 0 ? "text-red-600" : "text-slate-700"}`}>
            {summary.improvementPercentage > 0 ? "+" : ""}{summary.improvementPercentage}%
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Rank</p>
          <p className="mt-2 text-3xl font-black text-slate-800">{summary.currentRank > 0 ? `#${summary.currentRank}` : "N/A"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tests Attempted</p>
          <p className="mt-2 text-3xl font-black text-slate-800">{summary.totalTestsAttempted}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h4 className="mb-4 text-lg font-bold text-slate-800">Growth Trend</h4>
          {growthTrend.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="testName" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Line type="monotone" dataKey="percentage" stroke="#1e3a8a" strokeWidth={3} dot={{ fill: "#1e3a8a", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Not enough data for trend.</p>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h4 className="mb-4 text-lg font-bold text-slate-800">Subject Performance</h4>
          {subjectPerformance.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="subject" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} cursor={{ fill: "#f1f5f9" }} />
                  <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No subject data available.</p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <h4 className="mb-4 text-lg font-bold text-slate-800">Student vs Batch Average</h4>
        {batchComparison.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={batchComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="subject" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} cursor={{ fill: "#f1f5f9" }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                <Bar dataKey="studentScore" name="Student Score" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="batchAvg" name="Batch Average" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No batch comparison data available.</p>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <h4 className="mb-4 text-lg font-bold text-slate-800 flex items-center gap-2"><BarChart3 size={20} className="text-[#1e3a8a]" /> Performance Insights</h4>
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="font-semibold text-emerald-700 mb-2">Strengths</p>
            <ul className="space-y-1 text-sm text-slate-600 list-disc pl-4">
              {insights.strengths.map((str, i) => <li key={i}>{str}</li>)}
              {insights.strengths.length === 0 && <li>No specific strengths identified yet.</li>}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-orange-600 mb-2">Needs Improvement</p>
            <ul className="space-y-1 text-sm text-slate-600 list-disc pl-4">
              {insights.needsImprovement.map((str, i) => <li key={i}>{str}</li>)}
              {insights.needsImprovement.length === 0 && <li>On track across all subjects.</li>}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-blue-700 mb-2">Achievements</p>
            <ul className="space-y-1 text-sm text-slate-600 list-disc pl-4">
              {insights.achievements.map((str, i) => <li key={i}>{str}</li>)}
              {insights.achievements.length === 0 && <li>Keep taking tests to unlock achievements!</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
