import { Download, Eye, IndianRupee, Pencil, Plus, Search, Trash2, ClipboardEdit, Briefcase, ChevronDown, ChevronUp, Filter, MessageCircle } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { API_URL, api } from "../api/http.js";
import { EmptyState } from "../components/EmptyState.jsx";
import { Modal } from "../components/Modal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { resources } from "../data/resources.js";
import { date, display, money } from "../utils/format.js";
import { buildPayload, flattenInitial, getPath } from "../utils/objectPath.js";
import { WhatsAppPreviewModal } from "../components/WhatsAppPreviewModal.jsx";
import { WhatsAppBulkModal } from "../components/WhatsAppBulkModal.jsx";
import { generateWhatsAppMessage, getWhatsAppUrl } from "../utils/whatsappHelper.js";

export const ResourcePage = ({ resourceKey, embed = false }) => {
  const { user } = useAuth();
  
  let actualKey = resourceKey;
  if (resourceKey === "fees") {
    actualKey = "monthly-fees";
  }

  const config = useMemo(() => {
    const conf = { ...resources[actualKey] };
    if (user && user.role === "teacher" && actualKey === "students" && conf.columns) {
      conf.columns = conf.columns.filter(c => c[0] !== "monthlyFee");
      if (conf.fields) {
        conf.fields = conf.fields.filter(f => f.name !== "monthlyFee");
      }
    }
    return conf;
  }, [actualKey, user]);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [lookups, setLookups] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [collecting, setCollecting] = useState(null);
  const [enteringMarks, setEnteringMarks] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [waModal, setWaModal] = useState(null);
  const [waBulkModal, setWaBulkModal] = useState(null);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    api.get("/whatsapp-templates").then(res => setTemplates(res.data.items || [])).catch(() => {});
  }, []);

  const groupedItems = useMemo(() => {
    if (actualKey !== "monthly-fees" && actualKey !== "results") return items;
    const map = new Map();
    items.forEach(item => {
      const studentId = item.student?._id || item.student;
      if (!map.has(studentId)) {
        if (actualKey === "monthly-fees") {
          map.set(studentId, {
            _id: studentId,
            isGroup: true,
            studentName: item.student?.user?.name || item.studentName || "Unknown",
            batchName: item.student?.batch?.name || item.enrollment?.batch?.name || "-",
            totalPaid: 0,
            totalDue: 0,
            fees: []
          });
        } else if (actualKey === "results") {
          map.set(studentId, {
            _id: studentId,
            isGroup: true,
            studentName: item.student?.user?.name || item.studentName || "Unknown",
            batchName: item.student?.batch?.name || "-",
            results: []
          });
        }
      }
      const group = map.get(studentId);
      if (actualKey === "monthly-fees") {
        const paid = (item.payments || []).filter(p => !p.status || p.status === 'active').reduce((sum, p) => sum + p.amount, 0);
        const balance = (item.totalAmount - (item.discount || 0)) - paid;
        item.balance = balance;
        group.fees.push(item);
        group.totalPaid += paid;
        group.totalDue += balance;
      } else if (actualKey === "results") {
        group.results.push(item);
      }
    });
    return Array.from(map.values()).filter(group => group.studentName !== "Unknown");
  }, [items, actualKey]);

  if (!config || !config.roles.includes(user.role)) return <Navigate to="/" replace />;

  const canCreate = config.createRoles.includes(user.role);
  const canEdit = canCreate;

  const hasMutationPermission = (item) => {
    if (user.role === "admin") return true;
    if (user.role === "teacher") {
      const creatorId = item.createdBy?._id || item.createdBy || item.uploadedBy?._id || item.uploadedBy || "";
      const userId = user.id || user._id;
      if (!creatorId || !userId) return false;
      return creatorId.toString() === userId.toString();
    }
    return false;
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(config.endpoint, { params: { search, limit: 1000, ...filters } });
      setItems(data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedItem(null);
    setSelectedItems([]);
    setFilters({});
    setSearch("");
    setShowFilters(false);
    fetchData();
  }, [actualKey]);

  useEffect(() => {
    const fieldSources = (config.fields || []).filter((field) => field.source).map((field) => field.source);
    const filterSources = (config.filters || []).filter((f) => f.type === 'api').map((f) => f.endpoint);
    const sources = [...new Set([...fieldSources, ...filterSources])];
    
    Promise.all(sources.map((source) => api.get(source).then(({ data }) => [source, data.items || []]).catch(() => [source, []])))
      .then((entries) => setLookups(Object.fromEntries(entries)))
      .catch(() => setLookups({}));
  }, [actualKey]);

  const submitSearch = (event) => {
    event.preventDefault();
    fetchData();
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete ${config.title.slice(0, -1)} record?`)) return;
    await api.delete(`${config.endpoint}/${item._id}`);
    fetchData();
  };

  const removeMultiple = async () => {
    if (!window.confirm(`Delete ${selectedItems.length} selected ${config.title.toLowerCase()}?`)) return;
    try {
      await api.post(`${config.endpoint}/bulk-delete`, { ids: selectedItems });
      setSelectedItems([]);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Could not delete records");
    }
  };

  const handleSendNotification = (item) => {
    // Fee Due Reminder
    if (actualKey === "monthly-fees") {
      const template = templates.find(t => t.name === "Fee Due Reminder");
      if (!template) { alert("Fee Due Reminder template not found. Create it in WA Templates."); return; }
      const student = item.student;
      if (!student?.guardian?.phone) { alert("Guardian phone number is missing."); return; }
      const activePayments = item.payments?.filter(p => !p.status || p.status === 'active') || [];
      const paid = activePayments.reduce((sum, p) => sum + p.amount, 0);
      const dueAmount = (item.totalAmount - (item.discount || 0)) - paid;
      const tenureStart = item.periodStart ? new Date(item.periodStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A";
      const tenureEnd = item.periodEnd ? new Date(item.periodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A";
      const dueDetails = `- Period: ${tenureStart} to ${tenureEnd} | Due: ₹${dueAmount > 0 ? dueAmount : 0}`;
      const context = {
        guardian_name: student.guardian?.name || "",
        student_name: student.user?.name || "",
        due_details: dueDetails,
        due_amount: dueAmount > 0 ? dueAmount : 0,
        next_due_date: item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "N/A"
      };
      const message = generateWhatsAppMessage(template, context);
      const url = getWhatsAppUrl(student.guardian.phone, message);
      if (url) window.open(url, "_blank");
      else alert("Invalid phone number");
    }
    // Marks Published
    if (actualKey === "results") {
      const template = templates.find(t => t.name === "Marks Published");
      if (!template) { alert("Marks Published template not found. Create it in WA Templates."); return; }
      const student = item.student;
      if (!student?.guardian?.phone) { alert("Guardian phone number is missing."); return; }
      if ((item.marksObtained === undefined || item.marksObtained === null) && !item.isAbsent) {
        alert("Marks have not been uploaded for this result yet.");
        return;
      }
      const context = {
        guardian_name: student.guardian?.name || "",
        student_name: student.user?.name || "",
        test_name: item.test?.title || "",
        subject: item.test?.subject?.name || item.test?.subject || "",
        topic: item.test?.topic || "",
        test_date: item.test?.testDate ? new Date(item.test.testDate).toLocaleDateString() : "",
        marks: item.marksObtained,
        max_marks: item.test?.maxMarks || "",
        percentage: item.percentage != null ? (Number.isInteger(item.percentage) ? item.percentage : Number(item.percentage).toFixed(2)) + "%" : "-",
        grade: item.grade || "-"
      };
      const message = generateWhatsAppMessage(template, context);
      const url = getWhatsAppUrl(student.guardian.phone, message);
      if (url) window.open(url, "_blank");
      else alert("Invalid phone number");
    }
  };

  const handlePostSaveAction = async (savedRecord, isNew, actionType = null, extraContext = null) => {
    if (actualKey === "students" && isNew) {
      const template = templates.find(t => t.name === "Admission");
      if (template && savedRecord.guardian?.phone) {
        const context = {
          student_name: savedRecord.user?.name || values?.name,
          student_id: savedRecord.studentId,
          course: savedRecord.batch?.name || "N/A",
          batch: savedRecord.batch?.name || "N/A",
          admission_date: new Date(savedRecord.admissionDate).toLocaleDateString(),
          guardian_name: savedRecord.guardian?.name || "",
          coaching_name: "Kishan Classes"
        };
        setWaModal({
          isOpen: true,
          template,
          context,
          recipientPhone: savedRecord.guardian?.phone,
          recipientName: savedRecord.guardian?.name,
          title: "Notify Guardian (Admission)"
        });
      }
    } else if (actualKey === "notices" && savedRecord.notifyThroughWhatsApp) {
      const template = templates.find(t => t.name === "General Notice") || {
        name: "General Notice",
        messageBody: `Notice: {{notice_message}}`,
        variables: ["notice_message"]
      };
      if (template) {
        try {
          let recipients = [];
          
          if (["all", "students", "batch", "student"].includes(savedRecord.audience)) {
            const res = await api.get("/students", { params: { limit: 1000 } });
            let targetStudents = res.data.items.filter(s => s.status === 'active');
            
            if (savedRecord.audience === "batch" && savedRecord.batch) {
              const batchId = savedRecord.batch._id || savedRecord.batch;
              targetStudents = targetStudents.filter(s => s.batch === batchId || s.batch?._id === batchId);
            } else if (savedRecord.audience === "student" && savedRecord.student) {
              const studentId = savedRecord.student._id || savedRecord.student;
              targetStudents = targetStudents.filter(s => s._id === studentId);
            }
            
            targetStudents.forEach(s => {
              if (s.guardian?.phone) {
                recipients.push({
                  name: s.guardian?.name || s.user?.name,
                  phone: s.guardian?.phone,
                  message: generateWhatsAppMessage(template, { notice_message: savedRecord.message })
                });
              }
            });
          }

          if (["all", "teachers", "teacher"].includes(savedRecord.audience)) {
            const res = await api.get("/teachers", { params: { limit: 1000 } });
            let targetTeachers = res.data.items;
            
            if (savedRecord.audience === "teacher" && savedRecord.teacher) {
              const teacherId = savedRecord.teacher._id || savedRecord.teacher;
              targetTeachers = targetTeachers.filter(t => t._id === teacherId);
            }

            targetTeachers.forEach(t => {
              const phone = t.user?.phone;
              if (phone) {
                recipients.push({
                  name: t.user?.name,
                  phone: phone,
                  message: generateWhatsAppMessage(template, { notice_message: savedRecord.message })
                });
              }
            });
          }
          
          if (recipients.length > 0) {
            setWaBulkModal({
              isOpen: true,
              title: `Notify Notice (${savedRecord.title})`,
              recipients
            });
          }
        } catch (err) {}
      }
    } else if (actionType === "collect_fee") {
      const template = templates.find(t => t.name === "Fee Received") || {
        name: "Fee Received",
        messageBody: `Dear {{guardian_name}},\n\nReceived ₹{{paid_amount}}\n\nStudent:\n{{student_name}}\n\nPayment Date:\n{{payment_date}}\n\nRemaining Due:\n₹{{total_due}}\n\nThank you.`,
        variables: ["guardian_name", "paid_amount", "student_name", "payment_date", "total_due"]
      };
      if (extraContext?.student?.guardian?.phone) {
        const student = extraContext.student;
        const paidAmount = savedRecord.amount;
        
        // Calculate overall outstanding dues across all of this student's tenures
        const studentId = student._id || student;
        let overallRemainingDue = 0;
        items.forEach(item => {
          const itemStudentId = item.student?._id || item.student;
          if (itemStudentId === studentId) {
            const paid = (item.payments || []).filter(p => !p.status || p.status === 'active').reduce((sum, p) => sum + p.amount, 0);
            const balance = (item.totalAmount - (item.discount || 0)) - paid;
            if (item._id === extraContext._id) {
              overallRemainingDue += Math.max(0, balance - paidAmount);
            } else {
              overallRemainingDue += balance;
            }
          }
        });

        const context = {
          guardian_name: student.guardian.name || "",
          paid_amount: String(paidAmount),
          student_name: student.user?.name || "",
          payment_date: date(savedRecord.paidAt || new Date()),
          total_due: String(overallRemainingDue > 0 ? overallRemainingDue : 0)
        };
        setWaModal({
          isOpen: true,
          template,
          context,
          recipientPhone: student.guardian.phone,
          recipientName: student.guardian.name,
          title: "Send Fee Receipt"
        });
      }
    } else if (actionType === "enter_marks") {
      const template = templates.find(t => t.name === "Marks Published");
      if (template) {
        const test = extraContext;
        // In a real scenario, we'd fetch the results we just saved. For simplicity in bulk, we just need the student list
        // and we could trigger the modal. But wait, "Enter marks" updates multiple students.
        // Let's implement that separately or prompt admin if they want to notify all.
        if (window.confirm("Marks saved. Do you want to notify guardians via WhatsApp?")) {
           try {
             const resultsRes = await api.get("/results", { params: { test: test._id, limit: 1000 } });
             const results = resultsRes.data.items || [];
             
             const recipients = results.map(r => {
               if (!r.student?.guardian?.phone) return null;
               if ((r.marksObtained === undefined || r.marksObtained === null) && !r.isAbsent) return null;
               return {
                 name: r.student.guardian.name,
                 phone: r.student.guardian.phone,
                 message: generateWhatsAppMessage(template, {
                    guardian_name: r.student.guardian.name,
                    student_name: r.student.user?.name,
                    test_name: test.title || "",
                    subject: test.subject?.name || test.subject || "",
                    topic: test.topic || "",
                    test_date: test.testDate ? new Date(test.testDate).toLocaleDateString() : "",
                    marks: r.marksObtained,
                    max_marks: test.maxMarks,
                    percentage: ((r.marksObtained / test.maxMarks) * 100).toFixed(2) + "%",
                    grade: r.grade || "-"
                 })
               };
             }).filter(Boolean);
             
             if (recipients.length > 0) {
               setWaBulkModal({
                 isOpen: true,
                 title: "Notify Marks Published",
                 recipients
               });
             }
           } catch(e) {}
        }
      }
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        {!embed && (
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-ink">{config.title}</h1>
            <p className="mt-1 text-xs md:text-sm text-slate-500">Search, review, and manage {config.title.toLowerCase()}.</p>
          </div>
        )}
        {canCreate && (
          <div className={`flex flex-col sm:flex-row gap-2 w-full md:w-auto ${embed ? 'ml-auto' : ''}`}>
            {config.bulkDelete && selectedItems.length > 0 && (
              <button className="inline-flex h-11 md:h-10 w-full md:w-auto items-center justify-center gap-2 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700" onClick={removeMultiple}>
                <Trash2 size={17} />
                Delete Selected ({selectedItems.length})
              </button>
            )}
            <button className="inline-flex h-11 md:h-10 w-full md:w-auto items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-teal-800" onClick={() => setEditing({})}>
              <Plus size={17} />
              Add
            </button>
          </div>
        )}
      </div>

      <form onSubmit={submitSearch} className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-2">
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <div className="relative flex-1 w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              className="h-11 md:h-10 w-full rounded-md border border-transparent pl-9 pr-3 text-base md:text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${config.title.toLowerCase()}`}
            />
          </div>
          {config.filters && config.filters.length > 0 && (
            <button type="button" onClick={() => setShowFilters(!showFilters)} className={`h-11 md:h-10 px-4 text-sm font-medium rounded-md border flex items-center justify-center gap-2 transition-colors shrink-0 ${showFilters || Object.values(filters).some(Boolean) ? 'bg-brand/5 border-brand/20 text-brand' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
               <Filter size={16} /> Filters
            </button>
          )}
          <button className="h-11 md:h-10 w-full sm:w-auto shrink-0 rounded-md bg-slate-900 px-6 text-sm font-semibold text-white hover:bg-slate-800">Search</button>
        </div>
        
        {showFilters && config.filters && config.filters.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 mt-1 border-t border-slate-100 bg-slate-50/30 rounded-b-md">
            {config.filters.map(filter => (
              <div key={filter.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{filter.label}</label>
                <select 
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  value={filters[filter.key] || ""}
                  onChange={(e) => {
                     const newFilters = { ...filters, [filter.key]: e.target.value };
                     if (!e.target.value) delete newFilters[filter.key];
                     setFilters(newFilters);
                  }}
                >
                  <option value="">All</option>
                  {filter.type === 'api' 
                    ? (lookups[filter.endpoint] || []).map(opt => <option key={opt[filter.valueKey]} value={opt[filter.valueKey]}>{opt[filter.labelKey]}</option>)
                    : filter.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)
                  }
                </select>
              </div>
            ))}
          </div>
        )}
      </form>

      {error && <EmptyState title="Could not load records" message={error} />}
      {!error && loading && <div className="text-sm text-slate-500">Loading {config.title.toLowerCase()}...</div>}
      {!error && !loading && items.length === 0 && <EmptyState />}
      {!error && !loading && items.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          <div className="flex-1 overflow-hidden rounded-md border border-slate-200 bg-white w-full">
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden border-t border-slate-100">
                {groupedItems.map((item) => {
                  if (item.isGroup) {
                    const isExpanded = expandedGroup === item._id;
                    return (
                      <div key={item._id} className="bg-white border-b border-slate-100">
                        {/* Parent Card */}
                        <div 
                          className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${isExpanded ? 'bg-slate-50' : ''}`}
                          onClick={() => setExpandedGroup(isExpanded ? null : item._id)}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-ink text-sm">{item.studentName}</span>
                            {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                          </div>
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="text-slate-500">Batch: <span className="font-medium text-slate-700">{item.batchName}</span></span>
                            {actualKey === "monthly-fees" && (
                              <div className="flex justify-between mt-1 pt-2 border-t border-slate-100">
                                <span className="text-emerald-600 font-medium">Paid: {money(item.totalPaid)}</span>
                                <span className="text-rose-600 font-medium">Due: {money(item.totalDue)}</span>
                              </div>
                            )}
                            {actualKey === "results" && (
                              <div className="flex justify-between mt-1 pt-2 border-t border-slate-100">
                                <span className="text-slate-600 font-medium">{item.results.length} tests taken</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Expanded Children Cards */}
                        {isExpanded && (
                          <div className="bg-slate-50/50 p-2 border-t border-slate-100 flex flex-col gap-2">
                            {actualKey === "monthly-fees" && item.fees.map((fee, index) => {
                              const isMostRecent = index === item.fees.length - 1;
                              const rowStyle = isMostRecent ? "bg-blue-100/80 border-blue-200"
                                       : fee.status === "paid" ? "bg-emerald-100/80 border-emerald-200"
                                       : fee.status === "partial" ? "bg-amber-100/80 border-amber-200"
                                       : fee.status === "future" ? "bg-slate-100/80 border-slate-200"
                                       : "bg-rose-100/80 border-rose-200";
                              return (
                                <div key={fee._id} className={`p-3 rounded border ${rowStyle}`} onClick={() => setSelectedItem(fee)}>
                                  <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-xs mb-2">
                                    <div className="flex flex-col">
                                      <span className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5 text-[10px]">Period Start</span>
                                      <span className="font-medium text-slate-700">{date(fee.periodStart)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5 text-[10px]">Period End</span>
                                      <span className="font-medium text-slate-700">{date(fee.periodEnd)}</span>
                                    </div>
                                    <div className="flex flex-col mt-1">
                                      <span className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5 text-[10px]">Total</span>
                                      <span className="font-medium text-slate-700">{money(fee.status === 'partial' ? fee.balance : fee.totalAmount)}</span>
                                    </div>
                                    <div className="flex flex-col mt-1">
                                      <span className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5 text-[10px]">Status</span>
                                      <span className="font-medium"><Cell value={fee.status} label="Status" /></span>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2 pt-2 border-t border-black/5" onClick={e => e.stopPropagation()}>
                                    {user.role !== "student" && fee.status !== "paid" && (
                                      <IconButton label="Collect fee" onClick={() => setCollecting(fee)}>
                                        <IndianRupee size={16} />
                                      </IconButton>
                                    )}
                                    {user.role !== "student" && fee.status !== "paid" && fee.student?.guardian?.phone && (
                                      <button title="Send Fee Reminder" onClick={() => handleSendNotification(fee)} className="grid h-9 w-9 place-items-center rounded-md border border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors">
                                        <MessageCircle size={16} />
                                      </button>
                                    )}
                                    <IconButton label="View Ledger" onClick={() => navigate(`/students/${fee.student._id || fee.student}`)}>
                                      <Briefcase size={16} />
                                    </IconButton>
                                  </div>
                                </div>
                              );
                            })}
                            {actualKey === "results" && item.results.map((result) => {
                              return (
                                <div key={result._id} className="p-3 rounded border bg-white border-slate-200" onClick={() => setSelectedItem(result)}>
                                  <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-xs mb-2">
                                    <div className="flex flex-col">
                                      <span className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5 text-[10px]">Test</span>
                                      <span className="font-medium text-slate-700">{result.test?.title}</span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5 text-[10px]">Date</span>
                                      <span className="font-medium text-slate-700">{date(result.test?.testDate)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5 text-[10px]">Marks</span>
                                      <span className="font-medium text-slate-700">{result.marksObtained} / {result.test?.maxMarks}</span>
                                    </div>
                                    <div className="flex flex-col mt-1">
                                      <span className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5 text-[10px]">Percentage</span>
                                      <span className="font-medium text-slate-700">{result.percentage != null ? result.percentage.toFixed(1) + "%" : "-"}</span>
                                    </div>
                                    <div className="flex flex-col mt-1">
                                      <span className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5 text-[10px]">Grade</span>
                                      <span className="font-medium text-slate-700">{result.grade || "-"}</span>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2 pt-2 border-t border-black/5" onClick={e => e.stopPropagation()}>
                                    {user.role !== "student" && result.student?.guardian?.phone && (result.marksObtained !== undefined && result.marksObtained !== null || result.isAbsent) && (
                                      <button title="Send Marks Notification" onClick={() => handleSendNotification(result)} className="grid h-9 w-9 place-items-center rounded-md border border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors">
                                        <MessageCircle size={16} />
                                      </button>
                                    )}
                                    {canEdit && (
                                      <IconButton label="Edit" onClick={() => setEditing(result)}>
                                        <Pencil size={16} />
                                      </IconButton>
                                    )}
                                    {canEdit && (
                                      <IconButton label="Delete" onClick={() => remove(result)}>
                                        <Trash2 size={16} />
                                      </IconButton>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  let rowStyle = "bg-white hover:bg-slate-50";
                  
                  const mainCol = config.columns[0];
                  const mainVal = getPath(item, mainCol[0]);
                  
                  return (
                    <div 
                      key={item._id} 
                      className={`p-4 border-b space-y-3 cursor-pointer transition-colors ${selectedItem?._id === item._id ? 'bg-slate-100' : rowStyle}`} 
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-black/5">
                        <span className="font-bold text-ink text-sm"><Cell value={mainVal} label={mainCol[1]} /></span>
                        {config.bulkDelete && canEdit && (
                          <div onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={selectedItems.includes(item._id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedItems(prev => [...prev, item._id]);
                                else setSelectedItems(prev => prev.filter(id => id !== item._id));
                              }}
                              className="rounded border-slate-300 text-brand focus:ring-brand"
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                        {config.columns.slice(1).map(([path, label]) => (
                          <div key={path} className="flex flex-col">
                            <span className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5 text-[10px]">{label}</span>
                            <span className="font-medium text-slate-700"><Cell value={getPath(item, path)} label={label} /></span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t border-black/5" onClick={(e) => e.stopPropagation()}>
                        {actualKey === "tests" && (user.role === "admin" || user.role === "teacher") && (
                          <IconButton label="Enter marks" onClick={() => setEnteringMarks(item)}>
                            <ClipboardEdit size={16} />
                          </IconButton>
                        )}
                        {(actualKey === "students" || actualKey === "teachers") && (
                          <IconButton label="View profile" onClick={() => navigate(`/${actualKey}/${item.student?._id || item._id}`)}>
                            <Eye size={16} />
                          </IconButton>
                        )}
                        {actualKey === "study-materials" && item.fileUrl && (
                          <IconButton label="Download" onClick={() => window.open(toFileUrl(item.fileUrl), "_blank")}>
                            <Download size={16} />
                          </IconButton>
                        )}
                        {canEdit && hasMutationPermission(item) && (
                          <IconButton label="Edit" onClick={() => setEditing(item)}>
                            <Pencil size={16} />
                          </IconButton>
                        )}
                        {canEdit && hasMutationPermission(item) && (
                          <IconButton label="Delete" onClick={() => remove(item)}>
                            <Trash2 size={16} />
                          </IconButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto kc-scrollbar">
                <table className="min-w-full divide-y divide-slate-200 text-xs md:text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      {config.bulkDelete && canEdit && (
                        <th className="w-12 px-4 py-3">
                          <input 
                            type="checkbox" 
                            checked={items.length > 0 && selectedItems.length === items.length}
                            onChange={(e) => setSelectedItems(e.target.checked ? items.map(i => i._id) : [])}
                            className="rounded border-slate-300 text-brand focus:ring-brand"
                          />
                        </th>
                      )}
                      {config.columns.map(([, label]) => (
                        <th key={label} className="whitespace-nowrap px-4 py-3 font-semibold">
                          {label}
                        </th>
                      ))}
                      <th className="w-36 px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedItems.map((item) => {
                    if (item.isGroup) {
                      const isExpanded = expandedGroup === item._id;
                      return (
                        <React.Fragment key={item._id}>
                          <tr className={`cursor-pointer transition-colors hover:bg-slate-50 ${isExpanded ? 'bg-slate-50' : ''}`} onClick={() => setExpandedGroup(isExpanded ? null : item._id)}>
                              {config.bulkDelete && canEdit && (
                               <td className="px-4 py-3" onClick={e => e.stopPropagation()}></td>
                             )}
                             {actualKey === "monthly-fees" ? (
                               <>
                                 <td className="px-4 py-3 font-medium text-slate-900">{item.studentName}</td>
                                 <td className="px-4 py-3 text-slate-700">{item.batchName}</td>
                                 <td className="px-4 py-3 text-emerald-600 font-medium">Paid: {money(item.totalPaid)}</td>
                                 <td className="px-4 py-3 text-rose-600 font-medium">Due: {money(item.totalDue)}</td>
                                 <td className="px-4 py-3"></td>
                                 <td className="px-4 py-3"></td>
                                 <td className="px-4 py-3"></td>
                               </>
                             ) : (
                               <>
                                 <td className="px-4 py-3 font-medium text-slate-900">{item.studentName}</td>
                                 <td className="px-4 py-3 text-slate-600 font-medium">{item.results.length} tests taken</td>
                                 <td className="px-4 py-3"></td>
                                 <td className="px-4 py-3"></td>
                                 <td className="px-4 py-3"></td>
                                 <td className="px-4 py-3"></td>
                               </>
                             )}
                             <td className="px-4 py-3 text-right" onClick={(e) => (e.stopPropagation())}>
                                <div className="flex justify-end items-center gap-2">
                                  <IconButton label={actualKey === "monthly-fees" ? "View Ledger" : "View Profile"} onClick={() => navigate(actualKey === "monthly-fees" ? `/students/${item._id}` : `/students/${item._id}`)}>
                                    {actualKey === "monthly-fees" ? <Briefcase size={16} /> : <Eye size={16} />}
                                  </IconButton>
                                  <button onClick={() => setExpandedGroup(isExpanded ? null : item._id)} className="p-1 hover:bg-slate-200 rounded text-slate-500">
                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                  </button>
                                </div>
                             </td>
                          </tr>
                          {isExpanded && actualKey === "monthly-fees" && item.fees.map((fee, index) => {
                             const isMostRecent = index === item.fees.length - 1;
                             const rowStyle = isMostRecent ? "bg-blue-100/70 hover:bg-blue-100"
                                            : fee.status === "paid" ? "bg-emerald-100/70 hover:bg-emerald-100"
                                            : fee.status === "partial" ? "bg-amber-100/70 hover:bg-amber-100"
                                            : fee.status === "future" ? "bg-slate-100/70 hover:bg-slate-100"
                                            : "bg-rose-100/70 hover:bg-rose-100";
                             return (
                               <tr key={fee._id} className={rowStyle} onClick={() => setSelectedItem(fee)}>
                                 {config.bulkDelete && canEdit && <td className="px-4 py-2"></td>}
                                 <td className="px-4 py-2 pl-8 text-slate-400 font-medium text-xs">↳</td>
                                 <td className="px-4 py-2"></td>
                                 <td className="px-4 py-2 text-slate-700 text-sm"><Cell value={fee.periodStart} label="Period Start" /></td>
                                 <td className="px-4 py-2 text-slate-700 text-sm"><Cell value={fee.periodEnd} label="Period End" /></td>
                                 <td className="px-4 py-2 text-slate-700 text-sm"><Cell value={fee.dueDate} label="Due Date" /></td>
                                 <td className="px-4 py-2 text-slate-900 font-medium text-sm"><Cell value={fee.status === 'partial' ? fee.balance : fee.totalAmount} label="Total" /></td>
                                 <td className="px-4 py-2"><Cell value={fee.status} label="Status" /></td>
                                 <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-end gap-2">
                                      {user.role !== "student" && fee.status !== "paid" && (
                                        <IconButton label="Collect fee" onClick={() => setCollecting(fee)}>
                                          <IndianRupee size={16} />
                                        </IconButton>
                                      )}
                                      {user.role !== "student" && fee.status !== "paid" && fee.student?.guardian?.phone && (
                                        <button title="Send Fee Reminder" onClick={() => handleSendNotification(fee)} className="grid h-9 w-9 place-items-center rounded-md border border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors">
                                          <MessageCircle size={16} />
                                        </button>
                                      )}
                                      <IconButton label="View Ledger" onClick={() => navigate(`/students/${fee.student._id || fee.student}`)}>
                                        <Briefcase size={16} />
                                      </IconButton>
                                    </div>
                                 </td>
                               </tr>
                             );
                          })}
                          {isExpanded && actualKey === "results" && item.results.map((result) => {
                             return (
                               <tr key={result._id} className="bg-slate-50/50 hover:bg-slate-100" onClick={() => setSelectedItem(result)}>
                                 {config.bulkDelete && canEdit && <td className="px-4 py-2"></td>}
                                 <td className="px-4 py-2 pl-8 text-slate-400 font-medium text-xs">↳</td>
                                 <td className="px-4 py-2 text-slate-700 text-sm">{result.test?.title}</td>
                                 <td className="px-4 py-2 text-slate-700 text-sm">{date(result.test?.testDate)}</td>
                                 <td className="px-4 py-2 text-slate-700 text-sm">{result.marksObtained} / {result.test?.maxMarks}</td>
                                 <td className="px-4 py-2 text-slate-700 text-sm">{result.percentage != null ? (Number.isInteger(result.percentage) ? result.percentage : Number(result.percentage).toFixed(2)) + "%" : "-"}</td>
                                 <td className="px-4 py-2 text-slate-700 text-sm">{result.grade || "-"}</td>
                                 <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                                     <div className="flex justify-end gap-2">
                                       {user.role !== "student" && result.student?.guardian?.phone && (result.marksObtained !== undefined && result.marksObtained !== null || result.isAbsent) && (
                                         <button title="Send Marks Notification" onClick={() => handleSendNotification(result)} className="grid h-9 w-9 place-items-center rounded-md border border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors">
                                           <MessageCircle size={16} />
                                         </button>
                                       )}
                                       {canEdit && (
                                         <IconButton label="Edit" onClick={() => setEditing(result)}>
                                           <Pencil size={16} />
                                         </IconButton>
                                       )}
                                       {canEdit && (
                                         <IconButton label="Delete" onClick={() => remove(result)}>
                                           <Trash2 size={16} />
                                         </IconButton>
                                       )}
                                     </div>
                                 </td>
                               </tr>
                             );
                          })}
                        </React.Fragment>
                      );
                    }

                    let rowStyle = "hover:bg-slate-50";
                    if (actualKey === "monthly-fees") {
                      rowStyle = item.status === "paid" ? "bg-emerald-50/60 hover:bg-emerald-50"
                               : item.status === "future" ? "bg-slate-50/60 hover:bg-slate-50"
                               : "bg-rose-50/60 hover:bg-rose-50"; // Red for partial/unpaid
                    }
                    
                    return (
                      <tr 
                        key={item._id} 
                        className={`cursor-pointer transition-colors ${selectedItem?._id === item._id ? 'bg-slate-100' : rowStyle}`}
                        onClick={() => setSelectedItem(item)}
                      >
                        {config.bulkDelete && canEdit && (
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={selectedItems.includes(item._id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedItems(prev => [...prev, item._id]);
                                else setSelectedItems(prev => prev.filter(id => id !== item._id));
                              }}
                              className="rounded border-slate-300 text-brand focus:ring-brand"
                            />
                          </td>
                        )}
                        {config.columns.map(([path, label]) => (
                          <td key={path} className="max-w-64 px-4 py-3 text-slate-700">
                            <Cell value={getPath(item, path)} label={label} />
                          </td>
                        ))}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          {actualKey === "tests" && (user.role === "admin" || user.role === "teacher") && (
                            <IconButton label="Enter marks" onClick={() => setEnteringMarks(item)}>
                              <ClipboardEdit size={16} />
                            </IconButton>
                          )}
                          {user.role !== "student" && (actualKey === "results") && item.student?.guardian?.phone && (item.marksObtained !== undefined && item.marksObtained !== null || item.isAbsent) && (
                             <button title="Send Marks Notification" onClick={() => handleSendNotification(item)} className="grid h-9 w-9 place-items-center rounded-md border border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors">
                               <MessageCircle size={16} />
                             </button>
                           )}
                          {(actualKey === "students" || actualKey === "teachers") && (
                            <IconButton label="View profile" onClick={() => navigate(`/${actualKey}/${item.student?._id || item._id}`)}>
                              <Eye size={16} />
                            </IconButton>
                          )}
                          {(actualKey === "monthly-fees" || actualKey === "batch-fees") && user.role === "admin" && (
                            <>
                              {item.status !== "paid" && (
                                <IconButton label="Collect fee" onClick={() => setCollecting(item)}>
                                  <IndianRupee size={16} />
                                </IconButton>
                              )}
                              <IconButton label="View Ledger" onClick={() => navigate(`/students/${item.student._id || item.student}`)}>
                                <Briefcase size={16} />
                              </IconButton>
                            </>
                          )}
                          {actualKey === "study-materials" && item.fileUrl && (
                            <IconButton label="Download" onClick={() => window.open(toFileUrl(item.fileUrl), "_blank")}>
                              <Download size={16} />
                            </IconButton>
                          )}
                          {canEdit && hasMutationPermission(item) && (
                            <IconButton label="Edit" onClick={() => setEditing(item)}>
                              <Pencil size={16} />
                            </IconButton>
                          )}
                          {canEdit && hasMutationPermission(item) && (
                            <IconButton label="Delete" onClick={() => remove(item)}>
                              <Trash2 size={16} />
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
            </>
          </div>
          {actualKey === "batches" && selectedItem && (
            <BatchStudents batch={selectedItem} onClose={() => setSelectedItem(null)} />
          )}
          {actualKey === "notices" && selectedItem && (
            <Modal title={selectedItem.title} onClose={() => setSelectedItem(null)}>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className={`text-xs font-bold border rounded px-2.5 py-0.5 uppercase tracking-wider ${
                    selectedItem.priority === "high" ? "bg-rose-50 text-rose-700 border-rose-100" :
                    selectedItem.priority === "normal" ? "bg-blue-50 text-blue-700 border-blue-100" :
                    "bg-slate-50 text-slate-600 border-slate-200"
                  }`}>
                    {selectedItem.priority} Priority
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    Date: {new Date(selectedItem.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {selectedItem.message}
                </div>
                {selectedItem.createdBy?.name && (
                  <div className="pt-3 border-t border-slate-100 text-xs text-slate-400 text-right">
                    Posted by: <span className="font-semibold text-slate-600">{selectedItem.createdBy.name} ({selectedItem.createdBy.role})</span>
                  </div>
                )}
                <div className="flex justify-end pt-3">
                  <button type="button" onClick={() => setSelectedItem(null)} className="h-10 rounded-md border border-slate-200 px-5 text-sm font-medium hover:bg-slate-50 transition-colors">
                    Close
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {editing && (
        <ResourceForm
          config={config}
          item={editing}
          lookups={lookups}
          onClose={() => setEditing(null)}
          onSaved={(savedRecord) => {
            const isNew = !editing._id;
            setEditing(null);
            fetchData();
            handlePostSaveAction(savedRecord, isNew);
          }}
        />
      )}
      {collecting && (
        <CollectFeeModal
          fee={collecting}
          resourceType={actualKey}
          onClose={() => setCollecting(null)}
          onSaved={(paymentData) => {
            setCollecting(null);
            fetchData();
            if (paymentData) handlePostSaveAction(paymentData, false, "collect_fee", collecting);
          }}
        />
      )}
      {enteringMarks && (
        <EnterMarksModal
          test={enteringMarks}
          onClose={() => setEnteringMarks(null)}
          onSaved={() => {
            setEnteringMarks(null);
            fetchData();
            handlePostSaveAction(null, false, "enter_marks", enteringMarks);
          }}
        />
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
      
      {waBulkModal && (
        <WhatsAppBulkModal
          isOpen={waBulkModal.isOpen}
          onClose={() => setWaBulkModal(null)}
          title={waBulkModal.title}
          recipients={waBulkModal.recipients}
        />
      )}
    </section>
  );
};

export const ResourceForm = ({ config, item, lookups, onClose, onSaved }) => {
  const initial = useMemo(() => flattenInitial(item, config.fields), [item, config.fields]);
  const [values, setValues] = useState(initial);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = Boolean(item._id);

  const setValue = (name, value) => setValues((current) => ({ ...current, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      let body = buildPayload(values, config.fields);
      let headers = {};

      if (config.multipart) {
        // If it's create mode and we have multiple files selected
        if (!isEdit && values.files && values.files.length > 0) {
          const promises = values.files.map(async (fileObj) => {
            const formData = new FormData();
            Object.entries(body).forEach(([key, val]) => {
              if (key !== "file" && key !== "files") {
                formData.append(key, val);
              }
            });
            formData.append("file", fileObj.file);
            formData.append("fileName", fileObj.name);
            return api.post(config.endpoint, formData, {
              headers: { "Content-Type": "multipart/form-data" }
            });
          });
          const responses = await Promise.all(promises);
          onSaved(responses[responses.length - 1].data);
          return;
        }

        // Single file upload
        const formData = new FormData();
        Object.entries(body).forEach(([key, value]) => {
          if (key !== "file") {
            formData.append(key, value);
          }
        });
        if (values.file instanceof File) {
          formData.append("file", values.file);
        }
        if (values.fileName) {
          formData.append("fileName", values.fileName);
        }
        body = formData;
        headers = { "Content-Type": "multipart/form-data" };
      }

      let response;
      if (isEdit) response = await api.put(`${config.endpoint}/${item._id}`, body, { headers });
      else response = await api.post(config.endpoint, body, { headers });
      onSaved(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save record");
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={`${isEdit ? "Edit" : "Add"} ${config.title.slice(0, -1)}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        {(() => {
          const hasSections = config.fields.some(f => f.section);
          if (!hasSections) {
             return (
               <div className="grid gap-4 sm:grid-cols-2">
                 {config.fields.map(field => {
                    if (field.dependsOn && !field.dependsOn(values)) return null;
                    return <Field key={field.name} field={field} value={values[field.name]} onChange={setValue} lookups={lookups} values={values} />;
                 })}
               </div>
             );
          }

          const sections = {};
          const unsectioned = [];
          config.fields.forEach(field => {
            if (field.section) {
               if (!sections[field.section]) sections[field.section] = [];
               sections[field.section].push(field);
            } else {
               unsectioned.push(field);
            }
          });

          return (
            <div className="space-y-6">
               {Object.entries(sections).map(([sectionName, fields]) => (
                  <div key={sectionName}>
                     <h4 className="font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">{sectionName}</h4>
                     <div className="grid gap-4 sm:grid-cols-2">
                       {fields.map(field => {
                          if (field.dependsOn && !field.dependsOn(values)) return null;
                          return <Field key={field.name} field={field} value={values[field.name]} onChange={setValue} lookups={lookups} values={values} />;
                       })}
                     </div>
                  </div>
               ))}
               {unsectioned.length > 0 && (
                  <div>
                     <h4 className="font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">Other Details</h4>
                     <div className="grid gap-4 sm:grid-cols-2">
                       {unsectioned.map(field => {
                          if (field.dependsOn && !field.dependsOn(values)) return null;
                          return <Field key={field.name} field={field} value={values[field.name]} onChange={setValue} lookups={lookups} values={values} />;
                       })}
                     </div>
                  </div>
               )}
            </div>
          );
        })()}
        {values.files && values.files.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Selected Files ({values.files.length})</span>
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3 max-h-60 overflow-y-auto kc-scrollbar">
              {values.files.map((fileObj, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                  <div className="text-xs font-medium text-slate-500 truncate max-w-[200px]" title={fileObj.file.name}>
                    Original: {fileObj.file.name}
                  </div>
                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      value={fileObj.name}
                      onChange={(e) => {
                        const updated = [...values.files];
                        updated[idx].name = e.target.value;
                        setValue("files", updated);
                      }}
                      placeholder="Display Filename"
                      className="w-full text-xs font-medium px-2 py-1 border border-slate-300 rounded focus:border-brand outline-none bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = values.files.filter((_, i) => i !== idx);
                      setValue("files", updated);
                    }}
                    className="text-rose-500 hover:text-rose-700 text-xs font-semibold px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col-reverse md:flex-row justify-end gap-2 border-t border-slate-200 pt-4 mt-4">
          <button type="button" className="h-11 md:h-10 w-full md:w-auto rounded-md border border-slate-200 px-4 text-sm font-medium" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="h-11 md:h-10 w-full md:w-auto rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const Field = ({ field, value, onChange, lookups, values }) => {
  const baseClass = "mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-base md:text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
  const label = (
    <span>
      {field.label}
      {field.required && <span className="text-rose-600"> *</span>}
    </span>
  );

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mt-2">
        <input 
          type="checkbox" 
          checked={value || false}
          onChange={(event) => onChange(field.name, event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
        />
        {label}
      </label>
    );
  }

  if (field.type === "day-checkboxes") {
    const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const parsed = Array.isArray(value) ? value : (value ? String(value).split(",").map(d => d.trim()).filter(Boolean) : []);
    const selected = parsed.filter(d => DAYS.includes(d));
    const toggleDay = (day) => {
      const next = selected.includes(day) ? selected.filter(d => d !== day) : [...selected, day];
      onChange(field.name, next);
    };
    return (
      <div className="sm:col-span-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAYS.map(day => {
            const active = selected.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`
                  h-10 min-w-[4rem] px-3 rounded-lg text-sm font-semibold border-2 transition-all duration-150 select-none
                  ${active
                    ? "bg-brand text-white border-brand shadow-md shadow-brand/20 scale-[1.04]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-brand/40 hover:text-brand hover:bg-brand/5"
                  }
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <p className="mt-1.5 text-xs text-slate-500">{selected.join(", ")}</p>
        )}
      </div>
    );
  }

  if (field.type === "multiselect-search") {
    let options = lookups[field.source] || [];
    if (field.filterOptions && values) {
      options = field.filterOptions(options, values);
    }
    return (
      <MultiSelectSearch 
        label={label}
        options={options} 
        value={value || []} 
        onChange={(v) => onChange(field.name, v)} 
        optionLabel={field.optionLabel} 
      />
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="text-sm font-medium text-slate-700 sm:col-span-2">
        {label}
        <textarea className={baseClass} rows={3} value={value || ""} onChange={(event) => onChange(field.name, event.target.value)} required={field.required} />
      </label>
    );
  }

  if (field.type === "select-static") {
    return (
      <label className="text-sm font-medium text-slate-700">
        {label}
        <select className={baseClass} value={value || ""} onChange={(event) => onChange(field.name, event.target.value)} required={field.required}>
          <option value="">Select</option>
          {field.options.map((option) => {
            const val = typeof option === "object" ? option.value : option;
            const lbl = typeof option === "object" ? option.label : option;
            return (
              <option key={val} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>
      </label>
    );
  }

  if (field.type === "multiselect") {
    const options = lookups[field.source] || [];
    const selectedValues = Array.isArray(value) ? value : [];
    const handleCheckboxChange = (optionId, checked) => {
      let newValue;
      if (checked) {
        newValue = [...selectedValues, optionId];
      } else {
        newValue = selectedValues.filter(val => val !== optionId);
      }
      onChange(field.name, newValue);
    };

    return (
      <div className="flex flex-col space-y-1 sm:col-span-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="border border-slate-300 rounded-md p-3 max-h-48 overflow-y-auto space-y-2 bg-white kc-scrollbar shadow-inner">
          {options.length === 0 ? (
            <span className="text-xs text-slate-400 italic">No options available</span>
          ) : (
            options.map((option) => {
              const isChecked = selectedValues.includes(option._id);
              return (
                <label key={option._id} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleCheckboxChange(option._id, e.target.checked)}
                    className="rounded border-slate-300 text-brand focus:ring-brand h-4 w-4"
                  />
                  <span className="text-slate-600 font-medium">
                    {display(getPath(option, field.optionLabel || "name"))}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (field.type === "select") {
    const options = lookups[field.source] || [];
    return (
      <label className="text-sm font-medium text-slate-700">
        {label}
        <select
          className={baseClass}
          value={value || ""}
          onChange={(event) => onChange(field.name, event.target.value)}
          required={field.required}
        >
          <option value="">Select</option>
          {options.map((option) => (
            <option key={option._id} value={option._id}>
              {display(getPath(option, field.optionLabel || "name"))}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "file") {
    const isMultiple = !values?._id && field.name === "file";
    return (
      <label className="text-sm font-medium text-slate-700">
        {label}
        <input 
          className={baseClass} 
          type="file" 
          multiple={isMultiple}
          onChange={(event) => {
            if (isMultiple) {
              const selected = Array.from(event.target.files || []);
              const fileList = selected.map(f => ({ file: f, name: f.name }));
              onChange("files", fileList);
            } else {
              onChange(field.name, event.target.files?.[0]);
            }
          }} 
        />
      </label>
    );
  }

  let minDate = field.min;
  if (minDate === "today") minDate = new Date().toISOString().split("T")[0];

  let maxDate = field.max;
  if (maxDate === "today") maxDate = new Date().toISOString().split("T")[0];

  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input 
        className={baseClass} 
        value={value || ""} 
        onChange={(event) => {
          event.target.setCustomValidity("");
          onChange(field.name, event.target.value);
        }} 
        onInvalid={(e) => {
          if (field.errorMessage) {
            e.target.setCustomValidity(field.errorMessage);
          }
        }}
        type={field.type || "text"} 
        required={field.required} 
        min={minDate} 
        max={maxDate}
        minLength={field.minLength}
        maxLength={field.maxLength}
        pattern={field.pattern}
      />
    </label>
  );
};

export const MultiSelectSearch = ({ label, options, value, onChange, optionLabel }) => {
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(o => display(getPath(o, optionLabel || "name")).toLowerCase().includes(search.toLowerCase()));
  }, [options, search, optionLabel]);

  const toggleOption = (optId) => {
    if (value.includes(optId)) {
      onChange(value.filter(id => id !== optId));
    } else {
      onChange([...value, optId]);
    }
  };

  const selectAll = () => {
    const allFilteredIds = filteredOptions.map(o => o._id);
    const newVals = Array.from(new Set([...value, ...allFilteredIds]));
    onChange(newVals);
  };

  const deselectAll = () => {
    const allFilteredIds = new Set(filteredOptions.map(o => o._id));
    const newVals = value.filter(id => !allFilteredIds.has(id));
    onChange(newVals);
  };

  return (
    <div className="sm:col-span-2 space-y-1 relative">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="rounded-md border border-slate-300 p-2 text-sm bg-white">
         <div className="flex justify-between mb-2 pb-2 border-b border-slate-100">
           <div className="relative flex-1 mr-2">
             <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
             <input 
               type="text" 
               className="w-full pl-7 pr-2 py-1 rounded bg-slate-50 border-none outline-none text-xs" 
               placeholder="Search..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
           </div>
           <div className="flex gap-2">
              <button type="button" onClick={selectAll} className="text-xs text-brand font-medium hover:underline">Select All</button>
              <button type="button" onClick={deselectAll} className="text-xs text-slate-500 font-medium hover:underline">Clear</button>
           </div>
         </div>
         <div className="max-h-48 overflow-y-auto kc-scrollbar flex flex-col gap-1">
           {filteredOptions.length === 0 ? (
              <div className="text-slate-400 text-xs text-center py-2">No options found</div>
           ) : (
             filteredOptions.map(opt => (
               <label key={opt._id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={value.includes(opt._id)} 
                   onChange={() => toggleOption(opt._id)}
                   className="rounded border-slate-300 text-brand focus:ring-brand"
                 />
                 <span className="text-slate-700">{display(getPath(opt, optionLabel || "name"))}</span>
               </label>
             ))
           )}
         </div>
      </div>
      <div className="text-xs text-slate-500 mt-1">{value.length} selected</div>
    </div>
  );
};

const CollectFeeModal = ({ fee, resourceType, onClose, onSaved }) => {
  const activePayments = fee.payments?.filter(p => !p.status || p.status === 'active') || [];
  const paid = activePayments.reduce((sum, p) => sum + p.amount, 0);
  const pending = (fee.totalAmount - (fee.discount || 0)) - paid;
  
  const [amount, setAmount] = useState(pending || "");
  const [method, setMethod] = useState("upi");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (Number(amount) > pending) {
      setError(`Payment amount cannot exceed outstanding due amount (₹${pending}).`);
      return;
    }
    try {
      const res = await api.post(`/${resourceType}/${fee._id}/collect`, { amount: Number(amount), method, note, paidAt });
      onSaved({ amount: Number(amount), method, note, paidAt });
    } catch (err) {
      setError(err.response?.data?.message || "Could not collect fee");
    }
  };

  return (
    <Modal title="Collect Fee" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        <div className="rounded-md bg-slate-50 p-4 text-sm space-y-1">
          <div className="font-semibold text-ink">{fee.student?.user?.name}</div>
          <div className="flex justify-between text-slate-500"><span>Total Amount:</span> <span>{money(fee.totalAmount)}</span></div>
          <div className="flex justify-between font-bold text-rose-600 mt-1 pt-1 border-t border-slate-200"><span>Outstanding Due:</span> <span>{money(pending)}</span></div>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Payment Amount
          <input className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} max={pending} min="1" required />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Payment Date
          <input className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3" type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} required />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Method
          <select className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3" value={method} onChange={(event) => setMethod(event.target.value)}>
            {["cash", "upi", "card", "bank_transfer", "cheque"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Note
          <textarea className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <div className="flex flex-col-reverse md:flex-row justify-end gap-2 border-t border-slate-200 pt-4 mt-4">
          <button type="button" className="h-11 md:h-10 w-full md:w-auto rounded-md border border-slate-200 px-4 text-sm font-medium" onClick={onClose}>
            Cancel
          </button>
          <button className="h-11 md:h-10 w-full md:w-auto rounded-md bg-brand px-4 text-sm font-semibold text-white">Collect</button>
        </div>
      </form>
    </Modal>
  );
};

const IconButton = ({ label, onClick, children }) => (
  <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100" title={label} aria-label={label} onClick={onClick}>
    {children}
  </button>
);

const Cell = ({ value, label }) => {
  if (Array.isArray(value)) return <span>{value.length}</span>;
  if (label.includes("Date") || label === "Created" || label.includes("Period")) return <span>{date(value)}</span>;
  if (["Total", "Paid", "Pending", "Fee"].includes(label)) return <span>{money(value)}</span>;
  if (label === "Percentage") return <span>{value != null ? (Number.isInteger(value) ? value : Number(value).toFixed(2)) : "-"}%</span>;
  if (label === "Status") {
    let badgeStyle = "bg-slate-100 text-slate-700";
    if (value === "paid" || value === "active" || value === "completed") badgeStyle = "bg-emerald-100 text-emerald-800";
    else if (value === "partial") badgeStyle = "bg-amber-100 text-amber-800";
    else if (value === "overdue" || value === "inactive" || value === "suspended") badgeStyle = "bg-rose-100 text-rose-800"; // Red for dues/pendings
    else if (value === "future") badgeStyle = "bg-slate-100 text-slate-600";
    
    return (
      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm bg-white/80 border ${badgeStyle}`}>
        {value}
      </span>
    );
  }
  return <span className="line-clamp-2">{display(value)}</span>;
};

const toFileUrl = (fileUrl) => {
  if (fileUrl.startsWith("http")) return fileUrl;
  return API_URL.replace("/api", "") + fileUrl;
};

const EnterMarksModal = ({ test, onClose, onSaved }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        let studentDocs = [];
        if (test.batch) {
          const res = await api.get("/students", { params: { limit: 1000 } });
          studentDocs = res.data.items.filter(s => s.batch && s.batch._id === (test.batch._id || test.batch) && s.status === "active");
        } else if (test.students && test.students.length > 0) {
          const sIds = test.students.map(st => st._id || st);
          const res = await api.get("/students", { params: { limit: 1000 } });
          studentDocs = res.data.items.filter(s => sIds.includes(s._id) && s.status === "active");
        }

        const resultsRes = await api.get("/results", { params: { test: test._id, limit: 1000 } });
        const existingResults = resultsRes.data.items || [];

        const merged = studentDocs.map(s => {
          const existing = existingResults.find(r => r.student?._id === s._id || r.student === s._id);
          return {
            student: s._id,
            studentName: s.user?.name || s.name || s.studentId,
            marksObtained: existing ? existing.marksObtained : "",
            isAbsent: existing ? existing.isAbsent : false,
            remarks: existing ? existing.remarks : ""
          };
        });

        setStudents(merged);
      } catch (err) {
        setError("Could not load students or results");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [test]);

  const updateStudent = (studentId, field, value) => {
    setStudents(curr => curr.map(s => s.student === studentId ? { ...s, [field]: value } : s));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        results: students.map(s => ({
          student: s.student,
          marksObtained: Number(s.marksObtained) || 0,
          isAbsent: Boolean(s.isAbsent),
          remarks: s.remarks || ""
        }))
      };
      await api.post(`/tests/${test._id}/results`, payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save results");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Enter Marks - ${test.title}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 max-w-2xl">
        {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        
        <div className="rounded-md bg-slate-50 p-4 text-sm space-y-1 mb-4 border border-slate-100">
          <div className="font-semibold text-ink">Max Marks: {test.maxMarks}</div>
          <div className="text-slate-500">Date: {date(test.testDate)}</div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading students...</div>
        ) : students.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">No active students found for this test.</div>
        ) : (
          <div className="max-h-96 overflow-y-auto kc-scrollbar -mx-4 px-4">
            <table className="w-full text-sm text-left">
              <thead className="sticky top-0 bg-white shadow-[0_1px_0_0_#f1f5f9] z-10">
                <tr>
                  <th className="py-2 font-semibold text-slate-500">Student Name</th>
                  <th className="py-2 font-semibold text-slate-500 text-center w-20">Absent</th>
                  <th className="py-2 font-semibold text-slate-500 w-28">Marks</th>
                  <th className="py-2 font-semibold text-slate-500 pl-2">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(s => (
                  <tr key={s.student}>
                    <td className="py-3 font-medium text-slate-700">{s.studentName}</td>
                    <td className="py-3 text-center">
                      <input 
                        type="checkbox" 
                        checked={s.isAbsent} 
                        onChange={(e) => updateStudent(s.student, "isAbsent", e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <input 
                        type="number" 
                        min="0" 
                        max={test.maxMarks} 
                        value={s.marksObtained}
                        onChange={(e) => updateStudent(s.student, "marksObtained", e.target.value)}
                        disabled={s.isAbsent}
                        className="w-full rounded-md border border-slate-300 px-3 py-1.5 outline-none focus:border-brand disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </td>
                    <td className="py-3 pl-2">
                      <input 
                        type="text" 
                        value={s.remarks}
                        onChange={(e) => updateStudent(s.student, "remarks", e.target.value)}
                        placeholder="Optional"
                        className="w-full rounded-md border border-slate-300 px-3 py-1.5 outline-none focus:border-brand"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col-reverse md:flex-row justify-end gap-2 border-t border-slate-200 pt-4 mt-4">
          <button type="button" className="h-11 md:h-10 w-full md:w-auto rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" disabled={loading || saving || students.length === 0} className="h-11 md:h-10 w-full md:w-auto rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
            {saving ? "Saving..." : "Save Results"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const BatchStudents = ({ batch, onClose }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/students', { params: { batch: batch._id, limit: 1000 } });
        setStudents(data.items || []);
      } catch (err) {
        console.error("Failed to fetch students", err);
      } finally {
        setLoading(false);
      }
    };
    if (batch?._id) fetchStudents();
  }, [batch?._id]);

  return (
    <div className="w-full lg:w-96 shrink-0 rounded-md border border-slate-200 bg-white flex flex-col max-h-[600px] shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="font-semibold text-ink">{batch.name} Students</h3>
          <p className="text-xs text-slate-500">{students.length} students enrolled</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-50 p-1">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto kc-scrollbar p-2">
         {loading ? (
           <div className="text-sm text-slate-500 text-center py-4">Loading...</div>
         ) : students.length === 0 ? (
           <div className="text-sm text-slate-500 text-center py-4">No students in this batch</div>
         ) : (
           <ul className="space-y-1">
             {students.map(s => (
               <li key={s._id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-md">
                 <div className="h-8 w-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs">
                   {s.user?.name?.charAt(0) || 'S'}
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium text-slate-700 truncate">{s.user?.name}</p>
                   <p className="text-xs text-slate-500 truncate">{s.studentId}</p>
                 </div>
                 <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{s.status}</span>
               </li>
             ))}
           </ul>
         )}
      </div>
    </div>
  );
};
