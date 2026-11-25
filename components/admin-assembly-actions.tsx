"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function AdminAssemblyActions({
  assemblyId,
  assemblyTitle,
  status,
}: {
  assemblyId: string;
  assemblyTitle: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const deletable = status === "DRAFT";

  async function remove() {
    if (!confirm(`حذف جمعية "${assemblyTitle}" نهائياً؟`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/assembly", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assemblyId }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || "حدث خطأ");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!deletable) return null;

  return (
    <Button size="sm" variant="destructive" disabled={busy} onClick={remove} title="حذف الجمعية (المسودات فقط)">
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
