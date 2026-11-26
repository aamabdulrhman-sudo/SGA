"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CalendarPlus } from "lucide-react";

export type CompanyOption = {
  id: string;
  name: string;
  slug: string;
};

export default function AdminAssemblyForm({ companies }: { companies: CompanyOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/assembly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: f.get("companyId"),
          title: f.get("title"),
          type: f.get("type"),
          scheduledAt: f.get("scheduledAt"),
          quorumPercentage: f.get("quorumPercentage"),
          streamUrl: f.get("streamUrl"),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({
          ok: true,
          text: `تم إنشاء الجمعية كمسودة${data.shareholdersPulled !== undefined ? ` — سُحب ${data.shareholdersPulled} مساهم من سجل الشركة تلقائياً` : ""} — يمكن تنشيطها من غرفة التحكم`,
        });
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
          <CalendarPlus className="h-5 w-5 text-emerald-600" />
          إنشاء جمعية عمومية جديدة
        </CardTitle>
        <CardDescription>تُنشأ الجمعية كمسودة — تُنشّط لاحقاً من غرفة التحكم بعد إضافة المساهمين والبنود</CardDescription>
      </CardHeader>
      <CardContent>
        {companies.length === 0 ? (
          <p className="text-sm text-slate-500">أضف شركة أولاً ثم يمكنك إنشاء جمعياتها.</p>
        ) : (
          <form onSubmit={onSubmit} className="grid md:grid-cols-3 gap-3 items-end">
            <div>
              <Label>الشركة *</Label>
              <Select name="companyId" required defaultValue="">
                <option value="" disabled>اختر الشركة...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>عنوان الجمعية *</Label>
              <Input name="title" required placeholder="الجمعية العمومية العادية 2026" />
            </div>
            <div>
              <Label>نوع الجمعية *</Label>
              <Select name="type" defaultValue="ORDINARY">
                <option value="ORDINARY">عادية</option>
                <option value="EXTRAORDINARY">غير عادية</option>
              </Select>
            </div>
            <div>
              <Label>التاريخ والوقت *</Label>
              <Input name="scheduledAt" type="datetime-local" required dir="ltr" />
            </div>
            <div>
              <Label>نسبة النصاب % *</Label>
              <Input name="quorumPercentage" type="number" min={1} max={100} defaultValue={50} dir="ltr" />
            </div>
            <div>
              <Label>رابط البث (اختياري)</Label>
              <Input name="streamUrl" dir="ltr" placeholder="https://..." />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit" disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
                {busy ? "..." : "إنشاء الجمعية"}
              </Button>
            </div>
          </form>
        )}
        {msg && (
          <p className={`mt-3 text-sm font-semibold ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>
        )}
      </CardContent>
    </Card>
  );
}
