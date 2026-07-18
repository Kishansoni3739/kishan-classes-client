import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";

export const NotFound = () => {
  return (
    <div className="grid min-h-[75vh] place-items-center bg-paper px-6 py-12 sm:py-24 lg:px-8">
      <div className="text-center max-w-md p-8 rounded-2xl border border-slate-100 bg-white shadow-soft">
        <div className="flex justify-center text-brand mb-4">
          <AlertCircle size={48} className="animate-pulse" />
        </div>
        <span className="rounded-full bg-saffron/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
          Error 404
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Page not found</h1>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Sorry, we couldn't find the page you are looking for. It might have been moved, deleted, or the URL might be incorrect.
        </p>
        <div className="mt-8 flex items-center justify-center gap-x-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand/90 hover:shadow transition-all"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
