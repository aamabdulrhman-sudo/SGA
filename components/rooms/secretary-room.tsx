"use client";

import { useState } from "react";
import { useAssemblyState } from "@/lib/use-assembly-state";
import { QuorumMeter } from "@/components/quorum-meter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { STATUS_LABEL, CHOICE_LABEL, ASSEMBLY_TYPE_LABEL, formatDateAr, formatWeight, ROLE_LABEL } from "@/lib/utils";
import LogoAvatar from "@/components/logo-avatar";
import {
  Gauge, Radio, PlayCircle, Lock, Upload, FileSpreadsheet, Printer, History,
  CheckCircle2, XCircle, Clock, Download, Activity, Users, FileText, Building,
  RefreshCw, ArrowRight, Scale,
} from "lucide-react";

const TABS = [
  { key: "overview", label: "غرفة التحكم", icon: Gauge },
  { key: "agenda", label: "بنود التصويت", icon: FileText },
  { key: "proxies", label: "اعتماد التوكيلات", icon: History },
  { key: "shareholders", label: "سجل المساهمين", icon: Users },
  { key: "audit", label: "سجل التدقيق", icon: Activity },
];

export default function SecretaryRoom({
  assemblyId,
  companyName,
  companySlug,
  logoUrl,
  themeColor,
}: {
  assemblyId: string;
  companyName: string;
  companySlug?: string | null;
  logoUrl?: string | null;
  themeColor?: string | null;
}) {
  const { state, refresh } = useAssemblyState(assemblyId);
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [rejecting, setRejecting] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string>("");
  const slug = companySlug || state?.assembly?.company?.slug || "";

  async function call(url: string, method: string, body: unknown, successText?: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const text =
          data.message ||
          (data.quorum
            ? `تم فتح التصويت — النصاب المطلوب: ${data.quorum.required}% — النصاب الفعلي: ${Number(data.quorum.actual).toFixed(1)}% ${data.quorum.met ? "(مكتمل ✓)" : "(غير مكتمل ✗)"}`
            : data.added !== undefined
            ? `تمت المزامنة — أُضيف ${data.added} مساهم من سجل الشركة (إجمالي الجمعية الآن: ${data.assemblyTotal})`
            : successText || "تمت العملية بنجاح");
        setMsg({ ok: true, text });
      }
      else setMsg({ ok: false, text: data.error || "حدث خطأ" });
      await refresh();
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
      fd.append("assemblyId", assemblyId);
      const res = await fetch("/api/shareholders", { method: "PUT", body: fd });
      const data = await res.json();
      if (res.ok) {
        setMsg({
          ok: true,
          text: `تم استيراد ${data.imported} مساهم${data.errors?.length ? ` — تحذيرات: ${data.errors.join(" | ")}` : ""}`,
        });
      } else setMsg({ ok: false, text: data.error || "فشل الاستيراد" });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">جارٍ فتح غرفة التحكم...</div>;
  }

  const { assembly, quorum, agenda, shareholders, proxies, auditLogs } = state;
  const pendingProxies = (proxies || []).filter((p: any) => p.status === "PENDING");
  const currentStream = streamUrl || assembly.streamUrl || "";

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <header className="bg-navy-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <LogoAvatar logoUrl={logoUrl} name={companyName} themeColor={themeColor} size={48} />
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Radio className="h-3.5 w-3.5 text-red-400 animate-pulse" />
                  غرفة التحكم المباشر — {companyName}
                </div>
                <h1 className="font-extrabold text-lg">{assembly.title}</h1>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600">{ASSEMBLY_TYPE_LABEL[assembly.type]}</Badge>
                    <span className="text-xs text-slate-300">{formatDateAr(assembly.scheduledAt)}</span>
                    <Badge variant={assembly.status === "ACTIVE" ? "success" : "muted"}>
                      {STATUS_LABEL[assembly.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {slug && (
                      <a href={`/c/${slug}`} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold">
                        <ArrowRight className="h-3 w-3" /> لوحة الشركة
                      </a>
                    )}
                    <a href="/admin" className="flex items-center gap-1 text-slate-400 hover:text-white font-bold">
                      <ArrowRight className="h-3 w-3" /> اللوحة المركزية
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {assembly.status !== "ACTIVE" && (
                <Button size="sm" variant="emerald" disabled={busy} onClick={() => call("/api/assembly", "PATCH", { assemblyId, status: "ACTIVE" }, "تم تنشيط الجمعية")}>
                  <PlayCircle className="h-4 w-4" /> تنشيط الجمعية
                </Button>
              )}
              {assembly.status === "ACTIVE" && (
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => call("/api/assembly", "PATCH", { assemblyId, status: "CLOSED" }, "تم إغلاق الجمعية")}>
                  <Lock className="h-4 w-4" /> إغلاق الجمعية
                </Button>
              )}
              <a href={`/api/export/attendance?assemblyId=${assemblyId}`} download>
                <Button size="sm" variant="outline" className="bg-transparent text-white border-white/30 hover:bg-white/10">
                  <FileSpreadsheet className="h-4 w-4" /> كشف الحضور Excel
                </Button>
              </a>
              <a href={`/print/shareholders/${assemblyId}`} target="_blank">
                <Button size="sm" variant="outline" className="bg-transparent text-white border-white/30 hover:bg-white/10">
                  <Printer className="h-4 w-4" /> كشف المساهمين PDF
                </Button>
              </a>
              <a href={`/api/export/results?assemblyId=${assemblyId}`} download>
                <Button size="sm" variant="outline" className="bg-transparent text-white border-white/30 hover:bg-white/10">
                  <Download className="h-4 w-4" /> النتائج Excel
                </Button>
              </a>
              <a href={`/print/minutes/${assemblyId}`} target="_blank">
                <Button size="sm" variant="outline" className="bg-transparent text-white border-white/30 hover:bg-white/10">
                  <Printer className="h-4 w-4" /> محضر رسمي PDF
                </Button>
              </a>
              <a href={`/print/audit/${assemblyId}`} target="_blank">
                <Button size="sm" variant="outline" className="bg-transparent text-white border-white/30 hover:bg-white/10">
                  <History className="h-4 w-4" /> سجل التدقيق PDF
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition cursor-pointer ${
                tab === t.key ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-navy-800"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.key === "proxies" && pendingProxies.length > 0 && (
                <span className="bg-red-600 text-white rounded-full text-[10px] px-1.5 py-0.5 leading-none">
                  {pendingProxies.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-5 space-y-5">
        {msg && (
          <div className={`rounded-xl p-3.5 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {msg.ok ? <CheckCircle2 className="inline h-4 w-4 ml-1" /> : <XCircle className="inline h-4 w-4 ml-1" />}
            {msg.text}
          </div>
        )}

        {tab === "overview" && (
          <div className="grid lg:grid-cols-2 gap-5">
            <QuorumMeter {...quorum} threshold={assembly.quorumPercentage} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building className="h-5 w-5 text-emerald-600" />
                  إعدادات البث المباشر
                </CardTitle>
                <CardDescription>رابط التضمين (iframe) لمنصة YouTube / Zoom / Teams</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  dir="ltr"
                  placeholder="https://www.youtube.com/embed/..."
                  value={currentStream}
                  onChange={(e) => setStreamUrl(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => call("/api/assembly", "PATCH", { assemblyId, streamUrl: currentStream }, "تم تحديث رابط البث")}
                >
                  حفظ رابط البث
                </Button>
                {assembly.streamUrl && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe src={assembly.streamUrl} className="w-full h-full" allowFullScreen title="بث الجمعية" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live snapshot of open items */}
            {agenda.filter((i: any) => i.status === "OPEN" || i.status === "CLOSED").map((item: any) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">
                      البند {item.orderIndex}: {item.title}
                    </CardTitle>
                    <Badge variant={item.status === "OPEN" ? "success" : "muted"}>
                      {item.status === "OPEN" ? "التصويت مفتوح الآن" : "مغلق"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {item.votingType === "STANDARD" ? (
                    <div className="grid grid-cols-4 gap-3 text-center">
                      {[
                        { label: "موافق", v: item.tally.approve, c: "bg-emerald-600" },
                        { label: "غير موافق", v: item.tally.reject, c: "bg-red-600" },
                        { label: "متحفظ", v: item.tally.abstain, c: "bg-blue-600" },
                        { label: "المشاركون", v: item.tally.voters, c: "bg-navy-800" },
                      ].map((x) => (
                        <div key={x.label} className={`${x.c} text-white rounded-lg p-3`}>
                          <div className="text-lg font-extrabold" dir="ltr">{formatWeight(x.v)}</div>
                          <div className="text-[11px] opacity-80 mt-0.5">{x.label}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {item.candidates.map((c: any, i: number) => (
                        <div key={c.name} className="flex justify-between text-sm border-b border-slate-100 pb-1.5">
                          <span className={i < (item.seatsCount || 1) ? "font-bold text-emerald-700" : ""}>
                            {i < (item.seatsCount || 1) ? "🏆 " : ""}{c.name}
                          </span>
                          <strong dir="ltr">{formatWeight(c.shares)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {tab === "agenda" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setAddItemOpen(true)} disabled={busy}>
                <FileText className="h-4 w-4" /> إضافة بند جديد
              </Button>
            </div>
            {agenda.map((item: any) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-56">
                      <div className="text-xs text-slate-400 mb-1">
                        البند {item.orderIndex} • {item.votingType === "CUMULATIVE" ? `تصويت تراكمي (${item.seatsCount} مقاعد)` : "تصويت اعتيادي"} •{" "}
                        <span className="inline-flex items-center gap-1 font-bold text-navy-800">
                          <Scale className="h-3 w-3" /> النصاب: {item.quorumPercentage ?? assembly.quorumPercentage}%
                        </span>
                        {item.quorumPctAtOpen !== null && item.quorumPctAtOpen !== undefined && (
                          <span className={item.quorumMetAtOpen ? "text-emerald-600" : "text-red-600"}>
                            {" "}• عند الفتح: {Number(item.quorumPctAtOpen).toFixed(1)}% {item.quorumMetAtOpen ? "مكتمل ✓" : "غير مكتمل ✗"}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
                      {item.description && <CardDescription className="mt-1">{item.description}</CardDescription>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.status === "OPEN" ? "success" : item.status === "CLOSED" ? "muted" : "warning"}>
                        {item.status === "OPEN" ? "مفتوح للتصويت" : STATUS_LABEL[item.status]}
                      </Badge>
                      {item.status !== "OPEN" && (
                        <Button size="sm" variant="emerald" disabled={busy} onClick={() => call("/api/agenda", "PATCH", { itemId: item.id, status: "OPEN" }, "تم فتح التصويت على البند")}>
                          <PlayCircle className="h-4 w-4" /> فتح التصويت
                        </Button>
                      )}
                      {item.status === "OPEN" && (
                        <Button size="sm" variant="destructive" disabled={busy} onClick={() => call("/api/agenda", "PATCH", { itemId: item.id, status: "CLOSED" }, "تم إغلاق التصويت على البند")}>
                          <Lock className="h-4 w-4" /> إغلاق التصويت
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {(item.status === "OPEN" || item.status === "CLOSED") && (
                  <CardContent>
                    {item.votingType === "STANDARD" ? (
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                          { label: "موافق", v: item.tally.approve, pct: quorum.totalShares ? (item.tally.approve / quorum.totalShares) * 100 : 0, c: "bg-emerald-600" },
                          { label: "غير موافق", v: item.tally.reject, pct: quorum.totalShares ? (item.tally.reject / quorum.totalShares) * 100 : 0, c: "bg-red-600" },
                          { label: "متحفظ", v: item.tally.abstain, pct: quorum.totalShares ? (item.tally.abstain / quorum.totalShares) * 100 : 0, c: "bg-blue-600" },
                        ].map((x) => (
                          <div key={x.label} className="border border-slate-200 rounded-lg p-3">
                            <div className="text-xs text-slate-500 mb-1">{x.label}</div>
                            <div className={`text-xl font-extrabold ${x.label === "موافق" ? "text-emerald-600" : x.label === "غير موافق" ? "text-red-600" : "text-blue-600"}`} dir="ltr">
                              {formatWeight(x.v)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{x.pct.toFixed(1)}% من إجمالي الأسهم</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {item.candidates.length === 0 ? (
                          <p className="text-sm text-slate-500">لا توجد أصوات مسجلة بعد.</p>
                        ) : (
                          item.candidates.map((c: any, i: number) => (
                            <div key={c.name} className="flex justify-between text-sm border-b border-slate-100 pb-1.5">
                              <span className={i < (item.seatsCount || 1) ? "font-bold text-emerald-700" : ""}>
                                {i < (item.seatsCount || 1) ? "🏆 " : ""}{c.name}
                              </span>
                              <strong dir="ltr">{formatWeight(c.shares)}</strong>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {tab === "proxies" && (
          <div className="space-y-4">
            {pendingProxies.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  لا توجد طلبات توكيل بانتظار الاعتماد.
                </CardContent>
              </Card>
            )}
            {pendingProxies.map((p: any) => (
              <Card key={p.id} className="border-amber-300">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        طلب توكيل — {p.proxyName}
                        <Badge variant="warning">قيد المراجعة</Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        المفوض: {p.proxyName} (هوية: <span dir="ltr">{p.proxyNationalId}</span> • جوال: <span dir="ltr">{p.proxyMobile || "-"}</span>)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-sm">
                    <span className="text-slate-500">الموكل (المساهم الأصلي): </span>
                    <strong>{p.principalName}</strong> — هوية: <span dir="ltr">{p.principalNationalId}</span> —{" "}
                    <strong dir="ltr">{formatWeight(p.principalShares)}</strong> سهم
                  </div>

                  {p.documentUrl ? (
                    <div className="mb-4 border border-slate-200 rounded-lg overflow-hidden">
                      {p.documentUrl.match(/\.(pdf)$/i) ? (
                        <iframe src={p.documentUrl} className="w-full h-64" title="مستند التوكيل" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={p.documentUrl} alt="مستند التوكيل" className="max-h-64 w-full object-contain bg-white" />
                      )}
                    </div>
                  ) : (
                    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                      لم يُرفق مستند توكيل مع هذا الطلب (تم إنشاؤه تجريبياً).
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="emerald"
                      disabled={busy}
                      onClick={() => call("/api/proxy/decide", "PATCH", { proxyId: p.id, decision: "APPROVE" })}
                    >
                      <CheckCircle2 className="h-4 w-4" /> اعتماد التوكيل
                    </Button>
                    <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" disabled={busy} onClick={() => setRejecting(p)}>
                      <XCircle className="h-4 w-4" /> رفض مع ذكر السبب
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* History */}
            {(proxies || []).filter((p: any) => p.status !== "PENDING").length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">سجل التوكيلات المعالجة</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الموكل</TableHead>
                        <TableHead>المفوض</TableHead>
                        <TableHead>الأسهم</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>اعتمدها</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(proxies || []).filter((p: any) => p.status !== "PENDING").map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-semibold">{p.principalName}</TableCell>
                          <TableCell>{p.proxyName} <span className="text-xs text-slate-400" dir="ltr">({p.proxyNationalId})</span></TableCell>
                          <TableCell dir="ltr">{formatWeight(p.principalShares)}</TableCell>
                          <TableCell>
                            <Badge variant={p.status === "APPROVED" ? "success" : p.status === "REJECTED" ? "danger" : "muted"}>
                              {STATUS_LABEL[p.status]}
                            </Badge>
                            {p.rejectionReason && <span className="block text-xs text-red-500 mt-1">السبب: {p.rejectionReason}</span>}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{p.approvedBy || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {tab === "shareholders" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-sm text-blue-900 leading-6">
              <Users className="inline h-4 w-4 ml-1" />
              سجل المساهمين المصدر على مستوى الشركة — نسخة هذه الجمعية لقطة مستقلة سُحبت عند إنشائها. لإضافة مساهمين
              جدد نهائياً أضفهم في <strong>سجل الشركة</strong> ثم اضغط «سحب من سجل الشركة» لاستكمال الناقص.
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button onClick={() => call("/api/shareholders/sync", "POST", { assemblyId }, undefined)} disabled={busy}>
                <RefreshCw className="h-4 w-4" /> سحب من سجل الشركة
              </Button>
              {slug && (
                <a href={`/c/${slug}`}>
                  <Button variant="outline">
                    <Building className="h-4 w-4" /> إدارة سجل الشركة
                  </Button>
                </a>
              )}
              <a href={`/print/shareholders/${assemblyId}`} target="_blank">
                <Button variant="outline">
                  <Printer className="h-4 w-4" /> استخراج الكشف PDF
                </Button>
              </a>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  سجل المساهمين ({shareholders?.length || 0}) — إجمالي {formatWeight(quorum.totalShares)} سهم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الهوية / السجل</TableHead>
                      <TableHead>الأسهم</TableHead>
                      <TableHead>الوزن</TableHead>
                      <TableHead>الحضور</TableHead>
                      <TableHead>الوكالة</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(shareholders || []).map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-semibold">{s.name}</TableCell>
                        <TableCell dir="ltr">{s.nationalId}</TableCell>
                        <TableCell dir="ltr">{formatWeight(s.sharesCount)}</TableCell>
                        <TableCell>{s.weightPct.toFixed(2)}%</TableCell>
                        <TableCell>
                          <Badge variant={s.isPresent ? "success" : "muted"}>
                            {s.isPresent ? "حاضر أصالة" : "غائب"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {s.proxyName ? (
                            <span className="text-amber-700 font-semibold">وكالة: {s.proxyName}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={s.isPresent ? "secondary" : "emerald"}
                            disabled={busy}
                            onClick={() => call("/api/attendance", "POST", { shareholderId: s.id, present: !s.isPresent })}
                          >
                            {s.isPresent ? "إلغاء الحضور" : "تسجيل حضور"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "audit" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-5 w-5 text-emerald-600" />
                سجل التدقيق (Audit Log) — آخر 50 عملية
              </CardTitle>
              <CardDescription>جميع العمليات موثقة باسم المنفذ ودوره ووقت التنفيذ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(auditLogs || []).map((l: any) => (
                  <div key={l.id} className="flex flex-wrap items-start gap-2 text-sm border-b border-slate-100 pb-2.5">
                    <Badge variant={l.actorRole === "SECRETARY" ? "default" : l.actorRole === "PROXY" ? "warning" : "info"}>
                      {ROLE_LABEL[l.actorRole] || l.actorRole}
                    </Badge>
                    <div className="flex-1 min-w-48">
                      <strong>{l.action}</strong> — <span className="text-slate-600">{l.actorName}</span>
                      {l.details && <div className="text-xs text-slate-500 mt-0.5">{l.details}</div>}
                    </div>
                    <span className="text-xs text-slate-400" dir="ltr">{formatDateAr(l.timestamp)}</span>
                  </div>
                ))}
                {(auditLogs || []).length === 0 && <p className="text-sm text-slate-500 text-center py-4">لا توجد عمليات مسجلة بعد.</p>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} title="رفض طلب التوكيل">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            رفض طلب التوكيل المقدم من <strong>{rejecting?.proxyName}</strong> نيابةً عن <strong>{rejecting?.principalName}</strong>
          </p>
          <Label>سبب الرفض (إلزامي)</Label>
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="مثال: مستند التوكيل غير موثق من الغرفة التجارية"
          />
          <Button
            variant="destructive"
            className="w-full"
            disabled={busy || !rejectReason.trim()}
            onClick={async () => {
              await call("/api/proxy/decide", "PATCH", { proxyId: rejecting.id, decision: "REJECT", rejectionReason: rejectReason });
              setRejecting(null);
              setRejectReason("");
            }}
          >
            تأكيد الرفض
          </Button>
        </div>
      </Dialog>

      {/* Add agenda item dialog */}
      <Dialog open={addItemOpen} onClose={() => setAddItemOpen(false)} title="إضافة بند لجدول الأعمال">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            await call("/api/agenda", "POST", {
              assemblyId,
              title: f.get("title"),
              description: f.get("description"),
              votingType: f.get("votingType"),
              seatsCount: f.get("seatsCount"),
              quorumPercentage: f.get("quorumPercentage"),
            });
            setAddItemOpen(false);
          }}
          className="space-y-3"
        >
          <div><Label>عنوان البند *</Label><Input name="title" required /></div>
          <div><Label>الوصف</Label><Input name="description" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>نوع التصويت</Label>
              <Select name="votingType" defaultValue="STANDARD">
                <option value="STANDARD">اعتيادي (موافق / غير موافق / متحفظ)</option>
                <option value="CUMULATIVE">تراكمي (انتخاب مجلس الإدارة)</option>
              </Select>
            </div>
            <div><Label>عدد المقاعد (للتراكمي)</Label><Input name="seatsCount" dir="ltr" type="number" min={1} defaultValue={3} /></div>
          </div>
          <div>
            <Label>النصاب القانوني الخاص بالبند %</Label>
            <Input name="quorumPercentage" dir="ltr" type="number" min={1} max={100} placeholder={String(assembly.quorumPercentage) + " (نصاب الجمعية)"} />
            <p className="text-xs text-slate-500 mt-1">اتركه فارغاً لوراثة نصاب الجمعية ({assembly.quorumPercentage}%) — كل بند له نصابه المستقل عند فتح التصويت</p>
          </div>
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={busy}>
            إضافة البند
          </Button>
        </form>
      </Dialog>
    </main>
  );
}
