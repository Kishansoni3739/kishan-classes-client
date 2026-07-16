import React, { useState, useEffect } from "react";
import { api } from "../api/http";
import { Plus, Pencil, Trash2, Calendar, MessageSquare } from "lucide-react";
import { Modal } from "./Modal.jsx";

export function StudentRemarksTab({ student, userRole, currentUserId }) {
  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRemark, setEditingRemark] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    category: "academic",
    text: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchRemarks = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/remarks", {
        params: { student: student._id }
      });
      setRemarks(data);
    } catch (err) {
      setError("Failed to load remarks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (student?._id) {
      fetchRemarks();
    }
  }, [student]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.text.trim()) return;

    setSubmitting(true);
    try {
      if (editingRemark) {
        await api.put(`/remarks/${editingRemark._id}`, {
          category: formData.category,
          text: formData.text
        });
      } else {
        await api.post("/remarks", {
          student: student._id,
          category: formData.category,
          text: formData.text
        });
      }
      setFormData({ category: "academic", text: "" });
      setEditingRemark(null);
      setShowAddModal(false);
      fetchRemarks();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save remark.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (remark) => {
    setEditingRemark(remark);
    setFormData({
      category: remark.category,
      text: remark.text
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this remark?")) return;
    try {
      await api.delete(`/remarks/${id}`);
      fetchRemarks();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete remark.");
    }
  };

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading remarks...</div>;
  if (error) return <div className="p-4 text-sm text-rose-500">{error}</div>;

  const canAdd = userRole === "teacher" || userRole === "admin";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg text-ink">Progress & Behavioral Remarks</h3>
          <span className="bg-brand/10 text-brand text-xs font-semibold px-2 py-0.5 rounded-full">{remarks.length} Total</span>
        </div>
        {canAdd && (
          <button
            onClick={() => {
              setEditingRemark(null);
              setFormData({ category: "academic", text: "" });
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand rounded-md hover:bg-teal-800 transition-colors"
          >
            <Plus size={14} /> Add Remark
          </button>
        )}
      </div>

      {remarks.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
          <MessageSquare className="mx-auto text-slate-300 mb-2" size={40} />
          <p className="text-sm text-slate-500">No remarks added yet for this student.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {remarks.map(remark => {
            const authorUserId = remark.user?._id || remark.user || remark.teacher?.user?._id || remark.teacher?.user || "";
            const isOwn = Boolean(authorUserId && currentUserId && authorUserId.toString() === currentUserId.toString());
            const dateStr = new Date(remark.createdAt).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <div key={remark._id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2 hover:shadow transition-shadow relative">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                      remark.category === "behavioral" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
                    }`}>
                      {remark.category}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                      <Calendar size={12} /> {dateStr}
                    </span>
                  </div>
                  {(userRole === "admin" || isOwn) && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEdit(remark)}
                        className="p-1 text-slate-400 hover:text-brand hover:bg-brand/5 rounded transition-colors"
                        title="Edit Remark"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(remark._id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete Remark"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{remark.text}</p>
                <div className="text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-50">
                  Added by: <span className="text-slate-600 font-bold">{remark.teacherName || "Teacher"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <Modal title={editingRemark ? "Edit Progress Remark" : "Add Progress Remark"} onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg w-full">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Remark Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="academic">Academic Progress</option>
                <option value="behavioral">Behavioral Insights</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Remark Details *</label>
              <textarea
                required
                rows={4}
                value={formData.text}
                onChange={e => setFormData({ ...formData, text: e.target.value })}
                placeholder="e.g. Exhibiting excellent conceptual clarity in physics tests. Consistent homework solver."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-300 rounded text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-brand text-white rounded text-sm font-semibold hover:bg-teal-800 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Remark"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
