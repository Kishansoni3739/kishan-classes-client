import React, { useState, useEffect, useMemo } from "react";
import { api } from "../api/http";
import { Search, User, Calendar, DollarSign, Award, BookOpen, Send, ShieldAlert, MessageCircle } from "lucide-react";
import { date, money } from "../utils/format";
import { WhatsAppPreviewModal } from "../components/WhatsAppPreviewModal.jsx";
import { generateWhatsAppMessage } from "../utils/whatsappHelper.js";
import { useAuth } from "../context/AuthContext.jsx";

export const NotificationsPanel = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [fees, setFees] = useState([]);
  const [results, setResults] = useState([]);
  const [tests, setTests] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [waModal, setWaModal] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stuRes, batRes, feeRes, resRes, testRes, tplRes] = await Promise.all([
        api.get("/students", { params: { limit: 1000 } }),
        api.get("/batches", { params: { limit: 1000 } }),
        api.get("/monthly-fees", { params: { limit: 2000 } }),
        api.get("/results", { params: { limit: 2000 } }),
        api.get("/tests", { params: { limit: 1000 } }),
        api.get("/whatsapp-templates")
      ]);

      setStudents(stuRes.data.items || []);
      setBatches(batRes.data.items || []);
      setFees(feeRes.data.items || []);
      setResults(resRes.data.items || []);
      setTests(testRes.data.items || []);
      setTemplates(tplRes.data.items || []);
    } catch (err) {
      console.error("Failed to load notifications panel data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.user?.name?.toLowerCase().includes(search.toLowerCase()) || 
                            s.studentId?.toLowerCase().includes(search.toLowerCase());
      const batchId = s.batch?._id || s.batch;
      const matchesBatch = !selectedBatch || batchId === selectedBatch;
      return matchesSearch && matchesBatch && s.status === "active";
    });
  }, [students, search, selectedBatch]);

  // Aggregate stats per student
  const studentStats = useMemo(() => {
    const statsMap = {};
    students.forEach(s => {
      // Dues
      const studentFees = fees.filter(f => (f.student?._id || f.student) === s._id);
      let totalDue = 0;
      let nextDueDate = null;
      let lastPayment = null;

      studentFees.forEach(f => {
        const activePayments = f.payments?.filter(p => !p.status || p.status === 'active') || [];
        const paid = activePayments.reduce((sum, p) => sum + p.amount, 0);
        const due = (f.totalAmount - (f.discount || 0)) - paid;
        if (due > 0) {
          totalDue += due;
          if (!nextDueDate || new Date(f.dueDate) < new Date(nextDueDate)) {
            nextDueDate = f.dueDate;
          }
        }
        activePayments.forEach(p => {
          if (!lastPayment || new Date(p.paidAt) > new Date(lastPayment.paidAt)) {
            lastPayment = { ...p, feePeriod: `${date(f.periodStart)} - ${date(f.periodEnd)}` };
          }
        });
      });

      // Latest Result
      const studentResults = results.filter(r => 
        (r.student?._id || r.student) === s._id && 
        (r.marksObtained !== undefined && r.marksObtained !== null || r.isAbsent)
      );
      let latestResult = null;
      studentResults.forEach(r => {
        const rDate = r.test?.testDate || r.createdAt;
        if (!latestResult || new Date(rDate) > new Date(latestResult.test?.testDate || latestResult.createdAt)) {
          latestResult = r;
        }
      });

      // Upcoming Test
      const batchId = s.batch?._id || s.batch;
      const upcomingTest = tests
        .filter(t => t.status === "scheduled" && (t.batch?._id || t.batch) === batchId)
        .sort((a, b) => new Date(a.testDate) - new Date(b.testDate))[0] || null;

      statsMap[s._id] = {
        totalDue,
        nextDueDate,
        lastPayment,
        latestResult,
        upcomingTest
      };
    });
    return statsMap;
  }, [students, fees, results, tests]);

  const handleSendNotification = (student, type) => {
    if (user?.role === "teacher" && !["test_scheduled", "marks", "progress"].includes(type)) {
      alert("Teachers are not authorized to send this type of notification.");
      return;
    }

    if (!student.guardian?.phone) {
      alert("Guardian phone number is missing.");
      return;
    }

    const stats = studentStats[student._id] || {};
    let templateName = "";
    let context = {
      student_name: student.user?.name || "",
      student_id: student.studentId || "",
      guardian_name: student.guardian?.name || "",
      coaching_name: "Kishan Classes"
    };

    switch (type) {
      case "admission":
        templateName = "Admission";
        context.course = student.batch?.name || "N/A";
        context.batch = student.batch?.name || "N/A";
        context.admission_date = student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : "";
        break;
      case "fee_due":
        templateName = "Fee Due Reminder";
        if (stats.totalDue <= 0) {
          alert("This student has no outstanding due amount.");
          return;
        }
        const studentFees = fees.filter(f => (f.student?._id || f.student) === student._id);
        const pendingFeesList = studentFees.map(f => {
          const activePayments = f.payments?.filter(p => !p.status || p.status === 'active') || [];
          const paid = activePayments.reduce((sum, p) => sum + p.amount, 0);
          const due = (f.totalAmount - (f.discount || 0)) - paid;
          if (due > 0) {
            const tenureStart = f.periodStart ? new Date(f.periodStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A";
            const tenureEnd = f.periodEnd ? new Date(f.periodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A";
            return `- Period: ${tenureStart} to ${tenureEnd} | Due: ₹${due}`;
          }
          return null;
        }).filter(Boolean);

        context.due_details = pendingFeesList.join("\n");
        context.due_amount = stats.totalDue;
        context.next_due_date = stats.nextDueDate ? new Date(stats.nextDueDate).toLocaleDateString() : "N/A";
        break;
      case "fee_receipt":
        templateName = "Fee Received";
        if (!stats.lastPayment) {
          alert("No past payment records found for this student.");
          return;
        }
        context.paid_amount = stats.lastPayment.amount;
        context.payment_date = new Date(stats.lastPayment.paidAt).toLocaleDateString();
        context.total_due = stats.totalDue;
        break;
      case "test_scheduled":
        templateName = "Test Scheduled";
        if (!stats.upcomingTest) {
          alert("No upcoming scheduled tests found for this student's batch.");
          return;
        }
        const ut = stats.upcomingTest;
        context.subject = ut.subject?.name || "";
        context.topic = ut.topic || "";
        context.test_date = new Date(ut.testDate).toLocaleDateString();
        context.test_time = new Date(ut.testDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        context.max_marks = ut.maxMarks;
        break;
      case "marks":
        templateName = "Marks Published";
        if (!stats.latestResult || ((stats.latestResult.marksObtained === undefined || stats.latestResult.marksObtained === null) && !stats.latestResult.isAbsent)) {
          alert("No uploaded test results found for this student.");
          return;
        }
        const lr = stats.latestResult;
        context.test_name = lr.test?.title || "";
        context.subject = lr.test?.subject?.name || lr.test?.subject || "";
        context.topic = lr.test?.topic || "";
        context.test_date = lr.test?.testDate ? new Date(lr.test.testDate).toLocaleDateString() : "";
        context.marks = lr.marksObtained;
        context.max_marks = lr.test?.maxMarks || "";
        context.percentage = lr.percentage != null ? (Number.isInteger(lr.percentage) ? lr.percentage : Number(lr.percentage).toFixed(2)) + "%" : "-";
        context.grade = lr.grade || "-";
        break;
      case "birthday":
        templateName = "Birthday Wish";
        break;
      case "progress":
        templateName = "Progress Report";
        const pResults = results.filter(r => 
          (r.student?._id || r.student) === student._id && 
          (r.marksObtained !== undefined && r.marksObtained !== null || r.isAbsent)
        );
        const pCompleted = pResults.filter(r => !r.isAbsent && r.percentage !== undefined);
        
        let overallAvg = 0;
        if (pCompleted.length > 0) {
          const sum = pCompleted.reduce((sum, val) => sum + val.percentage, 0);
          overallAvg = Math.round(sum / pCompleted.length);
        }
        
        // Subject-wise performance
        const pGroups = {};
        pResults.forEach(r => {
          if (r.isAbsent || r.percentage === undefined || !r.test?.subject?.name) return;
          const subName = r.test.subject.name;
          if (!pGroups[subName]) {
            pGroups[subName] = { total: 0, count: 0 };
          }
          pGroups[subName].total += r.percentage;
          pGroups[subName].count += 1;
        });

        const pSubjectPerformance = Object.entries(pGroups).map(([subName, g]) => {
          const subAvg = Math.round(g.total / g.count);
          return `- ${subName}: ${subAvg}% (${g.count} tests)`;
        }).join("\n") || "No subject-wise test records available.";

        // Feedback comments based on overall average
        let pFeedback = "";
        if (pResults.length === 0) {
          pFeedback = "No test records are available to generate progress insights yet.";
        } else if (overallAvg >= 90) {
          pFeedback = `${student.user?.name || "Student"} is exhibiting outstanding performance with exceptional understanding across subjects.`;
        } else if (overallAvg >= 75) {
          pFeedback = `${student.user?.name || "Student"} is progressing well. Consistent scores are seen, and minor focus in weaker subjects will yield peak results.`;
        } else if (overallAvg >= 50) {
          pFeedback = `${student.user?.name || "Student"} shows average progress. Reviewing errors in weaker areas is recommended to build confidence.`;
        } else {
          pFeedback = `${student.user?.name || "Student"} requires dedicated guidance and conceptual revision in basic fundamentals.`;
        }

        context.batch = student.batch?.name || "N/A";
        context.overall_average = String(overallAvg);
        context.subject_performance = pSubjectPerformance;
        context.feedback_comments = pFeedback;
        break;
      default:
        break;
    }

    const template = templates.find(t => t.name === templateName);
    if (!template) {
      alert(`Template "${templateName}" not found. Please create it in WA Templates.`);
      return;
    }

    setWaModal({
      isOpen: true,
      template,
      context,
      recipientPhone: student.guardian.phone,
      recipientName: student.guardian.name,
      title: `Send ${templateName}`
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">WhatsApp Notification Center</h1>
        <p className="text-sm text-slate-500">Centralized control panel to trigger templates for individual students</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by Student ID or Name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-sm"
          />
        </div>
        <select
          value={selectedBatch}
          onChange={e => setSelectedBatch(e.target.value)}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand focus:ring-1 focus:ring-brand outline-none bg-white"
        >
          <option value="">All Batches</option>
          {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading student profiles...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-md">
          <User className="mx-auto text-slate-300 mb-2" size={40} />
          <p className="text-sm text-slate-500">No active students found matching filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredStudents.map(student => {
            const stats = studentStats[student._id] || {};
            return (
              <div key={student._id} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  {/* Student Details Column */}
                  <div className="space-y-1.5 min-w-[250px]">
                    <h3 className="font-bold text-lg text-ink">{student.user?.name}</h3>
                    <p className="text-xs text-slate-400 font-semibold">{student.studentId} • Batch: {student.batch?.name || "-"}</p>
                    <div className="text-xs text-slate-600 space-y-1 pt-1.5">
                      <div className="flex items-center gap-1.5"><User size={13} className="text-slate-400"/> Guardian: <span className="font-medium">{student.guardian?.name || "N/A"}</span></div>
                      <div className="flex items-center gap-1.5"><Send size={13} className="text-slate-400"/> Guardian Phone: <span className="font-medium">{student.guardian?.phone || "N/A"}</span></div>
                    </div>
                  </div>

                  {/* Actions Hub */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">


                    {/* Fee Due */}
                    {user?.role !== "teacher" && (
                      <button
                        onClick={() => handleSendNotification(student, "fee_due")}
                        disabled={stats.totalDue <= 0}
                        className="flex flex-col items-center justify-center p-3 rounded-md border border-slate-100 hover:border-rose-300 bg-slate-50/50 hover:bg-rose-50/30 disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
                      >
                        <DollarSign size={18} className="text-slate-400 group-hover:text-rose-500 mb-1" />
                        <span className="text-xs font-semibold text-slate-700">Fee Due</span>
                        <span className="text-[9px] text-rose-600 font-bold mt-0.5">{stats.totalDue > 0 ? `₹${stats.totalDue}` : "No Dues"}</span>
                      </button>
                    )}

                    {/* Fee Receipt */}
                    {user?.role !== "teacher" && (
                      <button
                        onClick={() => handleSendNotification(student, "fee_receipt")}
                        disabled={!stats.lastPayment}
                        className="flex flex-col items-center justify-center p-3 rounded-md border border-slate-100 hover:border-emerald-300 bg-slate-50/50 hover:bg-emerald-50/30 disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
                      >
                        <DollarSign size={18} className="text-slate-400 group-hover:text-emerald-500 mb-1" />
                        <span className="text-xs font-semibold text-slate-700">Fee Receipt</span>
                        <span className="text-[9px] text-emerald-600 font-bold mt-0.5">{stats.lastPayment ? `Last: ₹${stats.lastPayment.amount}` : "No Payments"}</span>
                      </button>
                    )}

                    {/* Test Scheduled */}
                    <button
                      onClick={() => handleSendNotification(student, "test_scheduled")}
                      disabled={!stats.upcomingTest}
                      className="flex flex-col items-center justify-center p-3 rounded-md border border-slate-100 hover:border-brand/40 bg-slate-50/50 hover:bg-brand/5 disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
                    >
                      <Calendar size={18} className="text-slate-400 group-hover:text-brand mb-1" />
                      <span className="text-xs font-semibold text-slate-700">Test Reminder</span>
                      <span className="text-[9px] text-slate-400 mt-0.5 truncate max-w-full">{stats.upcomingTest ? date(stats.upcomingTest.testDate) : "No Upcoming"}</span>
                    </button>

                    {/* Marks */}
                    <button
                      onClick={() => handleSendNotification(student, "marks")}
                      disabled={!stats.latestResult}
                      className="flex flex-col items-center justify-center p-3 rounded-md border border-slate-100 hover:border-brand/40 bg-slate-50/50 hover:bg-brand/5 disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
                    >
                      <Award size={18} className="text-slate-400 group-hover:text-brand mb-1" />
                      <span className="text-xs font-semibold text-slate-700">Latest Marks</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">{stats.latestResult ? `${stats.latestResult.marksObtained}/${stats.latestResult.test?.maxMarks}` : "No Results"}</span>
                    </button>

                    {/* Progress Report */}
                    <button
                      onClick={() => handleSendNotification(student, "progress")}
                      className="flex flex-col items-center justify-center p-3 rounded-md border border-slate-100 hover:border-brand/40 bg-slate-50/50 hover:bg-brand/5 group transition-all"
                    >
                      <BookOpen size={18} className="text-slate-400 group-hover:text-brand mb-1" />
                      <span className="text-xs font-semibold text-slate-700">Progress Report</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">Send stats</span>
                    </button>

                    {/* Birthday Wish */}
                    {user?.role !== "teacher" && (
                      <button
                        onClick={() => handleSendNotification(student, "birthday")}
                        className="flex flex-col items-center justify-center p-3 rounded-md border border-slate-100 hover:border-brand/40 bg-slate-50/50 hover:bg-brand/5 group transition-all"
                      >
                        <Calendar size={18} className="text-slate-400 group-hover:text-brand mb-1" />
                        <span className="text-xs font-semibold text-slate-700">Birthday Wish</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">{student.birthDate ? date(student.birthDate) : "Wish parent"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {waModal && (
        <WhatsAppPreviewModal
          isOpen={waModal.isOpen}
          onClose={() => setWaModal(null)}
          title={waModal.title}
          generatedMessage={generateWhatsAppMessage(waModal.template, waModal.context)}
          recipientPhone={waModal.recipientPhone}
          recipientName={waModal.recipientName}
        />
      )}
    </div>
  );
};
