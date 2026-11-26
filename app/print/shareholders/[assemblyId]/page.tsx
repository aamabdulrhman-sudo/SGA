import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getSession, isStaff } from "@/lib/auth";
import PrintButton from "@/components/print-button";
import { ASSEMBLY_TYPE_LABEL, STATUS_LABEL, formatDateAr, formatWeight } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ShareholdersPrintPage({
  params,
}: {
  params: { assemblyId: string };
}) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) notFound();

  const assembly = await prisma.assembly.findUnique({
    where: { id: params.assemblyId },
    include: {
      company: true,
      shareholders: { include: { proxiesAsPrincipal: true }, orderBy: { sharesCount: "desc" } },
    },
  });
  if (!assembly) notFound();

  const totalShares = assembly.shareholders.reduce((a, s) => a + s.sharesCount, 0);
  const presentOriginal = assembly.shareholders.filter((s) => s.isPresent).length;
  const presentViaProxy = assembly.shareholders.filter(
    (s) => !s.isPresent && s.proxiesAsPrincipal.some((p) => p.status === "APPROVED" && p.proxyAttended)
  ).length;

  return (
    <main className="bg-white min-h-screen text-black">
      <div className="max-w-4xl mx-auto p-10" style={{ fontFamily: "Cairo, sans-serif" }}>
        <PrintButton />

        <div className="text-center border-b-4 border-double border-black pb-6 mb-8">
          {assembly.company.logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={assembly.company.logoUrl}
              alt={`شعار ${assembly.company.name}`}
              className="mx-auto mb-4 h-20 object-contain"
            />
          )}
          <h1 className="text-2xl font-extrabold">{assembly.company.name}</h1>
          <p className="text-sm mt-1">سجل تجاري رقم: {assembly.company.crNumber}</p>
          <h2 className="text-xl font-bold mt-4">كشف سجل المساهمين</h2>
          <p className="text-sm">
            {assembly.title} — {ASSEMBLY_TYPE_LABEL[assembly.type]}
          </p>
          <p className="text-sm mt-1">
            تاريخ الانعقاد: {formatDateAr(assembly.scheduledAt)} — الحالة: {STATUS_LABEL[assembly.status]}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            تم إصدار هذا الكشف بتاريخ: {formatDateAr(new Date())}
          </p>
        </div>

        <section className="mb-8">
          <table className="w-full text-sm border border-black" cellPadding={8}>
            <tbody>
              <tr className="border-b border-black">
                <td className="border-l border-black font-semibold">عدد المساهمين</td>
                <td dir="ltr" className="text-left">{assembly.shareholders.length}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="border-l border-black font-semibold">إجمالي أسهم الشركة</td>
                <td dir="ltr" className="text-left">{formatWeight(totalShares)} سهم</td>
              </tr>
              <tr className="border-b border-black">
                <td className="border-l border-black font-semibold">حاضرون أصالة</td>
                <td dir="ltr" className="text-left">{presentOriginal}</td>
              </tr>
              <tr>
                <td className="border-l border-black font-semibold">حاضرون بالوكالة</td>
                <td dir="ltr" className="text-left">{presentViaProxy}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <table className="w-full text-sm border border-black" cellPadding={6}>
          <thead>
            <tr className="bg-gray-100 border-b border-black">
              <th className="border-l border-black">#</th>
              <th className="border-l border-black text-right">اسم المساهم</th>
              <th className="border-l border-black text-right">الهوية / السجل</th>
              <th className="border-l border-black text-right">الجوال</th>
              <th className="border-l border-black">الأسهم</th>
              <th className="border-l border-black">نسبة التصويت %</th>
              <th className="border-l border-black text-right">صفة الحضور</th>
              <th className="text-right">المفوض بالوكالة</th>
            </tr>
          </thead>
          <tbody>
            {assembly.shareholders.map((s, i) => {
              const proxy = s.proxiesAsPrincipal.find((p) => p.status === "APPROVED");
              const viaProxy = proxy?.proxyAttended || false;
              const attended = s.isPresent || viaProxy;
              return (
                <tr key={s.id} className="border-b border-gray-300">
                  <td className="border-l border-gray-300 text-center" dir="ltr">{i + 1}</td>
                  <td className="border-l border-gray-300 font-semibold">{s.name}</td>
                  <td className="border-l border-gray-300" dir="ltr">{s.nationalId}</td>
                  <td className="border-l border-gray-300" dir="ltr">{s.mobile || "-"}</td>
                  <td className="border-l border-gray-300 text-left" dir="ltr">{formatWeight(s.sharesCount)}</td>
                  <td className="border-l border-gray-300 text-left" dir="ltr">
                    {totalShares ? ((s.sharesCount / totalShares) * 100).toFixed(2) : "0"}
                  </td>
                  <td className="border-l border-gray-300">
                    {attended ? (viaProxy && !s.isPresent ? "حضور بالوكالة" : "حضور أصالة") : "غائب"}
                  </td>
                  <td>
                    {proxy ? `${proxy.proxyName} (${proxy.proxyNationalId})` : "-"}
                  </td>
                </tr>
              );
            })}
            {assembly.shareholders.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-4 text-gray-500">لا يوجد مساهمون مسجلون</td>
              </tr>
            )}
          </tbody>
        </table>

        <p className="text-xs leading-6 text-gray-600 mt-8 border-t border-gray-300 pt-4">
          يُعتمد هذا الكشف وفق سجل المساهمين الرسمي المُدخل على منصة الجمعيات العمومية، ويشمل أوزان التصويت
          المرجّحة بعدد الأسهم، وبيانات الحضور الأصلي والوكالة وقت الإصدار.
        </p>
      </div>
    </main>
  );
}
