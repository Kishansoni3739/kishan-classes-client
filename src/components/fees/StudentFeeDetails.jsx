import { useState, useMemo } from "react";
import { date, money } from "../../utils/format.js";
import { 
  CheckCircle, AlertCircle, Clock, Calendar, Briefcase, 
  History, Activity, Printer, Download, User, Phone, 
  MapPin, X, FileText, ChevronRight
} from "lucide-react";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "../EmptyState.jsx";

const getFeeLabels = (fee, idx, isMonthly) => {
  const isOpeningBalance = fee.periodStart && fee.periodEnd && new Date(fee.periodStart).toDateString() === new Date(fee.periodEnd).toDateString();
  if (isMonthly) {
    if (isOpeningBalance) {
      return {
        label: "Opening",
        subLabel: `Opening Balance (${date(fee.periodStart)})`
      };
    }
    if (fee.periodStart && fee.periodEnd) {
      const startSplit = date(fee.periodStart).split(' ');
      const endSplit = date(fee.periodEnd).split(' ');
      const startMonth = startSplit[1] || "";
      const endMonth = endSplit[1] || "";
      return {
        label: `${startMonth}-${endMonth}`,
        subLabel: `${date(fee.periodStart)} - ${date(fee.periodEnd)}`
      };
    }
    return {
      label: `M${idx + 1}`,
      subLabel: date(fee.dueDate)
    };
  }
  return {
    label: `Installment ${idx + 1}`,
    subLabel: date(fee.dueDate)
  };
};

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <X size={20} />
        </button>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  </div>
);

const StatCard = ({ label, value, icon: Icon, gradient, textColor = "text-white" }) => (
  <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1.5 text-2xl font-bold text-ink">{value}</p>
      </div>
      <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${gradient} ${textColor} shadow-lg shadow-current/20`}>
        <Icon size={22} />
      </div>
    </div>
    <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${gradient} opacity-80`} />
  </div>
);

const SectionCard = ({ title, icon: Icon, children, headerRight }) => (
  <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col">
    <div className="border-b border-slate-100 px-5 py-4 flex justify-between items-center bg-slate-50/50">
      <h2 className="text-sm font-bold uppercase tracking-wider text-ink flex items-center gap-2">
        {Icon && <Icon size={16} className="text-brand" />}
        {title}
      </h2>
      {headerRight && <div>{headerRight}</div>}
    </div>
    <div className="flex-1 p-5">{children}</div>
  </div>
);

export const StudentFeeDetails = ({ student, fees, stats }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedFee, setSelectedFee] = useState(null);

  if (!stats || !student) return null;

  const isMonthly = true;
  const sortedFees = [...fees].sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));

  // Extract unique years from fees
  const years = useMemo(() => {
    const ySet = new Set();
    fees.forEach(f => {
      if (f.dueDate) ySet.add(new Date(f.dueDate).getFullYear().toString());
      if (f.periodStart) ySet.add(new Date(f.periodStart).getFullYear().toString());
    });
    const arr = Array.from(ySet).sort((a,b) => b.localeCompare(a));
    if (arr.length === 0) arr.push(new Date().getFullYear().toString());
    return arr;
  }, [fees]);

  // Filter fees for tiles
  const filteredFees = sortedFees.filter(f => {
    const y = f.periodStart ? new Date(f.periodStart).getFullYear().toString() : new Date(f.dueDate).getFullYear().toString();
    return y === selectedYear;
  });

  // Export functions
  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Payment Date,Tenure/Installment,Amount Paid,Mode,Reference No,Collected By\n";
    
    stats.allPayments.forEach(p => {
      const pDate = date(p.paidAt);
      const tenure = p.feePeriodStart && p.feePeriodEnd ? `${date(p.feePeriodStart)} - ${date(p.feePeriodEnd)}` : date(p.feeDueDate);
      const amount = p.amount;
      const method = p.method;
      const ref = p.receiptNo || "";
      const collectedBy = p.collectedBy?.name || "-";
      csvContent += `"${pDate}","${tenure}","${amount}","${method}","${ref}","${collectedBy}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fee_ledger_${student.studentId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart Data preparation
  const chartData = useMemo(() => {
    return sortedFees.map((f, idx) => {
      const netAmt = f.totalAmount - f.discount;
      const paidAmt = f.payments.reduce((s, p) => s + p.amount, 0);
      const pendingAmt = netAmt - paidAmt;
      const { label, subLabel } = getFeeLabels(f, idx, isMonthly);
        
      return {
        name: label,
        fullName: subLabel,
        feeAmount: netAmt,
        paid: paidAmt,
        pending: pendingAmt,
        paymentCount: f.payments.length
      };
    });
  }, [sortedFees, isMonthly]);

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      
      {/* HEADER SECTION */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
         <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-50 border border-slate-100 text-2xl font-bold text-brand">
                {student.user?.name?.charAt(0) || "S"}
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                  {student.user?.name}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {student.status}
                  </span>
                </h2>
                <div className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-4">
                  <span className="text-brand font-mono font-bold bg-brand/10 px-2 py-0.5 rounded">{student.studentId}</span>
                  <span className="flex items-center gap-1"><Phone size={14}/> {student.user?.phone || 'No phone'}</span>
                  {student.guardian?.name && <span className="flex items-center gap-1"><User size={14}/> Parent: {student.guardian.name}</span>}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 print:hidden">
              <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition-colors">
                <Printer size={16} /> Print Ledger
              </button>
              <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition-colors">
                <Download size={16} /> Export Excel
              </button>
            </div>
         </div>
         
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 mt-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Enrollment</p>
              <p className="text-sm font-semibold text-slate-700">Monthly Subscription</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subjects</p>
              <p className="text-sm font-semibold text-slate-700">
                 {student.subjects?.map(s => s.name).join(", ") || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Admission Date</p>
              <p className="text-sm font-semibold text-slate-700">{student.admissionDate ? date(student.admissionDate) : "-"}</p>
            </div>
            <div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Base Fee</p>
               <p className="text-sm font-semibold text-slate-700">{money(student.monthlyFee || 0)}</p>
            </div>
         </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
           <StatCard label="Total Fee" value={money(stats.totalFees)} icon={Briefcase} gradient="from-blue-500 to-indigo-600" />
        </div>
        <div>
           <StatCard label="Total Paid" value={money(stats.totalPaid)} icon={CheckCircle} gradient="from-emerald-500 to-teal-600" />
        </div>
        <div>
           <StatCard label="Total Pending" value={money(stats.totalDue)} icon={AlertCircle} gradient={stats.totalDue > 0 ? "from-amber-400 to-orange-500" : "from-slate-400 to-slate-500"} />
        </div>
        <div>
           <StatCard label="Overdue" value={money(stats.totalOverdue)} icon={Clock} gradient={stats.totalOverdue > 0 ? "from-rose-500 to-pink-600" : "from-slate-400 to-slate-500"} />
        </div>
        <div>
           <StatCard 
             label="Next Due Date" 
             value={stats.nextDueDate ? date(stats.nextDueDate) : "-"} 
             icon={Calendar} 
             gradient="from-violet-500 to-purple-600" 
           />
        </div>
        <div>
           <StatCard 
             label="Completed Tenures" 
             value={stats.paidTenures} 
             icon={CheckCircle} 
             gradient="from-emerald-400 to-teal-500" 
           />
        </div>
        <div>
           <StatCard 
             label="Pending Tenures" 
             value={stats.pendingTenures + stats.overdueTenures} 
             icon={Activity} 
             gradient="from-amber-400 to-orange-500" 
           />
        </div>
      </div>

      {/* TENURE TILES VIEW */}
      <SectionCard 
         title="Monthly Student Tenure Tracking" 
         icon={Calendar}
         headerRight={
           <select 
             value={selectedYear} 
             onChange={(e) => setSelectedYear(e.target.value)}
             className="text-sm font-medium border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:border-brand"
           >
             {years.map(y => <option key={y} value={y}>{y}</option>)}
           </select>
         }
      >
         <div className="flex overflow-x-auto gap-4 pb-4 kc-scrollbar">
            {filteredFees.length > 0 ? (
               filteredFees.map((fee, idx) => {
                  const netAmt = fee.totalAmount - fee.discount;
                  const paidAmt = fee.payments.reduce((s, p) => s + p.amount, 0);
                  const pendingAmt = netAmt - paidAmt;
                  
                  // Color Logic
                  let tileColor = "border-slate-200 bg-white";
                  let badgeColor = "bg-slate-100 text-slate-600";
                  let statusText = "Pending";

                  if (paidAmt >= netAmt) {
                    tileColor = "border-emerald-200 bg-emerald-50/30";
                    badgeColor = "bg-emerald-100 text-emerald-700";
                    statusText = "Paid";
                  } else if (paidAmt === 0) {
                    tileColor = "border-rose-200 bg-rose-50/30";
                    badgeColor = "bg-rose-100 text-rose-700";
                    statusText = "Unpaid";
                  } else {
                    tileColor = "border-amber-200 bg-amber-50/30";
                    badgeColor = "bg-amber-100 text-amber-700";
                    statusText = "Partially Paid";
                  }

                  const { label, subLabel } = getFeeLabels(fee, idx, isMonthly);

                  return (
                    <button 
                       key={fee._id} 
                       onClick={() => setSelectedFee({ fee, label, subLabel, statusText, badgeColor })}
                       className={`flex-none w-72 rounded-xl border ${tileColor} p-4 text-left transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2`}
                    >
                       <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold text-ink">{label}</p>
                            <p className="text-xs text-slate-500 font-medium">{subLabel}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                            {statusText}
                          </span>
                       </div>
                       
                       <div className="space-y-1.5 mt-4">
                          <div className="flex justify-between text-sm">
                             <span className="text-slate-500 font-medium">Fee:</span>
                             <span className="font-semibold text-slate-700">{money(netAmt)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                             <span className="text-slate-500 font-medium">Paid:</span>
                             <span className="font-semibold text-emerald-600">{money(paidAmt)}</span>
                          </div>
                          <div className="flex justify-between text-sm pt-1.5 border-t border-slate-200/50">
                             <span className="text-slate-500 font-medium">Pending:</span>
                             <span className={`font-semibold ${pendingAmt > 0 ? 'text-rose-600' : 'text-slate-700'}`}>{money(pendingAmt)}</span>
                          </div>
                       </div>
                    </button>
                  )
               })
            ) : (
               <div className="w-full py-8 text-center text-slate-500 text-sm">
                  No tenures found for {selectedYear}
               </div>
            )}
         </div>
      </SectionCard>

      {/* CHART & UPCOMING DUES */}
      <div className="grid gap-6 lg:grid-cols-3">
         <div className="lg:col-span-2">
            <SectionCard title="Tenure Payment Chart" icon={Activity}>
               <div className="h-[300px] w-full">
                  {chartData.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} dy={10} />
                           <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                           <Tooltip 
                              cursor={{fill: '#f8fafc'}}
                              content={({ active, payload }) => {
                                 if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                       <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-sm min-w-[200px]">
                                          <p className="font-bold text-ink mb-2 border-b border-slate-100 pb-2">Tenure: <br/><span className="text-slate-500 font-medium">{data.fullName}</span></p>
                                          <div className="flex justify-between mb-1"><span className="text-slate-500">Fee:</span> <span className="font-bold text-slate-700">{money(data.feeAmount)}</span></div>
                                          <div className="flex justify-between mb-1"><span className="text-slate-500">Paid:</span> <span className="font-bold text-emerald-600">{money(data.paid)}</span></div>
                                          <div className="flex justify-between mb-2"><span className="text-slate-500">Pending:</span> <span className={`font-bold ${data.pending > 0 ? 'text-rose-600' : 'text-slate-700'}`}>{money(data.pending)}</span></div>
                                          <div className="text-xs text-slate-400 pt-2 border-t border-slate-100 mt-2">Number of Payments: {data.paymentCount}</div>
                                       </div>
                                    );
                                 }
                                 return null;
                              }}
                           />
                           <Bar dataKey="paid" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={50} />
                           <Bar dataKey="pending" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                     </ResponsiveContainer>
                  ) : (
                     <EmptyState message="No chart data available" />
                  )}
               </div>
            </SectionCard>
         </div>

         <div className="space-y-6">
            <SectionCard title="Upcoming & Overdue" icon={AlertCircle}>
               <div className="space-y-3">
                  {sortedFees.filter(f => (f.totalAmount - f.discount) - f.payments.reduce((s,p)=>s+p.amount,0) > 0).length > 0 ? (
                     sortedFees.filter(f => (f.totalAmount - f.discount) - f.payments.reduce((s,p)=>s+p.amount,0) > 0).map((fee, idx) => {
                        const pending = (fee.totalAmount - fee.discount) - fee.payments.reduce((s, p) => s + p.amount, 0);
                        const dueObj = new Date(fee.dueDate);
                        const today = new Date();
                        const isOverdue = dueObj < today && dueObj.toDateString() !== today.toDateString();
                        const isDueToday = dueObj.toDateString() === today.toDateString();
                        
                        let tag = "Upcoming";
                        let tagColor = "bg-blue-100 text-blue-700";
                        if (isOverdue) { tag = "Overdue"; tagColor = "bg-rose-100 text-rose-700"; }
                        else if (isDueToday) { tag = "Due Today"; tagColor = "bg-amber-100 text-amber-700"; }

                        // calculate days remaining
                        const diffTime = dueObj - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const daysText = diffDays > 0 ? `${diffDays} days remaining` : (diffDays < 0 ? `${Math.abs(diffDays)} days late` : "Today");

                        return (
                           <div key={fee._id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col gap-2">
                              <div className="flex justify-between items-start">
                                 <div>
                                    <p className="font-semibold text-sm text-ink">
                                       {getFeeLabels(fee, idx, isMonthly).label}
                                    </p>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">{date(fee.dueDate)} • {daysText}</p>
                                 </div>
                                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${tagColor}`}>
                                    {tag}
                                 </span>
                              </div>
                              <div className="flex justify-between items-center mt-1">
                                 <span className="font-bold text-rose-600 text-sm">{money(pending)}</span>
                              </div>
                           </div>
                        )
                     })
                  ) : (
                     <div className="py-6 text-center">
                        <div className="inline-grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-500 mb-3">
                           <CheckCircle size={24}/>
                        </div>
                        <p className="text-sm font-medium text-slate-700">All caught up!</p>
                        <p className="text-xs text-slate-500 mt-1">No pending dues.</p>
                     </div>
                  )}
               </div>
            </SectionCard>
         </div>
      </div>

      {/* BOTTOM SECTION: UNIFIED LEDGER & TIMELINE */}
      <div className="grid gap-6 lg:grid-cols-3">
         <div className="lg:col-span-2">
            <SectionCard title="Payment History & Receipts" icon={History}>
               {stats.allPayments.length > 0 ? (
                  <div className="overflow-x-auto kc-scrollbar -mx-5 -mb-5">
                     <table className="min-w-full text-xs md:text-sm">
                     <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                        <tr>
                           <th className="px-5 py-3 font-semibold">Receipt No</th>
                           <th className="px-5 py-3 font-semibold">Payment Date</th>
                           <th className="px-5 py-3 font-semibold">Tenure</th>
                           <th className="px-5 py-3 font-semibold">Mode</th>
                           <th className="px-5 py-3 font-semibold text-right">Amount</th>
                           <th className="px-5 py-3 font-semibold text-center">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {stats.allPayments.map((p) => {
                           const tenureLabel = p.feePeriodStart && p.feePeriodEnd 
                              ? `${date(p.feePeriodStart)} to ${date(p.feePeriodEnd)}` 
                              : date(p.feeDueDate);
                           return (
                              <tr key={p._id} className="hover:bg-slate-50/50">
                                 <td className="px-5 py-3 text-slate-700 font-mono text-xs">{p.receiptNo || "-"}</td>
                                 <td className="px-5 py-3 font-medium text-ink whitespace-nowrap">{date(p.paidAt)}</td>
                                 <td className="px-5 py-3 text-slate-600 text-xs">{tenureLabel}</td>
                                 <td className="px-5 py-3">
                                    <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                                       {p.method}
                                    </span>
                                 </td>
                                 <td className="px-5 py-3 text-right font-bold text-emerald-600">{money(p.amount)}</td>
                                 <td className="px-5 py-3 text-center">
                                    <button className="text-brand hover:text-teal-800 text-xs font-semibold px-2 py-1 rounded bg-brand/5 hover:bg-brand/10 transition-colors">
                                       View Receipt
                                    </button>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                     </table>
                  </div>
               ) : (
                  <EmptyState message="No payments made yet" />
               )}
            </SectionCard>
         </div>

         <div>
            <SectionCard title="Activity Timeline" icon={Activity}>
               <div className="relative pl-4 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-slate-100">
                  {/* We generate timeline by merging admission + fees generation + payments */}
                  {(() => {
                     const events = [];
                     if (student.admissionDate) {
                        events.push({ date: new Date(student.admissionDate), type: 'admission', title: 'Student admitted', color: 'blue' });
                     }
                     fees.forEach(f => {
                        events.push({ 
                           date: new Date(f.createdAt || f.periodStart || f.dueDate), 
                           type: 'fee_gen', 
                           title: 'Tenure created', 
                           desc: f.periodStart && f.periodEnd ? `${date(f.periodStart)} - ${date(f.periodEnd)}` : date(f.dueDate),
                           color: 'slate' 
                        });
                        f.payments.forEach(p => {
                           events.push({
                              date: new Date(p.paidAt),
                              type: 'payment',
                              title: `${money(p.amount)} received`,
                              desc: `via ${p.method}`,
                              color: 'emerald'
                           });
                        });
                     });
                     
                     events.sort((a,b) => b.date - a.date);
                     
                     if (events.length === 0) return <EmptyState message="No events" />;
                     
                     return events.map((ev, i) => (
                        <div key={i} className="relative flex gap-4">
                           <div className={`absolute -left-5 grid h-6 w-6 place-items-center rounded-full ring-4 ring-white ${
                              ev.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                              ev.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                              'bg-slate-100 text-slate-500'
                           }`}>
                              {ev.type === 'payment' ? <CheckCircle size={14} /> :
                               ev.type === 'admission' ? <User size={14} /> :
                               <FileText size={14} />
                              }
                           </div>
                           <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-400 mb-0.5">{date(ev.date)}</span>
                              <span className={`text-sm font-semibold ${
                                 ev.color === 'emerald' ? 'text-emerald-600' : 'text-slate-700'
                              }`}>{ev.title}</span>
                              {ev.desc && <span className="text-xs text-slate-500 mt-0.5">{ev.desc}</span>}
                           </div>
                        </div>
                     ))
                  })()}
               </div>
            </SectionCard>
         </div>
      </div>

      {/* TILE CLICK DETAILS MODAL */}
      {selectedFee && (
        <Modal title="Tenure Details" onClose={() => setSelectedFee(null)}>
           <div className="space-y-6">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                 <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Tenure</p>
                    <p className="text-lg font-bold text-ink">{selectedFee.subLabel}</p>
                 </div>
                 <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${selectedFee.badgeColor}`}>
                   {selectedFee.statusText}
                 </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-6">
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fee Amount</p>
                    <p className="text-lg font-semibold text-slate-700">{money(selectedFee.fee.totalAmount - selectedFee.fee.discount)}</p>
                 </div>
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Paid Amount</p>
                    <p className="text-lg font-semibold text-emerald-600">{money(selectedFee.fee.payments.reduce((s,p)=>s+p.amount,0))}</p>
                 </div>
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Amount</p>
                    <p className="text-lg font-semibold text-rose-600">{money((selectedFee.fee.totalAmount - selectedFee.fee.discount) - selectedFee.fee.payments.reduce((s,p)=>s+p.amount,0))}</p>
                 </div>
              </div>

              <div>
                 <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">Payment Breakdown</h3>
                 {selectedFee.fee.payments.length > 0 ? (
                    <div className="space-y-3">
                       {selectedFee.fee.payments.map((p, i) => (
                          <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:border-brand transition-colors">
                             <div className="flex justify-between items-start mb-2">
                                <div>
                                   <p className="font-bold text-ink">{date(p.paidAt)}</p>
                                   <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                      <span className="uppercase font-semibold tracking-wider bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{p.method}</span>
                                      <span className="font-mono">{p.receiptNo || "No Receipt"}</span>
                                   </p>
                                </div>
                                <span className="font-bold text-emerald-600 text-lg">{money(p.amount)}</span>
                             </div>
                             <div className="text-xs text-slate-500 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span>Collected By: <span className="font-semibold text-slate-700">{p.collectedBy?.name || "Admin Name"}</span></span>
                                {p.note && <span className="italic">Note: {p.note}</span>}
                             </div>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg border border-slate-100 border-dashed">No payments received for this tenure yet.</p>
                 )}
              </div>
           </div>
        </Modal>
      )}

    </div>
  );
};
