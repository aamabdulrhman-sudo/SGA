"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print mb-6 flex items-center gap-2 bg-navy-800 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-navy-700 cursor-pointer"
    >
      <Printer className="h-4 w-4" />
      طباعة / حفظ PDF
    </button>
  );
}
