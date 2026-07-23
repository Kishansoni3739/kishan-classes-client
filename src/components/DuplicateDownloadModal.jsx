import React from "react";
import { AlertCircle, Download, X } from "lucide-react";

export const DuplicateDownloadModal = ({
  isOpen,
  filename,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
            <span>File Already Downloaded</span>
          </div>
          <button
            onClick={onCancel}
            className="text-amber-400 hover:text-amber-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-800 text-sm">
            This file has already been downloaded to your device.
          </p>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-700 truncate">
            {filename}
          </div>
          <p>Do you want to download it again?</p>
        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold text-white bg-brand hover:bg-teal-800 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Download size={14} />
            Download Again
          </button>
        </div>
      </div>
    </div>
  );
};
