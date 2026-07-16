import React, { useState, useEffect } from "react";
import { Plus, Search, Calendar, User, BookOpen, Clock, CheckCircle, XCircle, FileText, Pencil, Trash2, Eye } from "lucide-react";
import { api } from "../api/http";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { date } from "../utils/format";
import { MessageCircle, Send } from "lucide-react";
import { generateWhatsAppMessage, getWhatsAppUrl } from "../utils/whatsappHelper.js";
import { WhatsAppBulkModal } from "../components/WhatsAppBulkModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { StudentTestsTab } from "../components/StudentTestsTab.jsx";
import { ResourcePage } from "./ResourcePage.jsx";

export default function TestsPage() {
  const { user, profile } = useAuth();

  if (user?.role === "student") {
    return <StudentTestsTab student={profile} />;
  }

  const [activeTab, setActiveTab] = useState("scheduled"); // 'scheduled', 'history' or 'results'
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [lookups, setLookups] = useState({ batches: [], subjects: [], teachers: [], students: [] });

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingTest, setCompletingTest] = useState(null);

  const [viewingTest, setViewingTest] = useState(null);
  const [viewResults, setViewResults] = useState([]);
  const [viewResultsLoading, setViewResultsLoading] = useState(false);

  const [notifyTest, setNotifyTest] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [waBulkModal, setWaBulkModal] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    topic: "",
    subject: "",
    batch: "",
    teacher: "",
    testDate: "",
    maxMarks: "",
    description: "",
    students: []
  });

  const [marksData, setMarksData] = useState([]); // [{studentId, marksObtained, isAbsent, name}]

  const fetchLookups = async () => {
    try {
      const [b, sub, t, stu] = await Promise.all([
        api.get("/batches", { params: { limit: 1000 } }),
        api.get("/subjects", { params: { limit: 1000 } }),
        api.get("/teachers", { params: { limit: 1000 } }),
        api.get("/students", { params: { limit: 2000 } })
      ]);
      setLookups({
        batches: b.data.items || [],
        subjects: sub.data.items || [],
        teachers: t.data.items || [],
        students: stu.data.items || []
      });
      const tplRes = await api.get("/whatsapp-templates");
      setTemplates(tplRes.data.items || []);
    } catch (err) {
      console.error("Failed to fetch lookups", err);
    }
  };

  const fetchTests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/tests", {
        params: {
          search,
          status: activeTab === "scheduled" ? "scheduled" : undefined,
          limit: 100
        }
      });
      // Filter out scheduled if history tab
      if (activeTab === "history") {
         setTests((data.items || []).filter(t => t.status !== "scheduled"));
      } else {
         setTests(data.items || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch tests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    if (activeTab !== "results") {
      fetchTests();
    }
  }, [activeTab]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTests();
  };

  const openScheduleModal = (test = null) => {
    if (test) {
      setEditingTest(test);
      setFormData({
        title: test.title,
        topic: test.topic,
        subject: test.subject?._id || test.subject,
        batch: test.batch?._id || test.batch || "",
        teacher: test.teacher?._id || test.teacher,
        testDate: new Date(test.testDate).toISOString().split("T")[0],
        maxMarks: test.maxMarks,
        description: test.description || "",
        students: test.students.map(s => s._id || s)
      });
    } else {
      setEditingTest(null);
      setFormData({
        title: "",
        topic: "",
        subject: "",
        batch: "",
        teacher: "",
        testDate: "",
        maxMarks: "",
        description: "",
        students: []
      });
    }
    setShowScheduleModal(true);
  };

  const submitSchedule = async (e) => {
    e.preventDefault();
    try {
      if (editingTest) {
        await api.put(`/tests/${editingTest._id}`, formData);
      } else {
        await api.post("/tests", formData);
      }
      setShowScheduleModal(false);
      fetchTests();
    } catch (err) {
      alert(err.response?.data?.message || "Error saving test");
    }
  };

  const cancelTest = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this test?")) return;
    try {
      await api.post(`/tests/${id}/cancel`);
      fetchTests();
    } catch (err) {
      alert(err.response?.data?.message || "Error cancelling test");
    }
  };

  const openCompleteModal = async (test) => {
    setCompletingTest(test);
    try {
      const { data } = await api.get(`/tests/${test._id}/participants`);
      setMarksData(data.map(p => ({
        studentId: p.student._id,
        name: p.student.user?.name || "Unknown",
        marksObtained: "",
        isAbsent: false,
        maxMarks: test.maxMarks
      })));
      setShowCompleteModal(true);
    } catch (err) {
      alert("Error fetching participants");
    }
  };

  const submitComplete = async (e) => {
    e.preventDefault();
    try {
      const marksPayload = marksData.map(m => ({
        studentId: m.studentId,
        marksObtained: m.marksObtained,
        isAbsent: m.isAbsent
      }));
      await api.post(`/tests/${completingTest._id}/complete`, { marks: marksPayload });
      setShowCompleteModal(false);
      fetchTests();

      if (window.confirm("Test results submitted. Do you want to notify guardians via WhatsApp?")) {
        const template = templates.find(t => t.name === "Marks Published");
        if (!template) {
          alert("Marks Published template not found.");
          return;
        }
        try {
          const resultsRes = await api.get("/results", { params: { test: completingTest._id, limit: 1000 } });
          const results = resultsRes.data.items || [];
          
          const recipients = results.map(r => {
            if (!r.student?.guardian?.phone) return null;
            if ((r.marksObtained === undefined || r.marksObtained === null) && !r.isAbsent) return null;
            return {
              name: r.student.guardian.name,
              phone: r.student.guardian.phone,
              message: generateWhatsAppMessage(template, {
                guardian_name: r.student.guardian.name,
                student_name: r.student.user?.name || "",
                test_name: completingTest.title || "",
                subject: lookups.subjects.find(s => s._id === (completingTest.subject?._id || completingTest.subject))?.name || "",
                topic: completingTest.topic || "",
                test_date: date(completingTest.testDate),
                marks: r.marksObtained,
                max_marks: completingTest.maxMarks,
                percentage: ((r.marksObtained / completingTest.maxMarks) * 100).toFixed(2) + "%",
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
        } catch (err) {
          console.error("Failed to load results for notification", err);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error completing test");
    }
  };

  const openNotifyModal = (test) => {
    setNotifyTest(test);
  };

  const openViewModal = async (test) => {
    setViewingTest(test);
    setViewResults([]);
    setViewResultsLoading(true);
    try {
      const { data } = await api.get("/results", { params: { test: test._id, limit: 1000 } });
      setViewResults(data.items || []);
    } catch (err) {
      console.error("Failed to fetch results", err);
    } finally {
      setViewResultsLoading(false);
    }
  };

  const handleSendTestNotification = (studentObj, testObj) => {
    const template = templates.find(t => t.name === "Test Scheduled");
    if (!template) {
      alert("Test Scheduled template not found. Please create it in WA Templates settings.");
      return;
    }
    if (!studentObj.guardian?.phone) {
      alert("Guardian phone number is missing for this student.");
      return;
    }

    const testTimeStr = new Date(testObj.testDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const context = {
      guardian_name: studentObj.guardian.name || "",
      student_name: studentObj.user?.name || "",
      subject: lookups.subjects.find(s => s._id === (testObj.subject?._id || testObj.subject))?.name || "",
      topic: testObj.topic || "",
      test_date: date(testObj.testDate),
      test_time: testTimeStr,
      max_marks: testObj.maxMarks
    };

    const message = generateWhatsAppMessage(template, context);
    const url = getWhatsAppUrl(studentObj.guardian.phone, message);
    if (url) {
      window.open(url, "_blank");
    } else {
      alert("Invalid phone number");
    }
  };

  // Filter students based on batch selection
  const availableStudents = formData.batch 
    ? lookups.students.filter(s => s.batch?._id === formData.batch || s.batch === formData.batch)
    : lookups.students;

  // All teachers are available regardless of subject
  const availableTeachers = lookups.teachers;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Tests & Results</h1>
          <p className="text-sm text-slate-500">Schedule, track, and grade tests, and review student performance results.</p>
        </div>
        {activeTab !== 'results' && (
          <button
            onClick={() => openScheduleModal()}
            className="bg-brand text-white px-4 py-2 rounded-md font-medium inline-flex items-center gap-2 hover:bg-brand/90 transition-colors"
          >
            <Plus size={18} /> Schedule Test
          </button>
        )}
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button
          className={`pb-2 px-1 text-sm font-medium transition-colors ${activeTab === 'scheduled' ? 'text-brand border-b-2 border-brand' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('scheduled')}
        >
          Scheduled Tests
        </button>
        <button
          className={`pb-2 px-1 text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-brand border-b-2 border-brand' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('history')}
        >
          Test History
        </button>
        <button
          className={`pb-2 px-1 text-sm font-medium transition-colors ${activeTab === 'results' ? 'text-brand border-b-2 border-brand' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('results')}
        >
          All Results
        </button>
      </div>

      {activeTab === 'results' ? (
        <ResourcePage resourceKey="results" embed={true} />
      ) : (
        <>
          <form onSubmit={handleSearch} className="flex gap-2 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by Test Name or Topic..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-sm"
            />
          </form>

          {loading ? (
            <div className="text-sm text-slate-500">Loading tests...</div>
          ) : error ? (
            <EmptyState title="Error" message={error} />
          ) : tests.length === 0 ? (
            <EmptyState title="No Tests Found" message="Try adjusting your filters or schedule a new test." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tests.map(test => {
                const isPassed = new Date(test.testDate).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0);
                
                return (
                  <div key={test._id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-ink line-clamp-1">{test.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        test.status === 'scheduled' ? (isPassed ? 'bg-amber-100 text-amber-700' : 'bg-brand/10 text-brand') :
                        test.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {test.status === 'scheduled' && isPassed ? 'Needs Grading' : test.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mt-2 text-sm text-slate-600 flex-1">
                      <div className="flex items-center gap-2"><BookOpen size={15} /> Topic: {test.topic}</div>
                      <div className="flex items-center gap-2"><Calendar size={15} /> Date: {date(test.testDate)}</div>
                      <div className="flex items-center gap-2"><User size={15} /> Teacher: {test.teacher?.user?.name || '-'}</div>
                      <div className="flex items-center gap-2"><FileText size={15} /> Marks: {test.maxMarks} • Students: {test.students?.length}</div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2 justify-end">
                      {test.status === 'scheduled' && (
                        <>
                          <button title="Send Notification" onClick={() => openNotifyModal(test)} className="px-3 py-1.5 text-sm font-medium bg-[#25D366] text-white rounded-md hover:bg-[#1da851] transition-colors flex items-center gap-1.5">
                            <MessageCircle size={15} /> Notify
                          </button>
                          {!isPassed && (
                            <button title="Edit Test" onClick={() => openScheduleModal(test)} className="p-1.5 text-slate-500 hover:text-brand hover:bg-brand/10 rounded-md transition-colors">
                              <Pencil size={16} />
                            </button>
                          )}
                          <button title="Cancel Test" onClick={() => cancelTest(test._id)} className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors">
                            <XCircle size={16} />
                          </button>
                          {isPassed && (
                             <button onClick={() => openCompleteModal(test)} className="px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors">
                               Complete Test
                             </button>
                          )}
                        </>
                      )}
                      {(test.status === 'completed' || test.status === 'cancelled') && (
                        <button title="View Details" onClick={() => openViewModal(test)} className="px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors flex items-center gap-1.5">
                          <Eye size={15} /> View Details
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SCHEDULE MODAL */}
      <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} title={editingTest ? "Edit Test" : "Schedule Test"} maxWidth="max-w-3xl">
        <form onSubmit={submitSchedule} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Test Name *</label>
              <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" placeholder="e.g. Unit Test 1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Topic *</label>
              <input type="text" required value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" placeholder="e.g. Trigonometry" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
              <select required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value, teacher: ""})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand">
                <option value="">Select Subject...</option>
                {lookups.subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teacher *</label>
              <select required value={formData.teacher} onChange={e => setFormData({...formData, teacher: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand">
                <option value="">Select Teacher...</option>
                {availableTeachers.map(t => <option key={t._id} value={t._id}>{t.user?.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Batch (Optional)</label>
              <select value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value, students: []})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand">
                <option value="">Select Batch...</option>
                {lookups.batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Test Date *</label>
              <input type="date" required value={formData.testDate} min={!editingTest ? new Date().toISOString().split('T')[0] : undefined} onChange={e => setFormData({...formData, testDate: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Marks *</label>
              <input type="number" required min="1" value={formData.maxMarks} onChange={e => setFormData({...formData, maxMarks: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" />
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
               <label className="block text-sm font-medium text-slate-700">Select Students ({formData.students.length} selected) *</label>
               <div className="flex gap-3">
                 <button type="button" onClick={() => setFormData({...formData, students: availableStudents.map(s => s._id)})} className="text-xs text-brand hover:underline font-medium">Select All</button>
                 <button type="button" onClick={() => setFormData({...formData, students: []})} className="text-xs text-slate-500 hover:underline font-medium">Clear</button>
               </div>
            </div>
            <div className="w-full rounded-md border border-slate-300 p-2 text-sm h-48 overflow-y-auto bg-white flex flex-col gap-1">
               {availableStudents.length === 0 ? (
                 <p className="text-slate-400 italic text-center py-8">No students available.</p>
               ) : (
                 availableStudents.map(s => (
                   <label key={s._id} className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition-colors">
                     <input
                       type="checkbox"
                       checked={formData.students.includes(s._id)}
                       onChange={(e) => {
                         const newStudents = e.target.checked 
                           ? [...formData.students, s._id] 
                           : formData.students.filter(id => id !== s._id);
                         setFormData({...formData, students: newStudents});
                       }}
                       className="rounded border-slate-300 text-brand focus:ring-brand h-4 w-4"
                     />
                     <span className="text-slate-700 font-medium">
                       {s.user?.name} {s.batch?.name ? <span className="text-slate-400 text-xs ml-1 font-normal">({s.batch.name})</span> : ''}
                     </span>
                   </label>
                 ))
               )}
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
             <textarea rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand"></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setShowScheduleModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand/90">Save Test</button>
          </div>
        </form>
      </Modal>

      {/* COMPLETE MODAL */}
      <Modal isOpen={showCompleteModal} onClose={() => setShowCompleteModal(false)} title={`Grade Test: ${completingTest?.title}`} maxWidth="max-w-4xl">
        <form onSubmit={submitComplete} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-md">
             Once you submit these marks, the test will be marked as Completed and cannot be edited.
          </div>
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <table className="w-full text-sm text-left">
              <thead className="sticky top-0 bg-white border-b border-slate-200">
                <tr>
                  <th className="py-3 font-semibold text-slate-600">Student Name</th>
                  <th className="py-3 font-semibold text-slate-600 text-center">Status</th>
                  <th className="py-3 font-semibold text-slate-600 text-right">Marks Obtained (Max: {completingTest?.maxMarks})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {marksData.map((row, index) => (
                  <tr key={row.studentId}>
                    <td className="py-3 font-medium text-slate-800">{row.name}</td>
                    <td className="py-3 text-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={row.isAbsent} onChange={e => {
                          const newMarks = [...marksData];
                          newMarks[index].isAbsent = e.target.checked;
                          if (e.target.checked) newMarks[index].marksObtained = "";
                          setMarksData(newMarks);
                        }} className="sr-only peer" />
                        <div className="relative w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                        <span className="ms-2 text-xs font-medium text-slate-600">{row.isAbsent ? 'Absent' : 'Present'}</span>
                      </label>
                    </td>
                    <td className="py-3 text-right">
                       <input 
                         type="number" 
                         disabled={row.isAbsent}
                         required={!row.isAbsent}
                         min="0"
                         max={completingTest?.maxMarks}
                         step="0.5"
                         value={row.marksObtained}
                         onChange={e => {
                           const newMarks = [...marksData];
                           newMarks[index].marksObtained = e.target.value;
                           setMarksData(newMarks);
                         }}
                         className="w-24 text-right rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand focus:ring-1 focus:ring-brand disabled:bg-slate-100 disabled:text-slate-400"
                         placeholder="Marks"
                       />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setShowCompleteModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 flex items-center gap-2">
              <CheckCircle size={16} /> Submit & Complete
            </button>
          </div>
        </form>
      </Modal>

      {/* NOTIFY MODAL */}
      <Modal isOpen={!!notifyTest} onClose={() => setNotifyTest(null)} title={`Notify Students: ${notifyTest?.title}`} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Send a WhatsApp notification to the guardian of each student assigned to this test.</p>
          <div className="max-h-[60vh] overflow-y-auto pr-2 border border-slate-200 rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 shadow-[0_1px_0_0_#e2e8f0] z-10">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-600">Student Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Guardian Phone</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(notifyTest?.students || []).map(st => {
                  const studentId = st._id || st;
                  const fullStudent = lookups.students.find(s => s._id === studentId);
                  if (!fullStudent) return null;
                  
                  return (
                    <tr key={fullStudent._id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{fullStudent.user?.name}</td>
                      <td className="px-4 py-3 text-slate-600">{fullStudent.guardian?.phone || <span className="text-rose-500 text-xs italic">Missing</span>}</td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => handleSendTestNotification(fullStudent, notifyTest)}
                          disabled={!fullStudent.guardian?.phone}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand rounded-md hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send size={12} /> Send
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {(!notifyTest?.students || notifyTest.students.length === 0) && (
                  <tr>
                    <td colSpan="3" className="px-4 py-8 text-center text-slate-500 italic">No students assigned to this test.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-2">
            <button type="button" onClick={() => setNotifyTest(null)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50">Close</button>
          </div>
        </div>
      </Modal>

      {/* VIEW DETAILS MODAL (Read-Only) */}
      <Modal isOpen={!!viewingTest} onClose={() => setViewingTest(null)} title={`Test Details: ${viewingTest?.title || ''}`} maxWidth="max-w-3xl">
        {viewingTest && (
          <div className="space-y-5">
            {/* Status Badge */}
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
                viewingTest.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {viewingTest.status}
              </span>
              {viewingTest.completedAt && (
                <span className="text-xs text-slate-500">Completed on {date(viewingTest.completedAt)}</span>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-100">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">Topic</p>
                <p className="text-sm font-medium text-slate-800">{viewingTest.topic}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">Subject</p>
                <p className="text-sm font-medium text-slate-800">{viewingTest.subject?.name || lookups.subjects.find(s => s._id === viewingTest.subject)?.name || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">Batch</p>
                <p className="text-sm font-medium text-slate-800">{viewingTest.batch?.name || lookups.batches.find(b => b._id === viewingTest.batch)?.name || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">Teacher</p>
                <p className="text-sm font-medium text-slate-800">{viewingTest.teacher?.user?.name || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">Test Date</p>
                <p className="text-sm font-medium text-slate-800">{date(viewingTest.testDate)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">Max Marks</p>
                <p className="text-sm font-medium text-slate-800">{viewingTest.maxMarks}</p>
              </div>
            </div>

            {viewingTest.description && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Description</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-md p-3 border border-slate-100">{viewingTest.description}</p>
              </div>
            )}

            {/* Students */}
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">Students ({viewingTest.students?.length || 0})</p>
              <div className="flex flex-wrap gap-1.5">
                {(viewingTest.students || []).map(st => {
                  const sid = st._id || st;
                  const full = lookups.students.find(s => s._id === sid);
                  return (
                    <span key={sid} className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                      {full?.user?.name || sid}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Results Table */}
            {viewingTest.status === 'completed' && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">Results</p>
                {viewResultsLoading ? (
                  <div className="py-6 text-center text-sm text-slate-500">Loading results...</div>
                ) : viewResults.length === 0 ? (
                  <div className="py-6 text-center text-sm text-slate-500">No results found for this test.</div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="max-h-72 overflow-y-auto kc-scrollbar">
                      <table className="w-full text-sm text-left">
                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                          <tr>
                            <th className="px-4 py-2.5 font-semibold text-slate-600">Student</th>
                            <th className="px-4 py-2.5 font-semibold text-slate-600 text-center">Status</th>
                            <th className="px-4 py-2.5 font-semibold text-slate-600 text-right">Marks</th>
                            <th className="px-4 py-2.5 font-semibold text-slate-600 text-right">Percentage</th>
                            <th className="px-4 py-2.5 font-semibold text-slate-600 text-center">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {viewResults.map(r => (
                            <tr key={r._id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-2.5 font-medium text-slate-800">{r.student?.user?.name || '-'}</td>
                              <td className="px-4 py-2.5 text-center">
                                {r.isAbsent ? (
                                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-rose-100 text-rose-700">Absent</span>
                                ) : (
                                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-100 text-emerald-700">Present</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                                {r.isAbsent ? '-' : `${r.marksObtained} / ${viewingTest.maxMarks}`}
                              </td>
                              <td className="px-4 py-2.5 text-right text-slate-600">
                                {r.percentage != null ? (Number.isInteger(r.percentage) ? r.percentage : Number(r.percentage).toFixed(1)) + '%' : '-'}
                              </td>
                              <td className="px-4 py-2.5 text-center font-semibold text-slate-700">{r.grade || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setViewingTest(null)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {waBulkModal && (
        <WhatsAppBulkModal
          isOpen={waBulkModal.isOpen}
          onClose={() => setWaBulkModal(null)}
          title={waBulkModal.title}
          recipients={waBulkModal.recipients}
        />
      )}

    </div>
  );
}
