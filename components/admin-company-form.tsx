"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import LogoAvatar from "@/components/logo-avatar";
import { Plus, ImageUp, Trash2 } from "lucide-react";

export default function AdminCompanyForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const logoNameRef = useRef<HTMLInputElement>(null);

  async function uploadLogo(file: File) {
    setLogoBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "logo");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setLogoUrl(data.url);
        if (logoNameRef.current) logoNameRef.current.value = "";
      } else setMsg({ ok: false, text: data.error || "فشل رفع الشعار" });
    } finally {
      setLogoBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          slug: f.get("slug"),
          crNumber: f.get("crNumber"),
          themeColor: f.get("themeColor"),
          logoUrl: logoUrl || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: `تم إنشاء الشركة — البوابة: /c/${data.slug}` });
        setLogoUrl("");
        (e.target as HTMLFormElement).reset();
        router.refresh();
      } else setMsg({ ok: false, text: data.error || "خطأ" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="h-5 w-5 text-emerald-600" />
          إضافة شركة جديدة (Multi-Tenant)
        </CardTitle>
        <CardDescription>كل شركة تحصل على بوابة معزولة بمسارها الخاص /c/[slug]</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid md:grid-cols-5 gap-3 items-end">
          <div>
            <Label>شعار الشركة</Label>
            <div className="flex items-center gap-2">
              <LogoAvatar logoUrl={logoUrl || null} name="?" size={40} />
              <div className="flex flex-col gap-1">
                <label className="inline-flex items-center gap-1.5 text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 cursor-pointer bg-white">
                  <ImageUp className="h-3.5 w-3.5" />
                  {logoBusy ? "..." : "رفع شعار"}
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
                    className="text-xs font-bold text-red-600 hover:underline text-right cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> إزالة
                  </button>
                )}
              </div>
            </div>
          </div>
          <div>
            <Label>اسم الشركة *</Label>
            <Input name="name" required placeholder="شركة ..." />
          </div>
          <div>
            <Label>المعرف (slug) *</Label>
            <Input name="slug" required dir="ltr" placeholder="company-slug" />
          </div>
          <div>
            <Label>السجل التجاري *</Label>
            <Input name="crNumber" required dir="ltr" placeholder="1010..." />
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>اللون المؤسسي</Label>
              <input
                name="themeColor"
                type="color"
                defaultValue="#0F172A"
                className="w-full h-10 rounded-lg border border-slate-300 cursor-pointer"
              />
            </div>
            <Button type="submit" disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
              {busy ? "..." : "إنشاء"}
            </Button>
          </div>
        </form>
        {msg && (
          <p className={`mt-3 text-sm font-semibold ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>
        )}
      </CardContent>
    </Card>
  );
}
