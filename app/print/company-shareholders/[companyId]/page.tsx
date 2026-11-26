import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getSession, isStaff } from "@/lib/auth";
import PrintButton from "@/components/print-button";
import { formatDateAr, formatWeight } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** كشف سجل مساهمي الشركة المصدر (بشعار الشركة) — لأعضاء فريق العمل فقط */
export default async function CompanyRegisterPrintPage({
  params,
}: {
  params: { companyId: string };
}) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) notFound();

  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
    include: { registerShareholders: { orderBy: { sharesCount: "desc" } } },
  });
  if (!company) notFound();

  const totalShares = company.registerShareholders.reduce((a, s) => a + s.sharesCount, 0);

  return (
    <main className="bg-white min-h-screen text-black">
      <div className="max-w-4xl mx-auto p-10" style={{ fontFamily: "Cairo, sans-serif" }}>
        <PrintButton />

        <div className="text-center border-b-4 border-double border-black pb-6 mb-8">
          {company.logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={company.logoUrl} alt={`شعار ${company.name}`} className="mx-auto mb-4 h-20 object-contain" />
          )}
          <h1 className="text-2xl font-extrabold">{company.name}</h1>
          <p className="text-sm mt-1">سجل تجاري رقم: {company.crNumber}</p>
          <h2 className="text-xl font-bold mt-4">سجل المساهمين الرئيسي</h2>
          <p className="text-xs text-gray-500 mt-2">تم إصدار هذا الكشف بتاريخ: {formatDateAr(new Date())}</p>
        </div>

        <table className="w-full text-sm border border-black" cellPadding={8}>
          <tbody>
            <tr className="border-b border-black">
              <td className="border-l border-black font-semibold">عدد المساهمين في السجل</td>
              <td dir="ltr" className="text-left">{company.registerShareholders.length}</td>
            </tr>
            <tr>
              <td className="border-l border-black font-semibold">إجمالي أسهم الشركة</td>
              <td dir="ltr" className="text-left">{formatWeight(totalShares)} سهم</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full text-sm border border-black mt-8" cellPadding={6}>
          <thead>
            <tr className="bg-gray-100 border-b border-black">
              <th className="border-l border-black">#</th>
              <th className="border-l border-black text-right">اسم المساهم</th>
              <th className="border-l border-black text-right">الهوية / السجل</th>
              <th className="border-l border-black text-right">الجوال</th>
              <th className="border-l border-black text-right">البريد الإلكتروني</th>
              <th className="border-l border-black">الأسهم</th>
              <th className="text-right">نسبة التصويت %</th>
            </tr>
          </thead>
          <tbody>
            {company.registerShareholders.map((s, i) => (
              <tr key={s.id} className="border-b border-gray-300">
                <td className="border-l border-gray-300 text-center" dir="ltr">{i + 1}</td>
                <td className="border-l border-gray-300 font-semibold">{s.name}</td>
                <td className="border-l border-gray-300" dir="ltr">{s.nationalId}</td>
                <td className="border-l border-gray-300" dir="ltr">{s.mobile || "-"}</td>
                <td className="border-l border-gray-300" dir="ltr">{s.email || "-"}</td>
                <td className="border-l border-gray-300 text-left" dir="ltr">{formatWeight(s.sharesCount)}</td>
                <td className="text-left" dir="ltr">
                  {totalShares ? ((s.sharesCount / totalShares) * 100).toFixed(2) : "0"}
                </td>
              </tr>
            ))}
            {company.registerShareholders.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-4 text-gray-500">سجل الشركة فارغ</td>
              </tr>
            )}
          </tbody>
        </table>

        <p className="text-xs leading-6 text-gray-600 mt-8 border-t border-gray-300 pt-4">
          هذا السجل هو السجل الرئيسي لمساهمي الشركة على المنصة؛ تُسحب منه نسخة مستقلة لكل جمعية عمومية عند إنشائها،
          وتظل نسخ كل جمعية محفوظة كما كانت لحظة إنشائها دون تأثر بأي تعديل لاحق على هذا السجل.
        </p>
      </div>
    </main>
  );
}
