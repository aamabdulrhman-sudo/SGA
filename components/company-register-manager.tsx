"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { formatWeight } from "@/lib/utils";
import { UserPlus, Upload, Download, Printer, Trash2, CheckCircle2, XCircle } from "lucide-react";

export type RegisterShareholder = {
  id: string;
  name: string;
  nationalId: string;
  mobile: string | null;
  email: string | null;
  sharesCount: number;
};

export default function CompanyRegisterManager({
  companyId,
  companySlug,
  initialShareholders,
}: {
  companyId: string;
  companySlug: string;
  initialShareholders: RegisterShareholder[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<RegisterShareholder[]>(initialShareholders);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function reload() {
    const res = await fetch(`/api/company?slug=${companySlug}`, { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setRows(data.register);
  }

  async function call(method: string, body: unknown, successText: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/shareholders", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: successText });
        setAddOpen(false);
      } else setMsg({ ok: false, text: data.error || "حدث خطأ" });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function importExcel(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("companyId", companyId);
      const res = await fetch("/api/shareholders", { method: "PUT", body: fd });
      const data = await res.json();
      if (res.ok) {
        setMsg({
          ok: true,
          text: `تم استيراد ${data.imported} مساهم لسجل الشركة${data.errors?.length ? ` — تحذيرات: ${data.errors.join(" | ")}` : ""}`,
        });
      } else setMsg({ ok: false, text: data.error || "فشل الاستيراد" });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  const totalShares = rows.reduce((a, r) => a + r.sharesCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          سجل مساهمي الشركة ({rows.length}) — إجمالي {formatWeight(totalShares)} سهم
        </CardTitle>
        <CardDescription>
          السجل المصدر على مستوى الشركة — كل جمعية جديدة تُنشأ تسحب نسخة كاملة تلقائياً من هذا السجل، وكل جمعية تحتفظ بنسختها المستقلة
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 justify-end mb-4">
          <Button onClick={() => setAddOpen(true)} disabled={busy}>
            <UserPlus className="h-4 w-4" /> إضافة مساهم للسجل
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="h-4 w-4" /> استيراد Excel / CSV
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importExcel(e.target.files[0])}
          />
          <a href="/template-cap-table.xlsx" download>
            <Button variant="outline">
              <Download className="h-4 w-4" /> نموذج الاستيراد
            </Button>
          </a>
          <a href={`/print/company-shareholders/${companyId}`} target="_blank">
            <Button variant="outline">
              <Printer className="h-4 w-4" /> استخراج السجل PDF
            </Button>
          </a>
        </div>

        {msg && (
          <div className={`rounded-xl p-3.5 mb-4 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {msg.ok ? <CheckCircle2 className="inline h-4 w-4 ml-1" /> : <XCircle className="inline h-4 w-4 ml-1" />}
            {msg.text}
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الهوية / السجل</TableHead>
              <TableHead>الجوال</TableHead>
              <TableHead>الأسهم</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-semibold">{s.name}</TableCell>
                <TableCell dir="ltr">{s.nationalId}</TableCell>
                <TableCell dir="ltr">{s.mobile || "-"}</TableCell>
                <TableCell dir="ltr">{formatWeight(s.sharesCount)}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    title="حذف من سجل الشركة (نسخ الجمعيات القائمة لا تتأثر)"
                    onClick={() => {
                      if (confirm(`حذف ${s.name} من سجل الشركة؟ (نسخ الجمعيات القائمة لن تتأثر)`)) {
                        call("DELETE", { id: s.id }, `تم حذف ${s.name} من السجل`);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                  السجل فارغ — أضف المساهمين يدوياً أو استورد ملف Excel، ثم كل جمعية جديدة ستسحبهم تلقائياً.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="إضافة مساهم لسجل الشركة">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            await call(
              "POST",
              {
                companyId,
                name: f.get("name"),
                nationalId: f.get("nationalId"),
                mobile: f.get("mobile"),
                email: f.get("email"),
                sharesCount: f.get("sharesCount"),
              },
              "تمت الإضافة لسجل الشركة"
            );
          }}
          className="space-y-3"
        >
          <div><Label>الاسم الكامل *</Label><Input name="name" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>رقم الهوية / السجل *</Label><Input name="nationalId" required dir="ltr" /></div>
            <div><Label>عدد الأسهم *</Label><Input name="sharesCount" required dir="ltr" type="number" min={1} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>الجوال</Label><Input name="mobile" dir="ltr" /></div>
            <div><Label>البريد الإلكتروني</Label><Input name="email" dir="ltr" type="email" /></div>
          </div>
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={busy}>
            إضافة للسجل
          </Button>
        </form>
      </Dialog>
    </Card>
  );
}
