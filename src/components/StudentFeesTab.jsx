import React, { useState, useMemo, useEffect } from "react";
import { date, money } from "../utils/format.js";
import { api } from "../api/http.js";
import { WhatsAppPreviewModal } from "./WhatsAppPreviewModal.jsx";
import { generateWhatsAppMessage } from "../utils/whatsappHelper.js";
import { 
  AlertTriangle, 
  CheckCircle2, 
  CreditCard, 
  XCircle, 
  Clock, 
  Download, 
  Printer, 
  Calendar, 
  TrendingUp,
  X,
  Undo2
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const SectionCard = ({ title, icon: Icon, children, className = "" }) => (
  <div className={`overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col ${className}`}>
    <div className="border-b border-slate-100 px-5 py-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-ink flex items-center gap-2">
        {Icon && <Icon size={16} className="text-brand" />}
        {title}
      </h2>
    </div>
    <div className="flex-1 p-5">{children}</div>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
    <CreditCard size={48} className="text-slate-300 mb-4" />
    <p className="text-slate-500 font-medium">{message}</p>
  </div>
);

export const StudentFeesTab = ({ profile, onPaymentSuccess }) => {
  const { student, monthlyTenures = [] } = profile;
  const { user } = useAuth();
  
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [selectedTenure, setSelectedTenure] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reversal State
  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [paymentToReverse, setPaymentToReverse] = useState(null);
  const [reversalReason, setReversalReason] = useState("");

  // WhatsApp Message State
  const [templates, setTemplates] = useState([]);
  const [waModal, setWaModal] = useState(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data } = await api.get("/whatsapp-templates");
        setTemplates(data.items || []);
      } catch (e) {}
    };
    fetchTemplates();
  }, []);

  const tenures = [...monthlyTenures].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const allPayments = [];

  if (tenures.length === 0 && (!student.monthlyFee || student.monthlyFee === 0)) {
    return <EmptyState message="Not enrolled in any monthly program" />;
  }

  const effectiveMonthlyFee = student.monthlyFee || (tenures.length > 0 ? tenures[0].totalAmount : 0);

  // --- Calculations ---
  let totalDue = 0;
  let totalPaid = 0;
  let expectedTotal = 0;
  let overdueCount = 0;
  let partialCount = 0;
  let paidMonths = 0;
  
  let currentTenureDue = 0;
  let lastPaymentDate = null;
  let nextDueDate = null;

  tenures.forEach(t => {
    const activePayments = t.payments?.filter(p => !p.status || p.status === "active") || [];
    const paid = activePayments.reduce((sum, p) => sum + p.amount, 0);
    const due = (t.totalAmount - (t.discount || 0)) - paid;
    
    expectedTotal += (t.totalAmount - (t.discount || 0));
    totalDue += due;
    totalPaid += paid;

    if (t.status === "paid") paidMonths++;
    if (t.status === "partial") partialCount++;
    if (t.status === "overdue" || (due > 0 && new Date(t.dueDate) < new Date())) overdueCount++;

    if (due > 0 && !nextDueDate && new Date(t.dueDate) >= new Date(new Date().setHours(0,0,0,0))) {
      nextDueDate = t.dueDate;
    }

    t.payments?.forEach(p => {
      allPayments.push({
        ...p,
        tenure: t
      });
      if ((!p.status || p.status === "active") && (!lastPaymentDate || new Date(p.paidAt) > new Date(lastPaymentDate))) {
        lastPaymentDate = p.paidAt;
      }
    });
  });

  allPayments.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));

  const collectionRate = expectedTotal > 0 ? Math.round((totalPaid / expectedTotal) * 100) : 0;
  const pendingMonths = tenures.length - paidMonths;

  // --- Health Indicator ---
  let health = { label: "Excellent", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 };
  if (overdueCount > 2) {
    health = { label: "High Risk", color: "bg-rose-100 text-rose-800 border-rose-200", icon: XCircle };
  } else if (overdueCount > 0) {
    health = { label: "Needs Attention", color: "bg-orange-100 text-orange-800 border-orange-200", icon: AlertTriangle };
  } else if (partialCount > 0) {
    health = { label: "Good", color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle2 };
  }

  // --- Format Tenure Label ---
  const formatTenureLabel = (start, end) => {
    if (!start || !end) return "N/A";
    const sDate = new Date(start).toDateString();
    const eDate = new Date(end).toDateString();
    if (sDate === eDate) {
      const opts = { day: '2-digit', month: 'short', year: 'numeric' };
      return `Opening Balance (${new Date(start).toLocaleDateString('en-GB', opts)})`;
    }
    const opts = { day: '2-digit', month: 'short' };
    return `${new Date(start).toLocaleDateString('en-GB', opts)} - ${new Date(end).toLocaleDateString('en-GB', opts)}`;
  };

  // --- Handlers ---
  const handleCollectClick = (t) => {
    setSelectedTenure(t);
    const activePayments = t.payments?.filter(p => !p.status || p.status === "active") || [];
    const paid = activePayments.reduce((sum, p) => sum + p.amount, 0);
    const due = (t.totalAmount - (t.discount || 0)) - paid;
    setPayAmount(due);
    setCollectModalOpen(true);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!selectedTenure || !payAmount) return;
    
    setIsSubmitting(true);
    try {
      await api.post(`/monthly-fees/${selectedTenure._id}/collect`, {
        amount: Number(payAmount),
        method: payMethod
      });
      setCollectModalOpen(false);

      const feeReceivedTemplate = templates.find(t => t.name === "Fee Received") || {
        name: "Fee Received",
        messageBody: `Dear {{guardian_name}},\n\nReceived ₹{{paid_amount}}\n\nStudent:\n{{student_name}}\n\nPayment Date:\n{{payment_date}}\n\nRemaining Due:\n₹{{total_due}}\n\nThank you.`,
        variables: ["guardian_name", "paid_amount", "student_name", "payment_date", "total_due"]
      };

      const context = {
        guardian_name: student?.guardian?.name || "",
        paid_amount: String(payAmount),
        student_name: student?.user?.name || "",
        payment_date: date(new Date()),
        total_due: String(Math.max(0, totalDue - Number(payAmount)))
      };

      if (student?.guardian?.phone) {
        setWaModal({
          isOpen: true,
          template: feeReceivedTemplate,
          context,
          recipientPhone: student.guardian.phone,
          recipientName: student.guardian.name,
          title: `Send Fee Receipt via WhatsApp`
        });
      } else {
        alert("Payment collected successfully. No guardian phone number found to send WhatsApp message.");
        if (onPaymentSuccess) onPaymentSuccess();
      }
    } catch (err) {
      alert("Failed to collect fee: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReverseClick = (payment) => {
    setPaymentToReverse(payment);
    setReversalReason("");
    setReverseModalOpen(true);
  };

  const submitReversal = async (e) => {
    e.preventDefault();
    if (!paymentToReverse || !reversalReason.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post(`/monthly-fees/${paymentToReverse.tenure._id}/payments/${paymentToReverse._id}/reverse`, {
        reason: reversalReason
      });
      setReverseModalOpen(false);
      if (onPaymentSuccess) onPaymentSuccess(); // Refresh state
    } catch (err) {
      alert("Failed to reverse payment: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:bg-white print:m-0 print:p-0">
      
      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold uppercase tracking-wider ${health.color}`}>
          <health.icon size={16} />
          {health.label}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <Printer size={16} /> Print Statement
          </button>
        </div>
      </div>

      {/* Smart Alerts */}
      <div className="space-y-2 print:hidden">
        {overdueCount > 0 && (
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-sm font-medium">
            <AlertTriangle size={18} className="shrink-0" />
            Student has overdue fees for {overdueCount} tenure(s).
          </div>
        )}
        {partialCount > 0 && overdueCount === 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm font-medium">
            <Clock size={18} className="shrink-0" />
            Partial payment pending. Please collect remaining balance.
          </div>
        )}
        {nextDueDate && new Date(nextDueDate) <= new Date(Date.now() + 3 * 86400000) && new Date(nextDueDate) > new Date() && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm font-medium">
            <Calendar size={18} className="shrink-0" />
            Payment due in {Math.ceil((new Date(nextDueDate) - new Date()) / 86400000)} days.
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 print:hidden">
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly Fee</p>
          <p className="mt-1 text-lg font-bold text-ink">{money(effectiveMonthlyFee)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Paid</p>
          <p className="mt-1 text-lg font-bold text-emerald-600">{money(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Due</p>
          <p className="mt-1 text-lg font-bold text-rose-600">{money(totalDue)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Payment</p>
          <p className="mt-1 text-sm font-bold text-slate-700">{lastPaymentDate ? date(lastPaymentDate) : "N/A"}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next Due</p>
          <p className="mt-1 text-sm font-bold text-slate-700">{nextDueDate ? date(nextDueDate) : "None"}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 print:block">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Outstanding Dues Breakdown */}
          <SectionCard title="Outstanding Dues Breakdown" icon={AlertTriangle} className="border-slate-200 print:hidden">
            <div className="grid sm:grid-cols-2 gap-3">
              {tenures.map((t, index) => {
                const activePayments = t.payments?.filter(p => !p.status || p.status === "active") || [];
                const paid = activePayments.reduce((sum, p) => sum + p.amount, 0);
                const balance = (t.totalAmount - (t.discount || 0)) - paid;
                
                const isMostRecent = index === tenures.length - 1;
                let style = isMostRecent ? "bg-blue-50 border-blue-200 text-blue-900"
                          : t.status === "paid" ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                          : t.status === "partial" ? "bg-amber-50 border-amber-200 text-amber-900"
                          : t.status === "future" ? "bg-slate-50 border-slate-200 text-slate-700 opacity-80"
                          : "bg-rose-50 border-rose-200 text-rose-900";

                return (
                  <div key={t._id} className={`p-4 rounded-lg border ${style} relative overflow-hidden group`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-sm">{formatTenureLabel(t.periodStart, t.periodEnd)}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/60">{t.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="opacity-70">Fee:</span> <span className="font-medium">{money(t.totalAmount)}</span></div>
                      <div><span className="opacity-70">Paid:</span> <span className="font-medium">{money(paid)}</span></div>
                      {balance > 0 && <div className="col-span-2 font-bold mt-1"><span className="opacity-80">Balance:</span> {money(balance)}</div>}
                    </div>
                    {user?.role !== "student" && t.status !== "paid" && t.status !== "future" && (
                      <button onClick={() => handleCollectClick(t)} className="absolute inset-0 bg-black/50 text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm print:hidden">
                        Collect Fee
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {totalDue > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between font-bold text-lg text-rose-700">
                <span>Total Outstanding:</span>
                <span>{money(totalDue)}</span>
              </div>
            )}
          </SectionCard>

          {/* Fee History Table */}
          <SectionCard title="Fee History Table" icon={CreditCard}>
            <div className="-mx-5 -mb-5">
              
              {/* Mobile View: Cards */}
              <div className="block md:hidden border-t border-slate-100">
                {tenures.map((t, index) => {
                  const activePayments = t.payments?.filter(p => !p.status || p.status === "active") || [];
                  const paid = activePayments.reduce((sum, p) => sum + p.amount, 0);
                  const balance = (t.totalAmount - (t.discount || 0)) - paid;
                  const lastPayment = activePayments.length ? new Date(Math.max(...activePayments.map(p => new Date(p.paidAt)))) : null;
                  
                  const isMostRecent = index === tenures.length - 1;
                  const rowStyle = isMostRecent ? "bg-blue-50"
                                 : t.status === "paid" ? "bg-emerald-50"
                                 : t.status === "partial" ? "bg-amber-50"
                                 : t.status === "future" ? "bg-slate-50"
                                 : "bg-rose-50";
                  
                  const badgeStyle = isMostRecent ? "text-blue-800"
                                   : t.status === "paid" ? "text-emerald-800"
                                   : t.status === "partial" ? "text-amber-800"
                                   : t.status === "future" ? "text-slate-600"
                                   : "text-rose-800";

                  return (
                    <div key={t._id} className={`p-5 space-y-3 border-b hover:opacity-90 transition-opacity ${rowStyle}`}>
                      <div className="flex justify-between items-center border-b border-black/5 pb-2">
                        <span className="font-bold text-ink text-sm">{formatTenureLabel(t.periodStart, t.periodEnd)}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/60 shadow-sm ${badgeStyle}`}>
                          {t.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                        <div className="flex flex-col"><span className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5 text-[10px]">Fee</span> <span className="font-medium text-slate-700">{money(t.totalAmount)}</span></div>
                        <div className="flex flex-col"><span className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5 text-[10px]">Paid</span> <span className="font-medium text-emerald-600">{money(paid)}</span></div>
                        <div className="flex flex-col"><span className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5 text-[10px]">Balance</span> <span className="font-medium text-rose-600">{money(balance)}</span></div>
                        <div className="flex flex-col"><span className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5 text-[10px]">Last Paid</span> <span className="font-medium text-slate-700">{lastPayment ? date(lastPayment) : "-"}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50/80 text-left text-[11px] uppercase tracking-wider text-slate-500 border-y border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-bold">Tenure</th>
                      <th className="px-6 py-4 font-bold text-right">Fee</th>
                      <th className="px-6 py-4 font-bold text-right">Paid</th>
                      <th className="px-6 py-4 font-bold text-right">Balance</th>
                      <th className="px-6 py-4 font-bold text-center">Status</th>
                      <th className="px-6 py-4 font-bold">Last Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenures.map((t, index) => {
                      const activePayments = t.payments?.filter(p => !p.status || p.status === "active") || [];
                      const paid = activePayments.reduce((sum, p) => sum + p.amount, 0);
                      const balance = (t.totalAmount - (t.discount || 0)) - paid;
                      const lastPayment = activePayments.length ? new Date(Math.max(...activePayments.map(p => new Date(p.paidAt)))) : null;
                      
                      const isMostRecent = index === tenures.length - 1;
                      const rowStyle = isMostRecent ? "bg-blue-50/60 hover:bg-blue-50 border-blue-100"
                                     : t.status === "paid" ? "bg-emerald-50/60 hover:bg-emerald-50 border-emerald-100"
                                     : t.status === "partial" ? "bg-amber-50/60 hover:bg-amber-50 border-amber-100"
                                     : t.status === "future" ? "bg-slate-50/60 hover:bg-slate-50 border-slate-100"
                                     : "bg-rose-50/60 hover:bg-rose-50 border-rose-100";

                      const badgeStyle = isMostRecent ? "text-blue-800"
                                       : t.status === "paid" ? "text-emerald-800"
                                       : t.status === "partial" ? "text-amber-800"
                                       : t.status === "future" ? "text-slate-600"
                                       : "text-rose-800";
                      
                      return (
                        <tr key={t._id} className={`transition-colors group border-b ${rowStyle}`}>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-ink">{formatTenureLabel(t.periodStart, t.periodEnd)}</td>
                          <td className="px-6 py-4 text-right font-medium text-slate-600">{money(t.totalAmount)}</td>
                          <td className="px-6 py-4 text-right font-bold text-emerald-600">{money(paid)}</td>
                          <td className="px-6 py-4 text-right font-bold text-rose-600">{money(balance)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm bg-white/80 ${badgeStyle}`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-500">{lastPayment ? date(lastPayment) : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          </SectionCard>

        </div>

        {/* Right Column */}
        <div className="space-y-6 print:hidden">
          
          {/* Progress & Stats */}
          <SectionCard title="Fee Collection Progress" icon={TrendingUp}>
            <div className="flex flex-col items-center justify-center p-4">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                  <circle 
                    cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                    className="text-brand transition-all duration-1000 ease-out" 
                    strokeDasharray={`${2 * Math.PI * 40}`} 
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - collectionRate / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-ink">{collectionRate}%</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Collected</span>
                </div>
              </div>
              <div className="w-full space-y-3 mt-6">
                <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Paid Months</span>
                  <span className="font-bold text-ink">{paidMonths}</span>
                </div>
                <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Pending Months</span>
                  <span className="font-bold text-rose-600">{pendingMonths}</span>
                </div>
                <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Partial Months</span>
                  <span className="font-bold text-amber-600">{partialCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Expected</span>
                  <span className="font-bold text-ink">{money(expectedTotal)}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Recent Payments Timeline */}
          <SectionCard title="Recent Payments" icon={Clock}>
            {allPayments.length > 0 ? (
              <div className="space-y-4">
                {allPayments.slice(0, 10).map((p, idx) => (
                  <div key={idx} className="relative pl-6 pb-4 border-l-2 border-slate-100 last:border-0 last:pb-0 group">
                    {p.status === "reversed" ? (
                      <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 border-white bg-rose-500 shadow-sm" />
                    ) : (
                      <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                    )}
                    <div className="-mt-1">
                      <div className="flex justify-between items-start">
                        <span className={`font-bold ${p.status === "reversed" ? 'text-slate-400 line-through' : 'text-ink'}`}>{money(p.amount)}</span>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-slate-500">{date(p.paidAt)}</span>
                          {user?.role !== "student" && (!p.status || p.status === "active") && (
                            <button onClick={() => handleReverseClick(p)} className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] uppercase font-bold text-rose-600 hover:text-rose-700 print:hidden">
                              <Undo2 size={12} /> Reverse
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {p.status === "reversed" ? (
                        <div className="mt-1 bg-rose-50 border border-rose-100 p-2 rounded text-xs space-y-1">
                          <div className="font-bold text-rose-800 uppercase tracking-wider text-[10px]">Reversed</div>
                          <div className="text-rose-700"><span className="opacity-80">Reason:</span> {p.reversalReason}</div>
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-slate-500 space-y-0.5">
                          <div className="flex items-center gap-1"><CreditCard size={12}/> Mode: <span className="uppercase">{p.method}</span></div>
                          <div>Receipt: <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1 rounded">{p.receiptNo}</span></div>
                          <div>For: <span className="font-medium text-slate-700">{formatTenureLabel(p.tenure.periodStart, p.tenure.periodEnd)}</span></div>
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No payments made yet." />
            )}
          </SectionCard>

        </div>
      </div>

      {/* Collect Fee Modal */}
      {collectModalOpen && selectedTenure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-ink flex items-center gap-2"><CreditCard size={18} className="text-brand"/> Collect Fee</h3>
              <button onClick={() => setCollectModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={submitPayment} className="p-5 space-y-4">
              <div className="bg-brand/5 p-3 rounded-lg border border-brand/10">
                <div className="text-xs font-bold uppercase tracking-wider text-brand/70 mb-1">Tenure Details</div>
                <div className="font-medium text-brand">{formatTenureLabel(selectedTenure.periodStart, selectedTenure.periodEnd)}</div>
                <div className="flex justify-between text-sm mt-2 font-semibold">
                  <span className="text-slate-600">Total Due:</span>
                  <span className="text-rose-600">{money((selectedTenure.totalAmount - (selectedTenure.discount || 0)) - ((selectedTenure.payments?.filter(p => !p.status || p.status === "active") || []).reduce((sum, p) => sum + p.amount, 0)))}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Amount to Collect (₹)</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  max={(selectedTenure.totalAmount - (selectedTenure.discount || 0)) - ((selectedTenure.payments?.filter(p => !p.status || p.status === "active") || []).reduce((sum, p) => sum + p.amount, 0))}
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                />
                <p className="text-xs text-slate-400 mt-1">Cannot collect more than the outstanding balance.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Payment Method</label>
                <select 
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-brand focus:border-brand bg-white"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setCollectModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-md">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-bold text-white bg-brand hover:bg-brand/90 rounded-md shadow-sm disabled:opacity-50">
                  {isSubmitting ? "Processing..." : "Confirm Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reverse Payment Modal */}
      {reverseModalOpen && paymentToReverse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-rose-100 bg-rose-50">
              <h3 className="font-bold text-rose-800 flex items-center gap-2"><Undo2 size={18}/> Reverse Payment</h3>
              <button onClick={() => setReverseModalOpen(false)} className="text-rose-400 hover:text-rose-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={submitReversal} className="p-5 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm space-y-2">
                <p>Are you sure you want to reverse this payment?</p>
                <div className="font-semibold text-ink">Amount: <span className="text-rose-600">{money(paymentToReverse.amount)}</span></div>
                <div className="font-semibold text-ink">Payment Date: <span className="text-slate-600">{date(paymentToReverse.paidAt)}</span></div>
                <div className="font-semibold text-ink">Receipt: <span className="text-slate-600 font-mono text-xs">{paymentToReverse.receiptNo}</span></div>
                <p className="text-xs text-slate-500 pt-2">This action will restore the fee balance and permanently mark this payment record as reversed in the audit trail.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Reason for Reversal</label>
                <textarea 
                  required
                  placeholder="e.g. Entered wrong amount, assigned to wrong student..."
                  value={reversalReason}
                  onChange={e => setReversalReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-rose-500 h-24 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setReverseModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-md">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-sm disabled:opacity-50">
                  {isSubmitting ? "Processing..." : "Confirm Reversal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {waModal && (
        <WhatsAppPreviewModal
          isOpen={waModal.isOpen}
          onClose={() => {
            setWaModal(null);
            if (onPaymentSuccess) onPaymentSuccess();
          }}
          title={waModal.title}
          generatedMessage={generateWhatsAppMessage(waModal.template, waModal.context)}
          recipientPhone={waModal.recipientPhone}
          recipientName={waModal.recipientName}
        />
      )}

    </div>
  );
};
