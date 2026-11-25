"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";

export type EditableCompany = {
  id: string;
  name: string;
  slug: string;
  crNumber: string;
  themeColor: string;
};

export default function AdminCompanyActions({ company }: { company: EditableCompany }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          name: f.get("name"),
          crNumber: f.get("crNumber"),
          themeColor: f.get("themeColor"),
          logoUrl: f.get("logoUrl"),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditOpen(false);
        router.refresh();
      } else setError(data.error || "حدث خطأ");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`حذف شركة "${company.name}" نهائياً؟ لا يمكن التراجع عن هذه العملية.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/company", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || "حدث خطأ");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-1.5">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => { setError(null); setEditOpen(true); }}
        title="تعديل بيانات الشركة"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={busy}
        onClick={remove}
        title="حذف الشركة"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title={`تعديل بيانات — ${company.name}`}>
        <form onSubmit={saveEdit} className="space-y-3">
          <div>
            <Label>اسم الشركة *</Label>
            <Input name="name" required defaultValue={company.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>السجل التجاري *</Label>
              <Input name="crNumber" required dir="ltr" defaultValue={company.crNumber} />
            </div>
            <div>
              <Label>اللون المؤسسي</Label>
              <input
                name="themeColor"
                type="color"
                defaultValue={company.themeColor}
                className="w-full h-10 rounded-lg border border-slate-300 cursor-pointer"
              />
            </div>
          </div>
          <div>
            <Label>رابط الشعار (اختياري)</Label>
            <Input name="logoUrl" dir="ltr" placeholder="https://..." />
          </div>
          <p className="text-xs text-slate-500">المعرف (slug) غير قابل للتعديل للحفاظ على روابط البوابة: <span dir="ltr" className="font-semibold">/c/{company.slug}</span></p>
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={busy}>
            {busy ? "..." : "حفظ التعديلات"}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
