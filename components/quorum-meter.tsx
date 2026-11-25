"use client";

import { Progress } from "@/components/ui/progress";
import { formatWeight } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, Users } from "lucide-react";

export function QuorumMeter({
  totalShares,
  presentOriginal,
  proxyShares,
  presentTotal,
  percentage,
  met,
  threshold,
}: {
  totalShares: number;
  presentOriginal: number;
  proxyShares: number;
  presentTotal: number;
  percentage: number;
  met: boolean;
  threshold: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-500" />
          <h3 className="font-bold">النصاب القانوني — الحضور الفعلي</h3>
        </div>
        {met ? (
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 text-xs font-bold">
            <CheckCircle2 className="h-4 w-4" />
            اكتمل النصاب
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-xs font-bold">
            <AlertTriangle className="h-4 w-4" />
            النصاب غير مكتمل
          </span>
        )}
      </div>

      <div className="flex items-end justify-between mb-2">
        <div className={`text-4xl font-extrabold ${met ? "text-emerald-600" : "text-amber-600"}`}>
          {percentage.toFixed(1)}%
        </div>
        <div className="text-sm text-slate-500">
          الحد القانوني: <strong>{threshold}%</strong>
        </div>
      </div>

      <Progress value={percentage} />

      <div className="grid grid-cols-3 gap-3 mt-4 text-center">
        <div className="bg-navy-800 text-white rounded-lg p-3">
          <div className="text-lg font-extrabold" dir="ltr">{formatWeight(presentOriginal)}</div>
          <div className="text-[11px] text-slate-300 mt-0.5">حضور أصالة</div>
        </div>
        <div className="bg-blue-600 text-white rounded-lg p-3">
          <div className="text-lg font-extrabold" dir="ltr">{formatWeight(proxyShares)}</div>
          <div className="text-[11px] text-blue-100 mt-0.5">حضور بالوكالة</div>
        </div>
        <div className="bg-slate-100 text-navy-800 rounded-lg p-3">
          <div className="text-lg font-extrabold" dir="ltr">{formatWeight(totalShares)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">إجمالي الأسهم</div>
        </div>
      </div>
    </div>
  );
}
