import { X } from "lucide-react";

export const Modal = ({ isOpen = true, title, children, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-2 md:p-4">
    <section className="flex flex-col max-h-[95vh] w-[95vw] md:w-full md:max-h-[92vh] max-w-3xl overflow-hidden rounded-xl bg-white shadow-soft">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 md:px-5 md:py-4">
        <h2 className="text-base md:text-lg font-semibold text-ink">{title}</h2>
        <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-5 kc-scrollbar">{children}</div>
    </section>
  </div>
  );
};
