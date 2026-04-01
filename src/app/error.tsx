"use client";

import { useEffect } from "react";
import { useTranslation } from "@/lib/i18n";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslation();

  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] dark:bg-gray-950">
      <div className="text-center space-y-4 max-w-md mx-auto px-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t("errors.serverError")}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {t("errors.serverErrorMessage")}
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 font-mono">
            Código: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => window.location.href = "/dashboard"}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {t("errors.goHome")}
          </button>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1B8A5A] text-white text-sm font-medium hover:bg-[#157A4E] transition-colors cursor-pointer"
          >
            {t("errors.retry")}
          </button>
        </div>
      </div>
    </div>
  );
}
