"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import LogoAvatar from "@/components/logo-avatar";
import { Pencil, Trash2, ImageUp, Trash2 as Trash } from "lucide-react";

export type EditableCompany = {
  id: string;
  name: string;
  slug: string;
  crNumber: string;
  themeColor: string;
  logoUrl?: string | null;
};

export default function AdminCompanyActions({ company }: { company: EditableCompany }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>(company.logoUrl || "");
  const logoNameRef = useRef<HTMLInputElement>(null);

  async function uploadLogo(file: File) {
    setLogoBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "logo");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setLogoUrl(data.url);
        if (logoNameRef.current) logoNameRef.current.value = "";
      } else setError(data.error || "فشل رفع الشعار");
    } finally {
      setLogoBusy(false);
    }
  }

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
          logoUrl: logoUrl,
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

  function openEdit() {
    setError(null);
    setLogoUrl(company.logoUrl || "");
    setEditOpen(true);
  }

  return (
    <div className="flex gap-1.5">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={openEdit}
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
            <Label>شعار الشركة</Label>
            <div className="flex items-center gap-3">
              <LogoAvatar logoUrl={logoUrl || null} name={company.name} themeColor={company.themeColor} size={48} />
              <div className="flex flex-col gap-1">
                <label className="inline-flex items-center gap-1.5 text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 cursor-pointer bg-white w-fit">
                  <ImageUp className="h-3.5 w-3.5" />
                  {logoBusy ? "..." : "رفع شعار جديد"}
                  <input
                    ref={logoNameRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                  />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="text-xs font-bold text-red-600 hover:underline text-right cursor-pointer flex items-center gap-1 w-fit"
                  >
                    <Trash className="h-3 w-3" /> إزالة الشعار
                  </button>
                )}
              </div>
            </div>
          </div>
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
