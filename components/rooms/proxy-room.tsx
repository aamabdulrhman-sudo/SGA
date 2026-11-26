"use client";

import { useState } from "react";
import { useAssemblyState } from "@/lib/use-assembly-state";
import { QuorumMeter } from "@/components/quorum-meter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { STATUS_LABEL, CHOICE_LABEL, ASSEMBLY_TYPE_LABEL, formatDateAr, formatWeight } from "@/lib/utils";
import LogoAvatar from "@/components/logo-avatar";
import LiveStream from "@/components/live-stream";
import LiveChat from "@/components/live-chat";
import LiveBroadcast from "@/components/live-broadcast";
import {
  Users, Check, X, Send, Clock, Lock, UserCheck, CheckCircle2, XCircle,
} from "lucide-react";

export default function ProxyRoom({
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
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [alloc, setAlloc] = useState<Record<string, Record<string, number>>>({});

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
      if (res.ok) setMsg({ ok: true, text: successText });
      else setMsg({ ok: false, text: data.error || "حدث خطأ" });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">جارٍ التحميل...</div>;
  }

  const { assembly, quorum, agenda } = state;
  const principals: any[] = state.viewer?.principals || [];
  if (principals.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-slate-500">
          <Lock className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          لا توجد وكالات معتمدة باسمك في هذه الجمعية.
        </div>
      </div>
    );
  }

  const totalShares = state.viewer.totalShares;
  const selectedIds = principals.filter((p) => selected[p.shareholderId] !== false).map((p) => p.shareholderId);
  const allSelected = selectedIds.length === principals.length;

  function toggleAll(v: boolean) {
    setSelected(Object.fromEntries(principals.map((p) => [p.shareholderId, v])));
  }

  async function voteStandard(choice: string, itemId: string) {
    const principalIds = principals
      .filter((p) => selected[p.shareholderId] !== false && !p.votedItems.includes(itemId))
      .map((p) => p.shareholderId);
    if (principalIds.length === 0) {
      setMsg({ ok: false, text: "جميع الموكلين المحددين صوّتوا مسبقاً على هذا البند" });
      return;
    }
    await post("/api/vote", { agendaItemId: itemId, choice, principalIds }, "تم تسجيل الأصوات نيابةً عن الموكلين المحددين");
  }

  async function voteCumulative(itemId: string, seats: number) {
    const draft = alloc[itemId] || {};
    const allocations = Object.entries(draft).map(([candidate, shares]) => ({ candidate, shares }));
    const principalIds = principals
      .filter((p) => selected[p.shareholderId] !== false && !p.votedItems.includes(itemId))
      .map((p) => p.shareholderId);
    if (principalIds.length === 0) {
      setMsg({ ok: false, text: "جميع الموكلين المحددين صوّتوا مسبقاً على هذا البند" });
      return;
    }
    await post("/api/vote", { agendaItemId: itemId, allocations, principalIds }, "تم تسجيل التصويت التراكمي للموكلين المحددين");
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <header className="bg-navy-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LogoAvatar logoUrl={logoUrl} name={companyName} themeColor={themeColor} size={44} />
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <UserCheck className="h-3.5 w-3.5 text-amber-400" />
                بوابة المفوض — {companyName}
              </div>
              <h1 className="font-extrabold text-lg">{assembly.title}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge className="bg-amber-600">{ASSEMBLY_TYPE_LABEL[assembly.type]}</Badge>
                <span className="text-xs text-slate-300">{formatDateAr(assembly.scheduledAt)}</span>
              </div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-xs text-slate-400">إجمالي الأسهم المفوَّضة لك</div>
            <div className="text-3xl font-extrabold text-amber-400" dir="ltr">{formatWeight(totalShares)}</div>
            <div className="text-xs text-slate-400 mt-1">{principals.length} موكل — تصويت بالوكالة</div>
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

        <div className="grid md:grid-cols-2 gap-5">
          {/* Principals card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-amber-600" />
                  الموكلون الذين تمثلهم بالوكالة
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => toggleAll(!allSelected)} disabled={busy}>
                  {allSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {principals.map((p) => (
                <label
                  key={p.shareholderId}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
                    selected[p.shareholderId] !== false ? "border-amber-300 bg-amber-50" : "border-slate-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected[p.shareholderId] !== false}
                    onChange={(e) => setSelected({ ...selected, [p.shareholderId]: e.target.checked })}
                    className="h-4 w-4 accent-amber-600"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-sm">{p.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5" dir="ltr">{formatWeight(p.sharesCount)} سهم</div>
                  </div>
                  {p.votedItems.length > 0 && <Badge variant="success">مصوَّت</Badge>}
                </label>
              ))}
              <div className="bg-navy-800 text-white rounded-lg p-3 text-center">
                <span className="text-xs text-slate-300 block mb-0.5">وزن التصويت المجمّع للأصوات المرشحة</span>
                <strong className="text-xl text-amber-400" dir="ltr">
                  {formatWeight(
                    principals.filter((p) => selected[p.shareholderId] !== false).reduce((a, p) => a + p.sharesCount, 0)
                  )}{" "}
                  سهم
                </strong>
              </div>
            </CardContent>
          </Card>

          <QuorumMeter {...quorum} threshold={assembly.quorumPercentage} />
        </div>

        {/* Live stream + broadcast chat */}
        {assembly.internalLive ? (
          <LiveBroadcast assemblyId={assemblyId} viewerRole="PROXY" viewerName={state.viewer?.name || ""} />
        ) : (
          <div className="grid lg:grid-cols-2 gap-5 items-start">
            {assembly.streamUrl && <LiveStream streamUrl={assembly.streamUrl} />}
            <LiveChat
              assemblyId={assemblyId}
              viewerRole="PROXY"
              viewerName={state.viewer?.name || ""}
              className={assembly.streamUrl ? "" : "lg:col-span-2"}
            />
          </div>
        )}

        {/* Agenda */}
        <div>
          <h2 className="font-extrabold text-lg mb-3">التصويت نيابةً عن الموكلين — بنود جدول الأعمال</h2>
          <div className="space-y-4">
            {agenda.map((item: any) => {
              const pending = principals.filter((p) => !p.votedItems.includes(item.id));
              return (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-400 mb-1">البند {item.orderIndex}</div>
                        <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
                      </div>
                      <Badge variant={item.status === "OPEN" ? "success" : item.status === "CLOSED" ? "muted" : "warning"}>
                        {item.status === "OPEN" ? "مفتوح للتصويت" : STATUS_LABEL[item.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {item.status === "OPEN" ? (
                      item.votingType === "STANDARD" ? (
                        <div className="space-y-2">
                          <div className="text-xs text-slate-500">
                            سيصوّت نيابةً عن <strong>{selectedIds.length}</strong> موكل (الموكلون المصوتون مسبقاً مستثنون تلقائياً) —{" "}
                            <strong dir="ltr">
                              {formatWeight(
                                principals
                                  .filter((p) => selected[p.shareholderId] !== false && !p.votedItems.includes(item.id))
                                  .reduce((a, p) => a + p.sharesCount, 0)
                              )}
                            </strong>{" "}
                            سهم
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Button variant="emerald" disabled={busy} onClick={() => voteStandard("APPROVE", item.id)}>
                              <Check className="h-4 w-4" /> موافق
                            </Button>
                            <Button variant="destructive" disabled={busy} onClick={() => voteStandard("REJECT", item.id)}>
                              <X className="h-4 w-4" /> غير موافق
                            </Button>
                            <Button variant="outline" disabled={busy} onClick={() => voteStandard("ABSTAIN", item.id)}>
                              متحفظ
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="text-xs text-slate-500">
                            التصويت التراكمي لكل موكل: (أسهمه × {item.seatsCount} مقاعد) — يجب توزيع كامل الرصيد لكل موكل على حدة
                          </div>
                          {pending.length === 0 ? (
                            <p className="text-sm text-slate-500">تم التصويت نيابةً عن جميع الموكلين على هذا البند.</p>
                          ) : (
                            pending.map((p) => {
                              const maxPoints = p.sharesCount * (item.seatsCount || 1);
                              const draft = alloc[`${item.id}:${p.shareholderId}`] || {};
                              const total = Object.values(draft).reduce((a, b) => a + b, 0);
                              const candidates: string[] = item.candidates.length
                                ? item.candidates.map((c: any) => c.name)
                                : ["المرشح أ", "المرشح ب", "المرشح ج", "المرشح د"];
                              return (
                                <div key={p.shareholderId} className="border border-slate-200 rounded-lg p-3 space-y-2">
                                  <div className="flex justify-between text-sm font-bold">
                                    <span>{p.name}</span>
                                    <span className={total === maxPoints ? "text-emerald-600" : "text-amber-600"}>
                                      {total} / {maxPoints} نقطة
                                    </span>
                                  </div>
                                  {candidates.map((c) => (
                                    <div key={c} className="flex items-center gap-3">
                                      <span className="w-24 text-xs font-semibold truncate">{c}</span>
                                      <Input
                                        dir="ltr"
                                        type="number"
                                        min={0}
                                        value={draft[c] ?? ""}
                                        onChange={(e) =>
                                          setAlloc({
                                            ...alloc,
                                            [`${item.id}:${p.shareholderId}`]: { ...draft, [c]: Number(e.target.value) || 0 },
                                          })
                                        }
                                      />
                                    </div>
                                  ))}
                                  <Button
                                    size="sm"
                                    variant="emerald"
                                    disabled={busy || total !== maxPoints}
                                    onClick={() => {
                                      setAlloc((prev) => {
                                        const merged: Record<string, Record<string, number>> = { ...prev };
                                        // merge this principal's allocations into the item-level allocations
                                        const itemDraft: Record<string, number> = { ...(merged[item.id] || {}) };
                                        for (const [c, s] of Object.entries(draft)) {
                                          itemDraft[c] = (itemDraft[c] || 0) + s;
                                        }
                                        merged[item.id] = itemDraft;
                                        return merged;
                                      });
                                      // defer the vote to next tick with merged state
                                      setTimeout(() => voteCumulative(item.id, item.seatsCount || 1), 50);
                                    }}
                                  >
                                    <Send className="h-4 w-4" />
                                    تصويت تراكمي لصالح {p.name}
                                  </Button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )
                    ) : item.status === "CLOSED" ? (
                      <p className="text-sm text-slate-500 flex items-center gap-1.5">
                        <Clock className="h-4 w-4" /> أُغلق التصويت على هذا البند.
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">لم يُفتح التصويت بعد.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
