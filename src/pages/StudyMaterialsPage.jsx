import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, Search, Filter, Download, Eye, Pencil, Trash2, 
  Copy, FileText, Link, Share2, AlertCircle, X, Check, 
  Loader2, File, Image, UploadCloud, ChevronRight, RefreshCw,
  ExternalLink
} from "lucide-react";
import { api, API_URL } from "../api/http.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Modal } from "../components/Modal.jsx";
import { WhatsAppPreviewModal } from "../components/WhatsAppPreviewModal.jsx";
import { WhatsAppBulkModal } from "../components/WhatsAppBulkModal.jsx";
import { date as formatDate } from "../utils/format.js";
import { useSearchParams } from "react-router-dom";
import { historyService } from "../services/historyService.js";
import { downloadService } from "../services/downloadService.js";
import { fileOpenerService } from "../services/fileOpenerService.js";
import { DuplicateDownloadModal } from "../components/DuplicateDownloadModal.jsx";

export const StudyMaterialsPage = () => {
  const { user } = useAuth();
  const role = user?.role || "student";
  const [searchParams, setSearchParams] = useSearchParams();

  // Download Manager States
  const [downloadHistoryMap, setDownloadHistoryMap] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});
  const [duplicateModal, setDuplicateModal] = useState({
    isOpen: false,
    materialItem: null,
    fileObj: null,
    filename: "",
  });

  // State for Listing
  const [materials, setMaterials] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters State
  const [subjectFilter, setSubjectFilter] = useState("");
  const [uploaderFilter, setUploaderFilter] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: "", end: "" });
  const [sortBy, setSortBy] = useState("newest");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Lookups & Options
  const [subjects, setSubjects] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [allUsersList, setAllUsersList] = useState([]);

  // Modals & Forms
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  // WhatsApp Modals
  const [waSingleModal, setWaSingleModal] = useState(null);
  const [waBulkModal, setWaBulkModal] = useState(null);

  // Form Fields State
  const [formTitle, setFormTitle] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAudienceType, setFormAudienceType] = useState("all");
  const [formSelectedStudentIds, setFormSelectedStudentIds] = useState([]);
  const [formSelectedTeacherIds, setFormSelectedTeacherIds] = useState([]);
  const [formSelectedBatchIds, setFormSelectedBatchIds] = useState([]);
  const [formFiles, setFormFiles] = useState([]); // Array of { url, name, size, mimeType, uploadedAt }
  const [formExternalUrls, setFormExternalUrls] = useState([""]);
  const [formWhatsappEnabled, setFormWhatsappEnabled] = useState(false);

  // Form Search/Filtering within Recipient list
  const [studentSearchText, setStudentSearchText] = useState("");
  const [teacherSearchText, setTeacherSearchText] = useState("");
  const [batchStudentSelectionMode, setBatchStudentSelectionMode] = useState("entire"); // entire or particular
  const [selectedBatchIdForDetails, setSelectedBatchIdForDetails] = useState("");

  // File Upload State
  const [uploadingFiles, setUploadingFiles] = useState({}); // fileId -> progress percentage
  const fileInputRef = useRef(null);

  // Fetch Listing
  const fetchMaterials = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page,
        limit: 10,
        search,
        subject: subjectFilter,
        uploader: uploaderFilter,
        audienceType: audienceFilter,
        batch: batchFilter,
        sortBy
      };
      if (dateRangeFilter.start || dateRangeFilter.end) {
        params.dateRange = JSON.stringify(dateRangeFilter);
      }

      const { data } = await api.get("/study-materials", { params });
      setMaterials(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load materials");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Lookups
  const fetchLookups = async () => {
    try {
      const [subsRes, batchesRes] = await Promise.all([
        api.get("/subjects?limit=1000"),
        api.get("/batches?limit=1000")
      ]);
      setSubjects(subsRes.data.items || []);
      setBatches(batchesRes.data.items || []);

      if (role === "admin" || role === "teacher") {
        const studRes = await api.get("/students?limit=1000");
        setStudents(studRes.data.items || []);
      }

      if (role === "admin") {
        const teachRes = await api.get("/teachers?limit=1000");
        setTeachers(teachRes.data.items || []);

        // Load all users (admins) for uploader filter
        const usersRes = await api.get("/admin/users", { params: { limit: 1000 } }).catch(() => null);
        if (usersRes) {
          setAllUsersList(usersRes.data.items || []);
        }
      }
    } catch (err) {
      console.error("Error loading lookups:", err);
    }
  };

  useEffect(() => {
    fetchLookups();
  }, [role]);

  useEffect(() => {
    fetchMaterials();
  }, [page, subjectFilter, uploaderFilter, audienceFilter, batchFilter, dateRangeFilter, sortBy]);

  useEffect(() => {
    const openId = searchParams.get("openId");
    if (openId) {
      openDetailsModal(openId);
      searchParams.delete("openId");
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  // Handle Search Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMaterials();
  };

  // Trigger WhatsApp Previews
  const triggerWhatsAppNotifications = async (materialId, title) => {
    try {
      const { data } = await api.get(`/study-materials/${materialId}/whatsapp-preview`);
      const { recipients } = data;
      if (!recipients || recipients.length === 0) {
        showToast("No active WhatsApp recipients found for this material audience.");
        return;
      }

      if (recipients.length === 1) {
        setWaSingleModal({
          isOpen: true,
          recipientPhone: recipients[0].phone,
          recipientName: recipients[0].name,
          generatedMessage: recipients[0].message,
          title: `Notify ${recipients[0].name}`
        });
      } else {
        setWaBulkModal({
          isOpen: true,
          title: `Notify WhatsApp: ${title}`,
          recipients
        });
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to generate WhatsApp notification previews.", "error");
    }
  };

  // Toast Display Helper
  const showToast = (msg, type = "success") => {
    if (type === "success") {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 4000);
    } else {
      setError(msg);
      setTimeout(() => setError(""), 4000);
    }
  };

  // Copy Direct Link Helper
  const handleCopyLink = (fileUrl, fileName) => {
    navigator.clipboard.writeText(fileUrl)
      .then(() => showToast(`Link copied for ${fileName}!`))
      .catch(() => showToast("Failed to copy link", "error"));
  };

  // Soft Delete Material
  const handleDeleteMaterial = async (id) => {
    if (!window.confirm("Are you sure you want to delete this study material?")) return;
    try {
      await api.delete(`/study-materials/${id}`);
      showToast("Material deleted successfully.");
      fetchMaterials();
      if (detailItem && detailItem._id === id) {
        setDetailItem(null);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Could not delete material", "error");
    }
  };

  // Upload to Endpoint
  const uploadFileToServer = async (fileObject) => {
    const fileId = Math.random().toString(36).substring(2, 9);
    setUploadingFiles(prev => ({ ...prev, [fileId]: 0 }));

    const formData = new FormData();
    formData.append("file", fileObject);

    try {
      const { data } = await api.post("/study-materials/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadingFiles(prev => ({ ...prev, [fileId]: percentCompleted }));
        }
      });

      setFormFiles(prev => [...prev, data]);
      setUploadingFiles(prev => {
        const copy = { ...prev };
        delete copy[fileId];
        return copy;
      });
    } catch (err) {
      showToast(err.response?.data?.message || `Failed to upload ${fileObject.name}`, "error");
      setUploadingFiles(prev => {
        const copy = { ...prev };
        delete copy[fileId];
        return copy;
      });
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        // Enforce 50MB limit
        if (file.size > 50 * 1024 * 1024) {
          showToast(`File ${file.name} exceeds 50MB size limit.`, "error");
          return;
        }
        uploadFileToServer(file);
      });
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        if (file.size > 50 * 1024 * 1024) {
          showToast(`File ${file.name} exceeds 50MB size limit.`, "error");
          return;
        }
        uploadFileToServer(file);
      });
    }
  };

  // Open Share Form Modal
  const openShareForm = (material = null) => {
    if (material) {
      setEditingId(material._id);
      setFormTitle(material.title);
      setFormSubject(material.subject?._id || material.subject || "");
      setFormDescription(material.description || "");
      setFormAudienceType(material.audienceType);
      setFormSelectedStudentIds(material.recipientStudentIds?.map(s => s._id || s) || []);
      setFormSelectedTeacherIds(material.recipientTeacherIds?.map(t => t._id || t) || []);
      setFormSelectedBatchIds(material.recipientBatchIds?.map(b => b._id || b) || []);
      setFormFiles(material.files || []);
      setFormExternalUrls(material.externalUrls?.length > 0 ? material.externalUrls : [""]);
      setFormWhatsappEnabled(material.whatsappEnabled || false);
      if (material.audienceType === "batch" && material.recipientBatchIds?.length > 0) {
        setSelectedBatchIdForDetails(material.recipientBatchIds[0]?._id || material.recipientBatchIds[0] || "");
      }
    } else {
      setEditingId(null);
      setFormTitle("");
      setFormSubject("");
      setFormDescription("");
      // Default audience rules
      setFormAudienceType(role === "teacher" ? "batch" : "all");
      setFormSelectedStudentIds([]);
      setFormSelectedTeacherIds([]);
      setFormSelectedBatchIds([]);
      setFormFiles([]);
      setFormExternalUrls([""]);
      setFormWhatsappEnabled(false);
      setSelectedBatchIdForDetails("");
      setBatchStudentSelectionMode("entire");
    }
    setIsFormOpen(true);
  };

  // Submit Share Form Modal
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formTitle || !formSubject || !formAudienceType) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    if (formTitle.length > 150) {
      showToast("Title cannot exceed 150 characters.", "error");
      return;
    }

    if (formFiles.length === 0 && formExternalUrls.filter(Boolean).length === 0) {
      showToast("Please upload at least one file or specify an external URL.", "error");
      return;
    }

    // Build payload
    const payload = {
      title: formTitle,
      subject: formSubject,
      description: formDescription,
      audienceType: formAudienceType,
      files: formFiles,
      externalUrls: formExternalUrls.filter(Boolean),
      whatsappEnabled: formWhatsappEnabled
    };

    if (formAudienceType === "batch") {
      payload.recipientBatchIds = formSelectedBatchIds;
    } else if (formAudienceType === "particular-students") {
      payload.recipientStudentIds = formSelectedStudentIds;
    } else if (formAudienceType === "particular-teachers") {
      payload.recipientTeacherIds = formSelectedTeacherIds;
    }

    try {
      let savedRecord;
      if (editingId) {
        const { data } = await api.put(`/study-materials/${editingId}`, payload);
        savedRecord = data;
        showToast("Material updated successfully!");
      } else {
        const { data } = await api.post("/study-materials", payload);
        savedRecord = data;
        showToast("Material shared successfully!");
      }

      setIsFormOpen(false);
      fetchMaterials();

      // Trigger WhatsApp Modal if enabled
      if (formWhatsappEnabled && savedRecord) {
        triggerWhatsAppNotifications(savedRecord._id, savedRecord.title);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save material.", "error");
    }
  };

  // Recipient list calculations
  const filteredStudents = students.filter(s => {
    const searchVal = studentSearchText.toLowerCase();
    const nameMatch = s.user?.name?.toLowerCase().includes(searchVal);
    const idMatch = s.studentId?.toLowerCase().includes(searchVal);
    const batchMatch = s.batch?.name?.toLowerCase().includes(searchVal);
    return nameMatch || idMatch || batchMatch;
  });

  const filteredTeachers = teachers.filter(t => {
    const searchVal = teacherSearchText.toLowerCase();
    const nameMatch = t.user?.name?.toLowerCase().includes(searchVal);
    const idMatch = t.employeeId?.toLowerCase().includes(searchVal);
    return nameMatch || idMatch;
  });

  // Batch specific students selection list
  const studentsInSelectedBatch = students.filter(s => {
    const sBatchId = s.batch?._id || s.batch || "";
    return sBatchId.toString() === selectedBatchIdForDetails.toString();
  });

  // Download log stats tracking
  const openDetailsModal = async (id) => {
    try {
      const { data } = await api.get(`/study-materials/${id}`);
      setDetailItem(data);
    } catch (err) {
      showToast("Failed to load details", "error");
    }
  };

  // Refresh Download History Effect
  const refreshDownloadHistory = async () => {
    const history = await historyService.getHistory();
    const map = {};
    history.forEach((rec) => {
      const key = `${rec.materialId}_${rec.fileId || rec.filename}`;
      map[key] = rec;
    });
    setDownloadHistoryMap(map);
  };

  useEffect(() => {
    refreshDownloadHistory();
  }, []);

  const handleInitiateDownload = async (materialItem, fileObj, forceReDownload = false) => {
    const fileId = fileObj.url || fileObj.name;
    const key = `${materialItem._id}_${fileId}`;

    const existing = downloadHistoryMap[key];
    if (existing && !forceReDownload) {
      setDuplicateModal({
        isOpen: true,
        materialItem,
        fileObj,
        filename: existing.filename || fileObj.name,
      });
      return;
    }

    setDuplicateModal({ isOpen: false, materialItem: null, fileObj: null, filename: "" });
    setDownloadProgress((prev) => ({ ...prev, [key]: 1 }));

    try {
      await downloadService.downloadMaterialFile({
        materialId: materialItem._id,
        fileId,
        title: materialItem.title,
        fileUrl: fileObj.url,
        originalFilename: fileObj.name,
        mimeType: fileObj.mimeType,
        onProgress: (percent) => {
          setDownloadProgress((prev) => ({ ...prev, [key]: percent }));
        },
      });

      showToast(`Downloaded ${fileObj.name} successfully!`, "success");
      await refreshDownloadHistory();
    } catch (err) {
      showToast(err.message || "Failed to download material", "error");
    } finally {
      setDownloadProgress((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const handleOpenLocal = async (materialId, fileId, filename) => {
    const key = `${materialId}_${fileId}`;
    const record = downloadHistoryMap[key];
    if (!record) {
      showToast("Local copy not found. Please download again.", "error");
      return;
    }

    try {
      await fileOpenerService.openLocalFile({
        localPath: record.localPath,
        filename: record.filename || filename,
        mimeType: record.mimeType,
      });
    } catch (err) {
      showToast(err.message || "Could not open local file.", "error");
    }
  };

  const handleDeleteLocal = async (materialId, fileId, filename) => {
    const key = `${materialId}_${fileId}`;
    const record = downloadHistoryMap[key];
    const path = record?.localPath || "";

    const ok = await downloadService.deleteLocalMaterial(materialId, fileId, filename || record?.filename, path);
    if (ok) {
      showToast("Local copy deleted.", "success");
      await refreshDownloadHistory();
    } else {
      showToast("Failed to delete local copy.", "error");
    }
  };

  const handleShareLocal = async (materialId, fileId, title) => {
    const key = `${materialId}_${fileId}`;
    const record = downloadHistoryMap[key];
    if (record) {
      await fileOpenerService.shareLocalFile({
        localPath: record.localPath,
        filename: record.filename,
        title: title || record.title,
      });
    }
  };

  // Dynamic formatting of human bytes
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl font-sans text-slate-800">
      {/* Toast banners */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-xl animate-fade-in">
          <Check size={18} />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-rose-500 text-white px-4 py-3 rounded-lg shadow-xl animate-fade-in">
          <AlertCircle size={18} />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm bg-gradient-to-r from-white to-slate-50">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-brand to-slate-800 bg-clip-text text-transparent">
            Study Materials Library
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Upload, manage, and share classroom assets and documents.
          </p>
        </div>
        {(role === "admin" || role === "teacher") && (
          <button
            onClick={() => openShareForm()}
            className="flex items-center gap-2 bg-brand text-white hover:bg-brand-hover active:scale-95 transition-all px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-brand/10 text-sm"
          >
            <Plus size={18} />
            Share Material
          </button>
        )}
      </div>

      {/* Search & Filters Controller */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by title, subject, uploader, uploader role, batch..."
              className="w-full pl-11 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-sm transition-all"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all ${
                showFiltersPanel || subjectFilter || uploaderFilter || audienceFilter || batchFilter || dateRangeFilter.start 
                  ? "border-brand bg-brand/5 text-brand"
                  : "border-slate-200 hover:bg-slate-50 text-slate-600"
              }`}
            >
              <Filter size={16} />
              Filters
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Sort by Title</option>
              <option value="subject">Sort by Subject</option>
            </select>
          </div>
        </form>

        {/* Expandable Advanced Filters Panel */}
        {showFiltersPanel && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-down">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Subject</label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">All Subjects</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
            
            {role === "admin" && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Uploader</label>
                <select
                  value={uploaderFilter}
                  onChange={(e) => setUploaderFilter(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="">All Uploaders</option>
                  {allUsersList.map(u => (
                    <option key={u._id} value={u._id}>{u.name || u.username} ({u.role})</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Audience</label>
              <select
                value={audienceFilter}
                onChange={(e) => setAudienceFilter(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">All Audiences</option>
                <option value="all">Everyone</option>
                <option value="students">All Students</option>
                <option value="teachers">All Teachers</option>
                <option value="batch">Batch Students</option>
                <option value="particular-students">Specific Students</option>
                <option value="particular-teachers">Specific Teachers</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Batch</label>
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">All Batches</option>
                {batches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                  value={dateRangeFilter.start}
                  onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                />
                <span className="self-center text-slate-400 text-sm">to</span>
                <input
                  type="date"
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                  value={dateRangeFilter.end}
                  onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-end justify-end md:col-span-2 lg:col-span-2">
              <button
                type="button"
                onClick={() => {
                  setSubjectFilter("");
                  setUploaderFilter("");
                  setAudienceFilter("");
                  setBatchFilter("");
                  setDateRangeFilter({ start: "", end: "" });
                  setSearch("");
                }}
                className="text-xs font-semibold text-brand hover:text-teal-700 underline"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid/Table Listing */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Loader2 className="w-10 h-10 animate-spin text-brand" />
          <p className="text-slate-500 text-sm mt-3 font-medium">Fetching materials...</p>
        </div>
      ) : materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm text-center px-4">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
            <FileText size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Materials Found</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm">
            Try adjusting your search queries, filters, or share a new document library.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials.map((item) => {
              const isAdmin = role === "admin";
              const isOwner = item.uploadedBy?._id?.toString() === user?.id?.toString() || item.uploadedBy?.toString() === user?.id?.toString();
              const canEdit = isAdmin || isOwner;
              const createdDateStr = formatDate(item.createdAt);

              return (
                <div key={item._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col p-5 relative overflow-hidden group">
                  {/* Top Badges */}
                  <div className="flex justify-between items-center mb-4">
                    <span className="bg-brand/10 text-brand px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      {item.subject?.name || "General"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                      📅 {createdDateStr}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="flex-1 min-h-[90px]">
                    <h3 
                      className="font-bold text-slate-800 hover:text-brand cursor-pointer text-base line-clamp-2 leading-snug mb-1.5"
                      onClick={() => openDetailsModal(item._id)}
                    >
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Files & Links List */}
                  <div className="border-t border-slate-50 my-3.5 pt-3.5 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Files & Resources</div>
                    
                    {/* Files list */}
                    {(item.files || []).length > 0 ? (
                      <div className="space-y-2">
                        {(item.files || []).slice(0, 3).map((file, fIdx) => {
                          const fileId = file.url || file.name;
                          const key = `${item._id}_${fileId}`;
                          const record = downloadHistoryMap[key];
                          const progress = downloadProgress[key];

                          if (progress !== undefined) {
                            return (
                              <div key={fIdx} className="p-2 rounded-xl bg-amber-50 border border-amber-200/80 space-y-1.5">
                                <div className="flex items-center justify-between text-xs text-amber-800 font-bold">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <Loader2 size={13} className="animate-spin text-amber-600 shrink-0" />
                                    <span className="truncate">{file.name}</span>
                                  </div>
                                  <span className="text-[11px] shrink-0">{progress}%</span>
                                </div>
                                <div className="w-full bg-amber-200 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-amber-600 h-full transition-all duration-200" style={{ width: `${progress}%` }} />
                                </div>
                              </div>
                            );
                          }

                          if (record) {
                            return (
                              <div key={fIdx} className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-bold truncate">
                                    <Check size={14} className="text-emerald-600 shrink-0" />
                                    <span className="truncate">{file.name}</span>
                                  </div>
                                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white text-emerald-700 border border-emerald-200 shrink-0">
                                    Downloaded
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-emerald-100">
                                  <button
                                    onClick={() => handleOpenLocal(item._id, fileId, file.name)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-2xs flex items-center gap-1 transition-all"
                                  >
                                    <Eye size={12} /> Open
                                  </button>
                                  <button
                                    onClick={() => handleShareLocal(item._id, fileId, item.title)}
                                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] rounded-lg border border-slate-200 flex items-center gap-1 transition-all"
                                    title="Share Local File"
                                  >
                                    <Share2 size={12} /> Share
                                  </button>
                                  <button
                                    onClick={() => handleInitiateDownload(item, file, true)}
                                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] rounded-lg border border-slate-200 flex items-center gap-1 transition-all"
                                    title="Download Fresh Copy"
                                  >
                                    <RefreshCw size={12} /> Again
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLocal(item._id, fileId, file.name)}
                                    className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 font-semibold text-[11px] rounded-lg border border-rose-200 flex items-center gap-1 transition-all ml-auto"
                                    title="Delete Local Copy"
                                  >
                                    <Trash2 size={12} /> Delete
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={fIdx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition-all text-xs">
                              <div className="flex items-center gap-2 min-w-0 font-medium text-slate-700 truncate pr-2">
                                <FileText size={14} className="text-brand shrink-0" />
                                <span className="truncate">{file.name}</span>
                              </div>
                              <button
                                onClick={() => handleInitiateDownload(item, file)}
                                className="px-3 py-1 bg-brand text-white font-bold text-xs rounded-lg shadow-2xs hover:bg-teal-800 flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
                              >
                                <Download size={13} /> Download
                              </button>
                            </div>
                          );
                        })}
                        {item.files?.length > 3 && (
                          <div className="text-[10px] text-slate-400 font-semibold pl-2">
                            +{item.files.length - 3} more files
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* External links */}
                    {(item.externalUrls || []).length > 0 ? (
                      <div className="space-y-1.5 mt-2">
                        {(item.externalUrls || []).slice(0, 2).map((url, uIdx) => (
                          <a
                            key={uIdx}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-800 hover:underline font-medium bg-slate-50 p-1.5 rounded-lg w-full transition-colors truncate"
                          >
                            <Link size={14} className="text-slate-400 flex-shrink-0" />
                            <span className="truncate flex-1">{url}</span>
                          </a>
                        ))}
                        {item.externalUrls?.length > 2 && (
                          <div className="text-[10px] text-slate-400 font-medium pl-2">
                            +{item.externalUrls.length - 2} more links
                          </div>
                        )}
                      </div>
                    ) : null}

                    {(!item.files || item.files.length === 0) && (!item.externalUrls || item.externalUrls.length === 0) && (
                      <div className="text-xs text-slate-400 italic pl-1">No attachments or links</div>
                    )}
                  </div>

                  {/* Footer Stats & Info */}
                  <div className="border-t border-slate-100 pt-3.5 flex justify-between items-center text-xs">
                    <div>
                      <div className="text-slate-400 text-[10px]">Audience</div>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        item.audienceType === "all" ? "bg-indigo-50 text-indigo-700" :
                        item.audienceType === "students" ? "bg-blue-50 text-blue-700" :
                        item.audienceType === "teachers" ? "bg-amber-50 text-amber-700" :
                        item.audienceType === "batch" ? "bg-purple-50 text-purple-700" :
                        "bg-emerald-50 text-emerald-700"
                      }`}>
                        {item.audienceType === "all" ? "Everyone" :
                         item.audienceType === "students" ? "All Students" :
                         item.audienceType === "teachers" ? "All Teachers" :
                         item.audienceType === "batch" ? `${item.recipientBatchIds?.length || 0} Batches` :
                         item.audienceType === "particular-students" ? "Specific Students" : "Specific Teachers"}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-slate-400 text-[10px] mb-0.5">Uploaded By</div>
                      <span className="font-semibold text-slate-700 block text-xs">{item.uploadedBy?.name || "Unknown"}</span>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">{item.uploaderRole}</span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="border-t border-slate-100 mt-4 pt-3 flex items-center justify-between">
                    <div>
                      {role !== "student" && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[10px]">WA:</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            item.whatsappNotificationStatus === "sent" ? "bg-emerald-50 text-emerald-700" :
                            item.whatsappNotificationStatus === "pending" ? "bg-amber-50 text-amber-700" :
                            item.whatsappNotificationStatus === "failed" ? "bg-rose-50 text-rose-700" :
                            "bg-slate-50 text-slate-400"
                          }`}>
                            {item.whatsappNotificationStatus || "none"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openDetailsModal(item._id)}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {canEdit && (
                        <>
                          <button
                            onClick={() => openShareForm(item)}
                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteMaterial(item._id)}
                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {role !== "student" && (
                        <button
                          onClick={() => triggerWhatsAppNotifications(item._id, item.title)}
                          className="p-2 text-slate-500 hover:text-[#25D366] hover:bg-emerald-50/50 rounded-lg transition-all"
                          title="Share Notification Again"
                        >
                          <Share2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {pages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-sm">
              <span className="text-slate-500">
                Page <strong>{page}</strong> of {pages} ({total} total records)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  disabled={page === pages}
                  onClick={() => setPage(p => Math.min(p + 1, pages))}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Share / Edit Material Form Modal */}
      {isFormOpen && (
        <Modal 
          title={editingId ? "Edit Study Material" : "Share Study Material"} 
          onClose={() => setIsFormOpen(false)}
          width="max-w-3xl"
        >
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={150}
                  required
                  placeholder="e.g. Chapter 5 Physics Revision Notes"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-sm"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block text-right">
                  {formTitle.length}/150 characters
                </span>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                >
                  <option value="">Select Subject</option>
                  {subjects.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Audience Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Audience Type <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  value={formAudienceType}
                  onChange={(e) => {
                    setFormAudienceType(e.target.value);
                    // Reset selected arrays
                    setFormSelectedStudentIds([]);
                    setFormSelectedTeacherIds([]);
                    setFormSelectedBatchIds([]);
                    setSelectedBatchIdForDetails("");
                  }}
                >
                  {role === "admin" && (
                    <>
                      <option value="all">All Teachers & Students</option>
                      <option value="students">All Students</option>
                      <option value="teachers">All Teachers</option>
                      <option value="particular-teachers">Particular Teachers</option>
                    </>
                  )}
                  <option value="batch">Batch Students</option>
                  <option value="particular-students">Particular Students</option>
                </select>
              </div>
            </div>

            {/* Sub-audiences selection panels */}
            {formAudienceType === "particular-students" && (
              <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-700">Select Students</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormSelectedStudentIds(filteredStudents.map(s => s._id))}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Select All (Filtered)
                    </button>
                    <span className="text-slate-300 text-xs">|</span>
                    <button
                      type="button"
                      onClick={() => setFormSelectedStudentIds([])}
                      className="text-xs font-semibold text-slate-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search by ID, Name, or Batch..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                    value={studentSearchText}
                    onChange={(e) => setStudentSearchText(e.target.value)}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 bg-white rounded-lg p-2 divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">No students match filter</div>
                  ) : (
                    filteredStudents.map(s => (
                      <label key={s._id} className="flex items-center gap-3.5 py-2 px-2 hover:bg-slate-50 rounded cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          className="rounded text-brand focus:ring-brand w-4 h-4"
                          checked={formSelectedStudentIds.includes(s._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormSelectedStudentIds(prev => [...prev, s._id]);
                            } else {
                              setFormSelectedStudentIds(prev => prev.filter(id => id !== s._id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-bold text-slate-700">{s.user?.name || "Student"}</div>
                          <div className="text-[10px] text-slate-400">
                            ID: {s.studentId} | Batch: {s.batch?.name || "No Batch"}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  Selected <strong>{formSelectedStudentIds.length}</strong> students
                </div>
              </div>
            )}

            {formAudienceType === "particular-teachers" && role === "admin" && (
              <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-700">Select Teachers</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormSelectedTeacherIds(filteredTeachers.map(t => t._id))}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300 text-xs">|</span>
                    <button
                      type="button"
                      onClick={() => setFormSelectedTeacherIds([])}
                      className="text-xs font-semibold text-slate-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search by Teacher ID or Name..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                    value={teacherSearchText}
                    onChange={(e) => setTeacherSearchText(e.target.value)}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 bg-white rounded-lg p-2 divide-y divide-slate-100">
                  {filteredTeachers.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">No teachers found</div>
                  ) : (
                    filteredTeachers.map(t => (
                      <label key={t._id} className="flex items-center gap-3.5 py-2 px-2 hover:bg-slate-50 rounded cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          className="rounded text-brand focus:ring-brand w-4 h-4"
                          checked={formSelectedTeacherIds.includes(t._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormSelectedTeacherIds(prev => [...prev, t._id]);
                            } else {
                              setFormSelectedTeacherIds(prev => prev.filter(id => id !== t._id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-bold text-slate-700">{t.user?.name || "Teacher"}</div>
                          <div className="text-[10px] text-slate-400">
                            Employee ID: {t.employeeId}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {formAudienceType === "batch" && (
              <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Batch <span className="text-rose-500">*</span></label>
                    <select
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                      value={selectedBatchIdForDetails}
                      onChange={(e) => {
                        const bId = e.target.value;
                        setSelectedBatchIdForDetails(bId);
                        if (bId) {
                          setFormSelectedBatchIds([bId]);
                        } else {
                          setFormSelectedBatchIds([]);
                        }
                        setFormSelectedStudentIds([]);
                      }}
                    >
                      <option value="">Select Target Batch</option>
                      {batches.map(b => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  {selectedBatchIdForDetails && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mode</label>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="selectionMode"
                            checked={batchStudentSelectionMode === "entire"}
                            onChange={() => {
                              setBatchStudentSelectionMode("entire");
                              setFormSelectedStudentIds([]);
                              setFormAudienceType("batch");
                            }}
                          />
                          Entire Batch
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="selectionMode"
                            checked={batchStudentSelectionMode === "particular"}
                            onChange={() => {
                              setBatchStudentSelectionMode("particular");
                              // Convert audience selection style
                              setFormAudienceType("particular-students");
                            }}
                          />
                          Select Particular Students from Batch
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {selectedBatchIdForDetails && (
                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 border-b border-slate-100 pb-2 mb-2">
                      <div>Batch Name: <span className="text-brand">{batches.find(b => b._id === selectedBatchIdForDetails)?.name}</span></div>
                      <div>Total Batch Students: <span className="text-slate-900">{studentsInSelectedBatch.length}</span></div>
                    </div>

                    {batchStudentSelectionMode === "particular" && (
                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                        {studentsInSelectedBatch.map(s => (
                          <label key={s._id} className="flex items-center gap-3 py-1.5 text-xs cursor-pointer hover:bg-slate-50">
                            <input
                              type="checkbox"
                              className="rounded text-brand focus:ring-brand w-3.5 h-3.5"
                              checked={formSelectedStudentIds.includes(s._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormSelectedStudentIds(prev => [...prev, s._id]);
                                } else {
                                  setFormSelectedStudentIds(prev => prev.filter(id => id !== s._id));
                                }
                              }}
                            />
                            <div>
                              <span className="font-semibold text-slate-800">{s.user?.name}</span>
                              <span className="text-slate-400 text-[10px] ml-2">({s.studentId})</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Choose Files section */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Choose Files (Multiple Uploads, Max 20 files, Max 50MB per file)
              </label>
              
              {/* Drag and Drop Box */}
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-brand bg-slate-50 hover:bg-slate-100/50 p-6 rounded-xl cursor-pointer text-center transition-all flex flex-col items-center justify-center gap-1.5"
              >
                <UploadCloud className="w-10 h-10 text-slate-400" />
                <div className="text-sm font-semibold text-slate-700">Drag & Drop files here, or browse</div>
                <div className="text-xs text-slate-400">PDF, Word, PowerPoint, Excel, Images, ZIP</div>
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Uploading Progress Status */}
              {Object.keys(uploadingFiles).length > 0 && (
                <div className="mt-3 space-y-2">
                  {Object.entries(uploadingFiles).map(([id, progress]) => (
                    <div key={id} className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-xs">
                      <div className="flex justify-between items-center font-semibold mb-1">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
                          Uploading file...
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div className="bg-brand h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Uploaded Files Grid */}
              {formFiles.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {formFiles.map((file, idx) => {
                    const isImg = file.mimeType?.startsWith("image/");
                    return (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs relative">
                        {isImg ? (
                          <div className="w-10 h-10 rounded bg-slate-50 border overflow-hidden flex-shrink-0">
                            <img src={file.url} alt="preview" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded bg-brand/5 border border-brand/10 text-brand flex items-center justify-center flex-shrink-0">
                            <FileText size={20} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                            {file.name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {formatBytes(file.size)} | {file.mimeType?.split("/")[1]?.toUpperCase() || "FILE"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 p-0.5 hover:bg-slate-100 rounded-md transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* External File URL */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-slate-700">
                  External File URLs (e.g. Google Drive, OneDrive, YouTube)
                </label>
                <button
                  type="button"
                  onClick={() => setFormExternalUrls(prev => [...prev, ""])}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  + Add URL Input
                </button>
              </div>
              <div className="space-y-2">
                {formExternalUrls.map((url, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                      value={url}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormExternalUrls(prev => {
                          const copy = [...prev];
                          copy[idx] = val;
                          return copy;
                        });
                      }}
                    />
                    {formExternalUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormExternalUrls(prev => prev.filter((_, i) => i !== idx))}
                        className="p-2 border border-slate-200 hover:border-rose-200 hover:text-rose-600 rounded-lg text-slate-400 transition-all flex items-center justify-center"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Description (Optional, Rich Text Area)
              </label>
              <textarea
                maxLength={3000}
                placeholder="Describe this study material resource..."
                className="w-full h-32 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-sm"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block text-right">
                {formDescription.length}/3000 characters
              </span>
            </div>

            {/* Notify via WhatsApp */}
            <label className="flex items-center gap-3 p-3 bg-slate-50 border rounded-xl cursor-pointer">
              <input
                type="checkbox"
                className="rounded text-brand focus:ring-brand w-4 h-4"
                checked={formWhatsappEnabled}
                onChange={(e) => setFormWhatsappEnabled(e.target.checked)}
              />
              <div>
                <div className="text-xs font-bold text-slate-800">Notify Through WhatsApp</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  If enabled, a WhatsApp notification preview modal will open after successfully sharing this material.
                </div>
              </div>
            </label>

            {/* Submit / Cancel Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg font-medium text-sm transition-all"
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-brand text-white hover:bg-brand-hover active:scale-95 rounded-lg font-semibold text-sm transition-all shadow-md shadow-brand/10"
              >
                {editingId ? "Save Changes" : "Share Material"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Details View Modal */}
      {detailItem && (
        <Modal
          title={detailItem.title}
          onClose={() => setDetailItem(null)}
          width="max-w-2xl"
        >
          <div className="space-y-6">
            {/* Metadata headers */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-b border-slate-100 pb-4 text-xs font-medium text-slate-500">
              <div>
                <span className="text-slate-400 block font-normal">Subject:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{detailItem.subject?.name || "General"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-normal">Uploaded By:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block capitalize">{detailItem.uploadedBy?.name || "Unknown"} ({detailItem.uploaderRole})</span>
              </div>
              <div>
                <span className="text-slate-400 block font-normal">Upload Date:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{formatDate(detailItem.createdAt)}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-normal">Audience:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block capitalize">{detailItem.audienceType || "Everyone"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-normal">Total Downloads:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{detailItem.totalDownloads || 0}</span>
              </div>
              {detailItem.uniqueDownloads !== undefined && (
                <div>
                  <span className="text-slate-400 block font-normal">Unique Downloads:</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{detailItem.uniqueDownloads}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {detailItem.description && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{detailItem.description}</div>
              </div>
            )}

            {/* Files List */}
            {detailItem.files && detailItem.files.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Attached Files</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {detailItem.files.map((file, idx) => {
                    const fileId = file.url || file.name;
                    const key = `${detailItem._id}_${fileId}`;
                    const record = downloadHistoryMap[key];
                    const progress = downloadProgress[key];

                    return (
                      <div key={idx} className="p-3 border border-slate-200 rounded-xl bg-white shadow-2xs space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="p-2 bg-brand/5 border border-brand/10 text-brand rounded-lg flex-shrink-0">
                              <FileText size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                                {file.name}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {formatBytes(file.size)} | {file.mimeType?.split("/")[1]?.toUpperCase()}
                              </div>
                            </div>
                          </div>
                          {record && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              Downloaded
                            </span>
                          )}
                        </div>

                        {progress !== undefined ? (
                          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-amber-800">
                              <span>Downloading...</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-amber-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-amber-600 h-full transition-all duration-200" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
                            {record ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenLocal(detailItem._id, fileId, file.name)}
                                  className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs flex items-center gap-1 transition-all"
                                >
                                  <Eye size={13} /> Open
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleShareLocal(detailItem._id, fileId, detailItem.title)}
                                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-all"
                                >
                                  <Share2 size={13} /> Share
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInitiateDownload(detailItem, file, true)}
                                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-all"
                                >
                                  <RefreshCw size={13} /> Download Again
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLocal(detailItem._id, fileId, file.name)}
                                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1 transition-all ml-auto"
                                >
                                  <Trash2 size={13} /> Delete Local
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleInitiateDownload(detailItem, file)}
                                className="w-full py-1.5 text-xs font-bold text-white bg-brand hover:bg-teal-800 rounded-lg shadow-2xs flex items-center justify-center gap-1.5 transition-all"
                              >
                                <Download size={14} /> Download File
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* External Links */}
            {detailItem.externalUrls && detailItem.externalUrls.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">External Links</h4>
                <div className="space-y-2">
                  {detailItem.externalUrls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/50 transition-all text-xs font-semibold text-slate-700 min-w-0"
                    >
                      <span className="truncate pr-4">{url}</span>
                      <ExternalLink size={14} className="flex-shrink-0 text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* WhatsApp Notification status and repeat action */}
            {role !== "student" && (
              <div className="bg-emerald-50/50 p-4 border border-emerald-100/50 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-800">WhatsApp Notification Status</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Current Status: <strong className="uppercase text-emerald-700">{detailItem.whatsappNotificationStatus || "none"}</strong>
                  </div>
                </div>
                <button
                  onClick={() => triggerWhatsAppNotifications(detailItem._id, detailItem.title)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#25D366] hover:bg-[#1da851] rounded-lg shadow-sm transition-all"
                >
                  <Share2 size={12} />
                  Share Notification
                </button>
              </div>
            )}

            {/* Download Tracking History Logs (Admins and Uploaders only) */}
            {role !== "student" && detailItem.downloadLogs && detailItem.downloadLogs.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Download Tracking History</h4>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/30 p-2">
                  {detailItem.downloadLogs.map((log, lIdx) => (
                    <div key={lIdx} className="py-2 px-3 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800">{log.user?.name || log.userName || "User"}</span>
                        <span className="text-slate-400 text-[10px] block font-mono">{log.userRole || "User"}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {formatDate(log.downloadedAt || log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Control buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg font-medium text-sm transition-all"
                onClick={() => setDetailItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* WhatsApp Single Preview Modal */}
      {waSingleModal && (
        <WhatsAppPreviewModal
          isOpen={waSingleModal.isOpen}
          onClose={() => setWaSingleModal(null)}
          recipientPhone={waSingleModal.recipientPhone}
          recipientName={waSingleModal.recipientName}
          generatedMessage={waSingleModal.generatedMessage}
          title={waSingleModal.title}
        />
      )}

      {/* WhatsApp Bulk Notification Modal */}
      {waBulkModal && (
        <WhatsAppBulkModal
          isOpen={waBulkModal.isOpen}
          onClose={() => setWaBulkModal(null)}
          recipients={waBulkModal.recipients}
          title={waBulkModal.title}
        />
      )}

      {/* Duplicate Download Confirmation Modal */}
      <DuplicateDownloadModal
        isOpen={duplicateModal.isOpen}
        filename={duplicateModal.filename}
        onCancel={() => setDuplicateModal({ isOpen: false, materialItem: null, fileObj: null, filename: "" })}
        onConfirm={() =>
          handleInitiateDownload(duplicateModal.materialItem, duplicateModal.fileObj, true)
        }
      />
    </div>
  );
};
