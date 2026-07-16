import React, { useState } from "react";
import { Modal } from "./Modal.jsx";
import { getWhatsAppUrl } from "../utils/whatsappHelper.js";
import { MessageCircle, CheckCircle } from "lucide-react";

export const WhatsAppBulkModal = ({
  isOpen,
  onClose,
  title = "Bulk WhatsApp Messaging",
  recipients, // Array of { name, phone, message }
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen) return null;

  const total = recipients.length;
  const currentRecipient = recipients[currentIndex];
  const isComplete = currentIndex >= total;

  const handleSendNext = () => {
    if (currentRecipient) {
      const url = getWhatsAppUrl(currentRecipient.phone, currentRecipient.message);
      if (url) {
        window.open(url, "_blank");
      } else {
        alert(`Invalid phone number for ${currentRecipient.name}`);
      }
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-6">
        <div className="text-center pb-4 border-b border-slate-100">
          <p className="text-sm text-slate-500 mb-2">Progress</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-bold text-brand">{Math.min(currentIndex, total)}</span>
            <span className="text-xl text-slate-400">/</span>
            <span className="text-xl text-slate-600">{total}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">messages processed</p>
        </div>

        {isComplete ? (
          <div className="flex flex-col items-center justify-center py-6 text-emerald-600">
            <CheckCircle size={48} className="mb-3" />
            <p className="font-semibold text-lg">All messages processed!</p>
            <p className="text-sm text-slate-500 text-center mt-1">
              You can close this window now.
            </p>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-1">Up Next:</h4>
            <div className="text-lg font-bold text-slate-900">{currentRecipient?.name}</div>
            <div className="text-sm text-slate-500 mb-4">{currentRecipient?.phone}</div>
            
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Message Preview</div>
            <div className="bg-white border border-slate-200 p-3 rounded-md text-sm text-slate-700 max-h-32 overflow-y-auto whitespace-pre-wrap">
              {currentRecipient?.message}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-md hover:bg-slate-50"
            onClick={onClose}
          >
            {isComplete ? "Close" : "Cancel"}
          </button>
          {!isComplete && (
            <button
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#25D366] rounded-md hover:bg-[#1da851]"
              onClick={handleSendNext}
            >
              <MessageCircle size={16} />
              Open WhatsApp & Next
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
