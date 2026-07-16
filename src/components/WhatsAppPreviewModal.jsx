import React, { useState, useEffect } from "react";
import { Modal } from "./Modal.jsx";
import { getWhatsAppUrl } from "../utils/whatsappHelper.js";
import { MessageCircle, Edit2 } from "lucide-react";

export const WhatsAppPreviewModal = ({ 
  isOpen, 
  onClose, 
  title = "Send WhatsApp Message", 
  generatedMessage, 
  recipientPhone,
  recipientName
}) => {
  const [message, setMessage] = useState(generatedMessage);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setMessage(generatedMessage);
  }, [generatedMessage]);

  if (!isOpen) return null;

  const handleSend = () => {
    const url = getWhatsAppUrl(recipientPhone, message);
    if (url) {
      window.open(url, "_blank");
      onClose(true); // pass true to indicate it was sent (or at least opened)
    } else {
      alert("Invalid phone number");
    }
  };

  return (
    <Modal title={title} onClose={() => onClose(false)}>
      <div className="space-y-4">
        {recipientName && (
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-md border border-slate-100">
            <span className="text-sm text-slate-500">Recipient:</span>
            <div className="text-right">
              <div className="font-medium text-slate-800">{recipientName}</div>
              <div className="text-xs text-slate-500">{recipientPhone}</div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-700">Message Preview</h3>
          <button 
            type="button" 
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs flex items-center gap-1 text-brand hover:text-teal-700"
          >
            <Edit2 size={12} /> {isEditing ? "Done Editing" : "Edit Message"}
          </button>
        </div>

        {isEditing ? (
          <textarea
            className="w-full h-48 p-3 text-sm border border-brand rounded-md focus:outline-none focus:ring-1 focus:ring-brand"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        ) : (
          <div className="w-full h-48 p-3 text-sm border border-slate-200 rounded-md bg-slate-50 overflow-y-auto whitespace-pre-wrap">
            {message}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <button 
            type="button" 
            className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-md hover:bg-slate-50"
            onClick={() => onClose(false)}
          >
            Skip
          </button>
          <button 
            type="button" 
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#25D366] rounded-md hover:bg-[#1da851]"
            onClick={handleSend}
          >
            <MessageCircle size={16} />
            Send via WhatsApp
          </button>
        </div>
      </div>
    </Modal>
  );
};
