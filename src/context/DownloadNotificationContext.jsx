import React, { createContext, useContext, useState } from "react";
import { CheckCircle, ExternalLink, X } from "lucide-react";
import { fileOpenerService } from "../services/fileOpenerService.js";

const DownloadNotificationContext = createContext(null);

export const DownloadNotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);

  const triggerDownloadNotification = ({ filename, localPath, mimeType, title }) => {
    setNotification({
      isOpen: true,
      filename,
      localPath,
      mimeType: mimeType || "application/pdf",
      title: title || filename,
    });
  };

  const closeNotification = () => setNotification(null);

  return (
    <DownloadNotificationContext.Provider
      value={{
        notification,
        triggerDownloadNotification,
        closeNotification,
      }}
    >
      {children}
      {notification && notification.isOpen && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md w-[92%] sm:w-full p-4 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Download Complete</p>
              <p className="text-sm font-semibold truncate text-slate-100">{notification.filename}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={async () => {
                try {
                  await fileOpenerService.openLocalFile({
                    localPath: notification.localPath,
                    filename: notification.filename,
                    mimeType: notification.mimeType,
                  });
                } catch (e) {
                  alert(e.message || "Could not open file.");
                }
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink size={14} /> Open
            </button>
            <button
              onClick={closeNotification}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </DownloadNotificationContext.Provider>
  );
};

export const useDownloadNotification = () => useContext(DownloadNotificationContext);
