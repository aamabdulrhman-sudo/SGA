import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintButton from "@/components/print-button";
import { CHOICE_LABEL, STATUS_LABEL, ASSEMBLY_TYPE_LABEL, formatDateAr, formatWeight } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MinutesPage({
  params,
}: {
  params: { assemblyId: string };
}) {
  const assembly = await prisma.assembly.findUnique({
    where: { id: params.assemblyId },
    include: {
      company: true,
      agendaItems: { orderBy: { orderIndex: "asc" }, include: { votes: { include: { shareholder: true, proxy: true } } } },
      shareholders: { include: { proxiesAsPrincipal: true } },
    },
  });
  if (!assembly) notFound();

  const totalShares = assembly.shareholders.reduce((a, s) => a + s.sharesCount, 0);
  const attendedProxyIds = new Set(
    assembly.shareholders
      .filter((s) => s.proxiesAsPrincipal.some((p) => p.status === "APPROVED" && p.proxyAttended))
      .map((s) => s.id)
  );
  const presentOriginal = assembly.shareholders.filter((s) => s.isPresent).reduce((a, s) => a + s.sharesCount, 0);
  const proxyShares = assembly.shareholders
    .filter((s) => attendedProxyIds.has(s.id) && !s.isPresent)
    .reduce((a, s) => a + s.sharesCount, 0);
  const presentTotal = presentOriginal + proxyShares;
  const quorumPct = totalShares ? (presentTotal / totalShares) * 100 : 0;
  const quorumMet = quorumPct >= assembly.quorumPercentage;

  return (
    <main className="bg-white min-h-screen text-black">
      <div className="max-w-3xl mx-auto p-10" style={{ fontFamily: "Cairo, sans-serif" }}>
        <PrintButton />

        <div className="text-center border-b-4 border-double border-black pb-6 mb-8">
          <h1 className="text-2xl font-extrabold">{assembly.company.name}</h1>
          <p className="text-sm mt-1">سجل تجاري رقم: {assembly.company.crNumber}</p>
          <h2 className="text-xl font-bold mt-4">محضر الجمعية العامة</h2>
          <p className="text-sm">
            {assembly.title} — {ASSEMBLY_TYPE_LABEL[assembly.type]}
          </p>
          <p className="text-sm mt-1">
            عُقدت بتاريخ: {formatDateAr(assembly.scheduledAt)} — الحالة: {STATUS_LABEL[assembly.status]}
          </p>
        </div>

        {/* Quorum section */}
        <section className="mb-8">
          <h3 className="font-bold text-lg mb-3 border-b border-black pb-1">أولاً: النصاب القانوني والحضور</h3>
          <table className="w-full text-sm border border-black" cellPadding={8}>
            <tbody>
              <tr className="border-b border-black">
                <td className="border-l border-black font-semibold">إجمالي أسهم الشركة</td>
                <td dir="ltr" className="text-left">{formatWeight(totalShares)} سهم</td>
              </tr>
              <tr className="border-b border-black">
                <td className="border-l border-black font-semibold">أسهم الحاضرين أصالة</td>
                <td dir="ltr" className="text-left">{formatWeight(presentOriginal)} سهم</td>
              </tr>
              <tr className="border-b border-black">
                <td className="border-l border-black font-semibold">أسهم الحاضرين بالوكالة</td>
                <td dir="ltr" className="text-left">{formatWeight(proxyShares)} سهم</td>
              </tr>
              <tr className="border-b border-black">
                <td className="border-l border-black font-semibold">إجمالي أسهم الحاضرين (النصاب الفعلي)</td>
                <td dir="ltr" className="text-left font-bold">{formatWeight(presentTotal)} سهم ({quorumPct.toFixed(2)}%)</td>
              </tr>
              <tr>
                <td className="border-l border-black font-semibold">اكتمال النصاب القانوني (الحد {assembly.quorumPercentage}%)</td>
                <td className="text-left font-bold">{quorumMet ? "مكتمل ✓" : "غير مكتمل ✗"}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Agenda results */}
        <section className="mb-8">
          <h3 className="font-bold text-lg mb-3 border-b border-black pb-1">ثانياً: بنود جدول الأعمال ونتائج التصويت</h3>
          <div className="space-y-5">
            {assembly.agendaItems.map((item) => {
              if (item.votingType === "STANDARD") {
                const approve = item.votes.filter((v) => v.choice === "APPROVE").reduce((a, v) => a + v.sharesWeight, 0);
                const reject = item.votes.filter((v) => v.choice === "REJECT").reduce((a, v) => a + v.sharesWeight, 0);
                const abstain = item.votes.filter((v) => v.choice === "ABSTAIN").reduce((a, v) => a + v.sharesWeight, 0);
                return (
                  <div key={item.id} className="border border-black rounded p-4 text-sm">
                    <div className="font-bold mb-2">البند {item.orderIndex}: {item.title}</div>
                    <table className="w-full border border-black" cellPadding={6}>
                      <thead>
                        <tr className="bg-gray-100 border-b border-black">
                          <th className="border-l border-black">موافق</th>
                          <th className="border-l border-black">غير موافق</th>
                          <th className="border-l border-black">متحفظ</th>
                          <th>النتيجة</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="text-center">
                          <td className="border-l border-black" dir="ltr">{formatWeight(approve)}</td>
                          <td className="border-l border-black" dir="ltr">{formatWeight(reject)}</td>
                          <td className="border-l border-black" dir="ltr">{formatWeight(abstain)}</td>
                          <td className="font-bold">{approve > reject ? "تمت الموافقة" : "مرفوض"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              }
              const map = new Map<string, number>();
              for (const v of item.votes) map.set(v.choice, (map.get(v.choice) || 0) + v.sharesWeight);
              const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
              return (
                <div key={item.id} className="border border-black rounded p-4 text-sm">
                  <div className="font-bold mb-2">
                    البند {item.orderIndex}: {item.title} (تصويت تراكمي — {item.seatsCount} مقاعد)
                  </div>
                  <table className="w-full border border-black" cellPadding={6}>
                    <thead>
                      <tr className="bg-gray-100 border-b border-black">
                        <th className="border-l border-black">الترتيب</th>
                        <th className="border-l border-black">المرشح</th>
                        <th className="border-l border-black">الأصوات المرجحة</th>
                        <th>النتيجة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map(([name, shares], i) => (
                        <tr key={name} className="text-center border-b border-black last:border-0">
                          <td className="border-l border-black">{i + 1}</td>
                          <td className="border-l border-black">{name}</td>
                          <td className="border-l border-black" dir="ltr">{formatWeight(shares)}</td>
                          <td className="font-bold">{i < (item.seatsCount || 1) ? "فائز" : "غير فائز"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </section>

        {/* Attendance sheet */}
        <section className="mb-8">
          <h3 className="font-bold text-lg mb-3 border-b border-black pb-1">ثالثاً: كشف الحضور وسجل المساهمين</h3>
          <table className="w-full text-xs border border-black" cellPadding={5}>
            <thead>
              <tr className="bg-gray-100 border-b border-black text-right">
                <th className="border-l border-black">#</th>
                <th className="border-l border-black">اسم المساهم</th>
                <th className="border-l border-black">الهوية</th>
                <th className="border-l border-black">الأسهم</th>
                <th className="border-l border-black">صفة الحضور</th>
                <th>المفوض</th>
              </tr>
            </thead>
            <tbody>
              {assembly.shareholders.map((s, i) => {
                const proxy = s.proxiesAsPrincipal.find((p) => p.status === "APPROVED");
                const viaProxy = proxy?.proxyAttended || false;
                const attended = s.isPresent || viaProxy;
                return (
                  <tr key={s.id} className="border-b border-black">
                    <td className="border-l border-black">{i + 1}</td>
                    <td className="border-l border-black">{s.name}</td>
                    <td className="border-l border-black" dir="ltr">{s.nationalId}</td>
                    <td className="border-l border-black" dir="ltr">{formatWeight(s.sharesCount)}</td>
                    <td className="border-l border-black">{attended ? (viaProxy && !s.isPresent ? "بالوكالة" : "أصالة") : "غائب"}</td>
                    <td>{proxy ? proxy.proxyName : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="mb-8 text-sm leading-7">
          <h3 className="font-bold text-lg mb-3 border-b border-black pb-1">رابعاً: التوصيات والقرارات</h3>
          <p>
            بناءً على اكتمال النصاب القانوني، ونتائج التصويت المرجّح بالأسهم الموضحة أعلاه، اعتُمدت بنود جدول الأعمال وفق ما ورد
            في كشف النتائج. وتُثبَّت هذه الصورة ضمن سجلات الشركة، ويُعتمد هذا المحضر من قبل رئيس الجمعية وأمين السر.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-10 mt-16 text-center text-sm">
          <div>
            <div className="border-t border-black pt-2 font-semibold">أمين السر / كاتب المحضر</div>
            <div className="text-xs text-gray-500 mt-1">الاسم والتوقيع</div>
          </div>
          <div>
            <div className="border-t border-black pt-2 font-semibold">رئيس الجمعية</div>
            <div className="text-xs text-gray-500 mt-1">الاسم والتوقيع</div>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 mt-10 text-center">
          صادر إلكترونياً من منصة إدارة الجمعيات العمومية — جميع العمليات موثقة في سجل تدقيق غير قابل للتعديل
        </p>
      </div>
    </main>
  );
}
