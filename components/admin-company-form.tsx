"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default function AdminCompanyForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

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
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: `تم إنشاء الشركة — البوابة: /c/${data.slug}` });
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
        <form onSubmit={onSubmit} className="grid md:grid-cols-4 gap-3 items-end">
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
