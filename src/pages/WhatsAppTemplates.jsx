import React, { useState, useEffect } from "react";
import { api } from "../api/http.js";
import { Modal } from "../components/Modal.jsx";
import { Plus, Pencil, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { generateWhatsAppMessage } from "../utils/whatsappHelper.js";

// Dummy data for live preview
const dummyContext = {
  student_name: "Rahul Sharma",
  student_id: "STU-2023-001",
  roll_number: "45",
  course: "JEE Mains 2024",
  batch: "Morning Star",
  class: "12th",
  admission_date: "12 Aug 2023",
  guardian_name: "Mr. Sharma",
  guardian_relation: "Father",
  guardian_number: "9876543210",
  teacher_name: "Anita Desai",
  due_amount: "5000",
  paid_amount: "2000",
  total_due: "3000",
  next_due_date: "05 Sep 2023",
  payment_date: "12 Aug 2023",
  payment_mode: "UPI",
  receipt_number: "REC-9921",
  test_name: "Weekly Physics Mock",
  subject: "Physics",
  topic: "Thermodynamics",
  test_date: "20 Aug 2023",
  test_time: "10:00 AM",
  max_marks: "100",
  marks: "85",
  percentage: "85%",
  rank: "3",
  grade: "A",
  attendance: "92%",
  performance: "Excellent",
  remarks: "Keep up the good work.",
  coaching_name: "Kishan Classes",
  coaching_phone: "9123456789",
  coaching_address: "123 Education Lane",
  today: new Date().toLocaleDateString(),
  year: new Date().getFullYear(),
  notice_message: "The institute will remain closed tomorrow due to heavy rain."
};

export const WhatsAppTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/whatsapp-templates");
      setTemplates(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this custom template?")) return;
    try {
      await api.delete(`/whatsapp-templates/${id}`);
      fetchTemplates();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete template");
    }
  };

  const handleReset = async (id) => {
    if (!window.confirm("Are you sure you want to reset this template to its default message?")) return;
    try {
      await api.post(`/whatsapp-templates/${id}/reset`);
      fetchTemplates();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reset template");
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-ink">WhatsApp Templates</h1>
          <p className="text-sm text-slate-500 mt-1">Manage manual WhatsApp messaging templates</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-md font-semibold text-sm hover:bg-teal-800"
        >
          <Plus size={16} /> Add Custom Template
        </button>
      </div>

      {loading ? (
        <div className="text-slate-500">Loading templates...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <div key={template._id} className="bg-white border border-slate-200 rounded-md p-4 flex flex-col h-full hover:shadow-sm transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-slate-800">{template.name}</h3>
                  <span className="text-xs font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full">{template.category}</span>
                </div>
                {template.isDefault ? (
                  <span className="text-xs text-slate-400 font-medium">Default</span>
                ) : (
                  <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full">Custom</span>
                )}
              </div>
              
              <div className="flex-1 mt-2 mb-4 bg-slate-50 p-2 text-xs text-slate-600 rounded border border-slate-100 whitespace-pre-wrap overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/90 top-1/2"></div>
                {template.messageBody}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-auto">
                {template.isDefault && (
                  <button 
                    onClick={() => handleReset(template._id)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                    title="Reset to Default"
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
                {!template.isDefault && (
                  <button 
                    onClick={() => handleDelete(template._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button 
                  onClick={() => setEditingTemplate(template)}
                  className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/10 rounded transition-colors flex items-center gap-1 text-sm font-medium pr-3"
                >
                  <Pencil size={14} /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(editingTemplate || isCreating) && (
        <TemplateEditorModal 
          template={editingTemplate} 
          isCreating={isCreating}
          onClose={() => {
            setEditingTemplate(null);
            setIsCreating(false);
          }}
          onSave={() => {
            setEditingTemplate(null);
            setIsCreating(false);
            fetchTemplates();
          }}
        />
      )}
    </section>
  );
};

const TemplateEditorModal = ({ template, isCreating, onClose, onSave }) => {
  const variableGroups = [
    {
      title: "Student Details",
      variables: ["student_name", "student_id", "roll_number", "course", "batch", "class", "admission_date"]
    },
    {
      title: "Guardian Info",
      variables: ["guardian_name", "guardian_relation", "guardian_number"]
    },
    {
      title: "Fees & Payments",
      variables: ["due_amount", "paid_amount", "total_due", "next_due_date", "payment_date", "payment_mode", "receipt_number"]
    },
    {
      title: "Tests & Results",
      variables: ["test_name", "subject", "topic", "test_date", "test_time", "max_marks", "marks", "percentage", "rank", "grade"]
    },
    {
      title: "Progress Insights",
      variables: ["attendance", "performance", "remarks", "overall_average", "subject_performance", "feedback_comments"]
    },
    {
      title: "Coaching / General",
      variables: ["coaching_name", "coaching_phone", "coaching_address", "today", "year", "notice_message"]
    }
  ];

  const [formData, setFormData] = useState({
    name: template?.name || "",
    category: template?.category || "Custom",
    messageBody: template?.messageBody || "",
    variables: template?.variables || []
  });
  const [saving, setSaving] = useState(false);

  const previewText = generateWhatsAppMessage(formData, dummyContext);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const insertVariable = (variableName) => {
    const textarea = document.getElementById("messageBodyTextarea");
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.messageBody;
    const insertion = `{{${variableName}}}`;
    const newText = text.substring(0, start) + insertion + text.substring(end);
    
    setFormData(prev => ({ ...prev, messageBody: newText }));
    
    // Focus back and set selection to after the inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertion.length, start + insertion.length);
    }, 0);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Auto-extract variables enclosed in {{ }}
      const matches = formData.messageBody.match(/{{(.*?)}}/g);
      const variables = matches ? matches.map(m => m.replace(/{{|}}/g, '').trim()) : [];
      
      const payload = { ...formData, variables: Array.from(new Set(variables)) };

      if (isCreating) {
        await api.post("/whatsapp-templates", payload);
      } else {
        await api.put(`/whatsapp-templates/${template._id}`, payload);
      }
      onSave();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isCreating ? "Create Custom Template" : "Edit Template"} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4 max-w-4xl w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!isCreating && template?.isDefault}
                  required
                  className="w-full border-slate-300 rounded-md focus:ring-brand focus:border-brand text-sm disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={!isCreating && template?.isDefault}
                  required
                  className="w-full border-slate-300 rounded-md focus:ring-brand focus:border-brand text-sm disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="flex justify-between items-center text-sm font-medium text-slate-700 mb-1">
                <span>Message Body</span>
                <span className="text-xs text-slate-400 font-normal">Use {"{{variable}}"} for dynamic data</span>
              </label>
              <textarea
                id="messageBodyTextarea"
                name="messageBody"
                value={formData.messageBody}
                onChange={handleChange}
                required
                rows={12}
                className="w-full border-slate-300 rounded-md focus:ring-brand focus:border-brand text-sm font-mono"
                placeholder="Hello {{guardian_name}},&#10;Your ward {{student_name}}..."
              />
            </div>
            
            {template?.isDefault && (
               <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded text-xs border border-amber-200">
                 <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                 <p>This is a default template. You can edit the message body, but the name and category cannot be changed.</p>
               </div>
            )}
          </div>

          <div className="space-y-4 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-3">Live Preview</h4>
              <div className="bg-[#E5DDD5] rounded-lg p-4 h-[200px] overflow-y-auto relative border border-slate-200 shadow-inner">
                {/* Simulated WhatsApp Chat Bubble */}
                <div className="bg-white p-3 rounded-b-lg rounded-tr-lg shadow-sm w-5/6 text-sm whitespace-pre-wrap relative text-[#111B21]">
                  {previewText || <span className="text-slate-400 italic">Type a message to see preview...</span>}
                  <div className="text-[10px] text-slate-400 text-right mt-1">12:00 PM</div>
                  {/* Tail */}
                  <div className="absolute top-0 -left-2 w-3 h-3 bg-white" style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}></div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-3">Available Variables</h4>
              <p className="text-xs text-slate-400 mb-2">Click any variable below to insert it at your cursor:</p>
              <div className="max-h-[220px] overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3 kc-scrollbar">
                {variableGroups.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{group.title}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {group.variables.map((variable) => (
                        <button
                          key={variable}
                          type="button"
                          onClick={() => insertVariable(variable)}
                          className="px-2 py-1 text-xs bg-white border border-slate-200 text-slate-700 hover:text-brand hover:border-brand/40 rounded shadow-sm hover:shadow transition-all font-mono"
                        >
                          {`{{${variable}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded text-sm font-medium hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-brand text-white rounded text-sm font-semibold hover:bg-teal-800 disabled:opacity-50">
            {saving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
