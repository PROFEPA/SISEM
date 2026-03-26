"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-gray-200">Error</h1>
        <h2 className="text-xl font-semibold text-gray-900">
          Algo salió mal
        </h2>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Ocurrió un error inesperado. Intenta recargar la página.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1B8A5A] text-white text-sm font-medium hover:bg-[#157A4E] transition-colors cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
