"use client";

import { useState } from "react";
import { useAssemblyState } from "@/lib/use-assembly-state";
import { QuorumMeter } from "@/components/quorum-meter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { STATUS_LABEL, CHOICE_LABEL, ASSEMBLY_TYPE_LABEL, formatDateAr, formatWeight } from "@/lib/utils";
import LogoAvatar from "@/components/logo-avatar";
import LiveStream from "@/components/live-stream";
import LiveChat from "@/components/live-chat";
import LiveBroadcast from "@/components/live-broadcast";
import {
  BadgeCheck, Lock, Send, UserPlus, Trash2, FileText, CheckCircle2,
  XCircle, Clock, Users, Upload, Check, X,
} from "lucide-react";

export default function ShareholderRoom({
  assemblyId,
  companyName,
  logoUrl,
  themeColor,
}: {
  assemblyId: string;
  companyName: string;
  logoUrl?: string | null;
  themeColor?: string | null;
}) {
  const { state, refresh } = useAssemblyState(assemblyId);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [proxyOpen, setProxyOpen] = useState(false);

  // cumulative allocation draft: itemId -> { candidate: shares }
  const [alloc, setAlloc] = useState<Record<string, Record<string, number>>>({});
  const [candidatesInput, setCandidatesInput] = useState<Record<string, string>>({});

  async function post(url: string, body: unknown, successText: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ ok: true, text: successText });
        setProxyOpen(false);
      } else {
        setMsg({ ok: false, text: data.error || "حدث خطأ" });
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">جارٍ تحميل بيانات الجمعية...</div>;
  }

  const { assembly, quorum, agenda } = state;
  const me = state.viewer?.shareholder;
  if (!me) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">حساب المساهم غير مرتبط بهذه الجمعية.</div>;
  }

  const locked = !!me.delegatedTo;
  const assemblyActive = assembly.status === "ACTIVE";

  async function submitProxy(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    let documentUrl: string | null = null;
    const file = form.get("document") as File | null;
    if (file && file.size > 0) {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok) {
        setMsg({ ok: false, text: upData.error || "فشل رفع المستند" });
        return;
      }
      documentUrl = upData.url;
    }
    await post(
      "/api/proxy",
      {
        proxyName: form.get("proxyName"),
        proxyNationalId: form.get("proxyNationalId"),
        proxyMobile: form.get("proxyMobile"),
        proxyEmail: form.get("proxyEmail"),
        documentUrl,
      },
      "تم إرسال طلب التوكيل — بانتظار اعتماد أمين السر"
    );
  }

  function voteBadge(choice: string) {
    if (choice === "APPROVE") return "success";
    if (choice === "REJECT") return "danger";
    if (choice === "ABSTAIN") return "info";
    return "muted";
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      {/* Header */}
      <header className="bg-navy-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LogoAvatar logoUrl={logoUrl} name={companyName} themeColor={themeColor} size={44} />
            <div>
              <div className="text-xs text-slate-400 mb-1">{companyName}</div>
              <h1 className="font-extrabold text-lg">{assembly.title}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge className="bg-emerald-600">{ASSEMBLY_TYPE_LABEL[assembly.type]}</Badge>
                <span className="text-xs text-slate-300">{formatDateAr(assembly.scheduledAt)}</span>
              </div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-xs text-slate-400">وزنك التصويتي</div>
            <div className="text-3xl font-extrabold text-emerald-400">{me.weightPct.toFixed(2)}%</div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-5 space-y-5">
        {msg && (
          <div className={`rounded-xl p-3.5 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {msg.ok ? <CheckCircle2 className="inline h-4 w-4 ml-1" /> : <XCircle className="inline h-4 w-4 ml-1" />}
            {msg.text}
          </div>
        )}

        {/* Delegation notice */}
        {locked && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <div className="font-bold text-amber-900">تم تفويض {me.delegatedTo!.name} للتصويت نيابة عنك</div>
              <div className="text-sm text-amber-700 mt-0.5">
                التصويت المباشر مقفل خلال هذه الجمعية لحماية سلامة العملية الانتخابية ومنع التصويت المزدوج.
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          {/* My shares card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BadgeCheck className="h-5 w-5 text-emerald-600" />
                بيانات المساهم
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">الاسم</span><strong>{me.name}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">رقم الهوية</span><strong dir="ltr">{me.nationalId}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">عدد الأسهم</span><strong dir="ltr">{formatWeight(me.sharesCount)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">وزن التصويت</span><strong className="text-emerald-600">{me.weightPct.toFixed(2)}%</strong></div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">حالة الحضور</span>
                {me.isPresent ? (
                  <Badge variant="success">حاضر (أصالة)</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="emerald"
                    disabled={busy || !assemblyActive}
                    onClick={() => post("/api/attendance", { shareholderId: me.id, present: true }, "تم تسجيل حضورك بنجاح")}
                  >
                    <Users className="h-4 w-4" />
                    تسجيل الحضور
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quorum card */}
          <QuorumMeter {...quorum} threshold={assembly.quorumPercentage} />
        </div>

        {/* Live stream + broadcast chat */}
        {assembly.internalLive ? (
          <LiveBroadcast assemblyId={assemblyId} viewerRole="SHAREHOLDER" viewerName={me.name} />
        ) : (
          <div className="grid lg:grid-cols-2 gap-5 items-start">
            {assembly.streamUrl && <LiveStream streamUrl={assembly.streamUrl} />}
            <LiveChat
              assemblyId={assemblyId}
              viewerRole="SHAREHOLDER"
              viewerName={me.name}
              className={assembly.streamUrl ? "" : "lg:col-span-2"}
            />
          </div>
        )}

        {/* Proxy management */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-emerald-600" />
              التوكيل والتفويض (إضافة مفوض)
            </CardTitle>
            {!locked && !state.viewer.shareholder.myVotes.some((v: any) => v.castByRole === "SHAREHOLDER") && (
              <Button size="sm" onClick={() => setProxyOpen(true)} disabled={busy}>
                <UserPlus className="h-4 w-4" />
                إضافة مفوض
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {me.delegatedTo ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 text-sm text-emerald-800">
                <strong>المفوض المعتمد:</strong> {me.delegatedTo.name} — هوية: <span dir="ltr">{me.delegatedTo.nationalId}</span>
                <span className="block text-xs mt-1 text-emerald-600">يمكن للمفوض الدخول برقم هويته ورمز التحقق للتصويت نيابةً عنك.</span>
              </div>
            ) : (
              <p className="text-sm text-slate-500">لم تفوّض أحداً بالتصويت نيابة عنك حتى الآن.</p>
            )}
          </CardContent>
        </Card>

        {/* Agenda items */}
        <div>
          <h2 className="font-extrabold text-lg mb-3 flex items-center gap-2">
            بنود جدول الأعمال والتصويت
            <Badge variant="muted">{agenda.length} بنود</Badge>
          </h2>
          <div className="space-y-4">
            {agenda.map((item: any) => {
              const myVote = me.myVotes.find((v: any) => v.agendaItemId === item.id);
              const voteCastByProxy = myVote?.castByRole === "PROXY";
              const canVote = assemblyActive && item.status === "OPEN" && !locked && !myVote;

              if (item.votingType === "STANDARD") {
                return (
                  <Card key={item.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-slate-400 mb-1">البند {item.orderIndex}</div>
                          <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
                          {item.description && <CardDescription className="mt-1">{item.description}</CardDescription>}
                        </div>
                        <Badge variant={item.status === "OPEN" ? "success" : item.status === "CLOSED" ? "muted" : "warning"}>
                          {item.status === "OPEN" ? "مفتوح للتصويت" : STATUS_LABEL[item.status]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {myVote ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
                          {voteCastByProxy ? (
                            <span className="text-slate-600">
                              صوّت <Badge variant="muted">{myVote.proxyName}</Badge> مفوضاً نيابةً عنك — الاختيار:{" "}
                              <Badge variant={voteBadge(myVote.choice)}>{CHOICE_LABEL[myVote.choice]}</Badge> بوزن{" "}
                              <strong dir="ltr">{formatWeight(myVote.sharesWeight)}</strong> سهم
                            </span>
                          ) : (
                            <span className="text-slate-600">
                              صوتك المسجل: <Badge variant={voteBadge(myVote.choice)}>{CHOICE_LABEL[myVote.choice]}</Badge>{" "}
                              بوزن <strong dir="ltr">{formatWeight(myVote.sharesWeight)}</strong> سهم — شكراً لمشاركتك
                            </span>
                          )}
                        </div>
                      ) : item.status === "OPEN" ? (
                        locked ? (
                          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <Lock className="inline h-4 w-4 ml-1" />
                            التصويت مُنفَّذ عبر المفوض المعتمد — لا يمكن التصويت المباشر
                          </p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            <Button variant="emerald" disabled={busy} onClick={() => post("/api/vote", { agendaItemId: item.id, choice: "APPROVE" }, "تم تسجيل صوتك: موافق")}>
                              <Check className="h-4 w-4" /> موافق
                            </Button>
                            <Button variant="destructive" disabled={busy} onClick={() => post("/api/vote", { agendaItemId: item.id, choice: "REJECT" }, "تم تسجيل صوتك: غير موافق")}>
                              <X className="h-4 w-4" /> غير موافق
                            </Button>
                            <Button variant="outline" disabled={busy} onClick={() => post("/api/vote", { agendaItemId: item.id, choice: "ABSTAIN" }, "تم تسجيل صوتك: متحفظ")}>
                              متحفظ
                            </Button>
                          </div>
                        )
                      ) : item.status === "CLOSED" ? (
                        <p className="text-sm text-slate-500">أُغلق التصويت على هذا البند — تظهر النتائج النهائية في محضر الجمعية.</p>
                      ) : (
                        <p className="text-sm text-slate-500 flex items-center gap-1.5">
                          <Clock className="h-4 w-4" /> لم يُفتح التصويت على هذا البند بعد.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              }

              // CUMULATIVE
              const maxPoints = me.sharesCount * (item.seatsCount || 1);
              const draft = alloc[item.id] || {};
              const draftTotal = Object.values(draft).reduce((a, b) => a + b, 0);
              const myAllocations = me.myVotes.filter((v: any) => v.agendaItemId === item.id);
              const candidateNames = candidatesInput[item.id]?.split(",").map((s) => s.trim()).filter(Boolean) || ["المرشح أ", "المرشح ب", "المرشح ج", "المرشح د"];

              return (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-400 mb-1">البند {item.orderIndex} • تصويت تراكمي</div>
                        <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {item.description} — رصيدك: <strong>{maxPoints}</strong> نقطة ({me.sharesCount} سهم × {item.seatsCount} مقاعد)
                        </CardDescription>
                      </div>
                      <Badge variant={item.status === "OPEN" ? "success" : item.status === "CLOSED" ? "muted" : "warning"}>
                        {item.status === "OPEN" ? "مفتوح للتصويت" : STATUS_LABEL[item.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {myAllocations.length > 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm space-y-1.5">
                        {myAllocations.map((v: any, i: number) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-slate-600">{v.choice}</span>
                            <strong dir="ltr">{formatWeight(v.sharesWeight)}</strong>
                          </div>
                        ))}
                        <div className="text-xs text-slate-500 pt-1 border-t border-slate-200">
                          {voteCastByProxy ? "تم التصويت عبر المفوض المعتمد" : "تم تسجيل توزيعك التراكمي — شكراً لمشاركتك"}
                        </div>
                      </div>
                    ) : item.status === "OPEN" && !locked ? (
                      <div className="space-y-3">
                        <Input
                          placeholder="أسماء المرشحين مفصولة بفواصل (اختياري — افتراضي: المرشح أ/ب/ج/د)"
                          value={candidatesInput[item.id] || ""}
                          onChange={(e) => setCandidatesInput({ ...candidatesInput, [item.id]: e.target.value })}
                        />
                        {candidateNames.map((c) => (
                          <div key={c} className="flex items-center gap-3">
                            <span className="w-32 text-sm font-semibold truncate">{c}</span>
                            <Input
                              dir="ltr"
                              inputMode="numeric"
                              type="number"
                              min={0}
                              value={draft[c] ?? ""}
                              onChange={(e) =>
                                setAlloc({ ...alloc, [item.id]: { ...draft, [c]: Number(e.target.value) || 0 } })
                              }
                            />
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-sm">
                          <span className={draftTotal === maxPoints ? "text-emerald-600 font-bold" : "text-amber-600"}>
                            الموزع: {draftTotal} / {maxPoints}
                          </span>
                          <Button
                            variant="emerald"
                            disabled={busy || draftTotal !== maxPoints || draftTotal === 0}
                            onClick={() =>
                              post(
                                "/api/vote",
                                {
                                  agendaItemId: item.id,
                                  allocations: candidateNames.map((c) => ({ candidate: c, shares: draft[c] || 0 })),
                                },
                                "تم تسجيل تصويتك التراكمي"
                              )
                            }
                          >
                            <Send className="h-4 w-4" />
                            إرسال التصويت التراكمي
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        {locked ? <><Lock className="inline h-4 w-4 ml-1" />التصويت عبر المفوض المعتمد</> : "لم يُفتح التصويت بعد."}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add proxy modal */}
      <Dialog open={proxyOpen} onClose={() => setProxyOpen(false)} title="إضافة مفوض (تفويض بالتصويت)">
        <form onSubmit={submitProxy} className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 leading-5">
            سيُرفع الطلب إلى أمين السر للاعتماد. بعد الاعتماد يقفل تصويتك المباشر ويتمكن المفوض من الدخول والتصويت نيابةً عنك بوزن أسهمك كاملة.
          </div>
          <div>
            <Label>اسم المفوض *</Label>
            <Input name="proxyName" required placeholder="الاسم الكامل كما في الهوية" />
          </div>
          <div>
            <Label>رقم هوية المفوض *</Label>
            <Input name="proxyNationalId" required dir="ltr" inputMode="numeric" maxLength={10} placeholder="10 أرقام" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الجوال</Label>
              <Input name="proxyMobile" dir="ltr" placeholder="05xxxxxxxx" />
            </div>
            <div>
              <Label>البريد الإلكتروني</Label>
              <Input name="proxyEmail" dir="ltr" type="email" placeholder="name@email.com" />
            </div>
          </div>
          <div>
            <Label>مستند التوكيل (PDF / JPG / PNG) *</Label>
            <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-lg p-3 text-sm text-slate-500 cursor-pointer hover:bg-slate-50">
              <Upload className="h-4 w-4" />
              ارفع صورة أو نسخة PDF من التوكيل الموقع
              <input name="document" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" required />
            </label>
          </div>
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={busy}>
            <Send className="h-4 w-4" />
            {busy ? "جارٍ الإرسال..." : "إرسال طلب التوكيل"}
          </Button>
        </form>
      </Dialog>
    </main>
  );
}
