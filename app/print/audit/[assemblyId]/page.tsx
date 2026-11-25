import { prisma } from "@/lib/prisma";
import { getSession, isStaff } from "@/lib/auth";
import { notFound } from "next/navigation";
import PrintButton from "@/components/print-button";
import { ROLE_LABEL, formatDateAr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditLogPrintPage({
  params,
}: {
  params: { assemblyId: string };
}) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) notFound();

  const assembly = await prisma.assembly.findUnique({
    where: { id: params.assemblyId },
    include: { company: true },
  });
  if (!assembly) notFound();

  const logs = await prisma.auditLog.findMany({
    where: { OR: [{ assemblyId: params.assemblyId }, { assemblyId: null }] },
    orderBy: { timestamp: "asc" },
    take: 500,
  });

  return (
    <main className="bg-white min-h-screen text-black">
      <div className="max-w-3xl mx-auto p-10" style={{ fontFamily: "Cairo, sans-serif" }}>
        <PrintButton />

        <div className="text-center border-b-4 border-double border-black pb-6 mb-8">
          <h1 className="text-2xl font-extrabold">{assembly.company.name}</h1>
          <p className="text-sm mt-1">سجل تجاري رقم: {assembly.company.crNumber}</p>
          <h2 className="text-xl font-bold mt-4">سجل التدقيق الرسمي (Audit Log)</h2>
          <p className="text-sm mt-1">{assembly.title}</p>
          <p className="text-xs text-gray-500 mt-2">
            تم إصدار هذا التقرير بتاريخ: {formatDateAr(new Date())} — بواسطة: {session.name} (
            {session.role === "PLATFORM_MANAGER" ? "مدير المنصة" : "أمين السر"})
          </p>
        </div>

        <p className="text-sm leading-7 mb-4">
          يوثَّق هذا السجل جميع العمليات التي تمت على النظام المتعلقة بالجمعية أعلاه، ويتضمن: اسم المنفذ، ودوره الوظيفي،
          ونوع العملية، وتفاصيلها، ووقت التنفيذ. يُعتمد هذا السجل كجزء من وثائق الحوكمة والمحاضر الرسمية للجمعية.
        </p>

        <table className="w-full text-xs border border-black" cellPadding={6}>
          <thead>
            <tr className="bg-gray-100 border-b border-black text-right">
              <th className="border-l border-black">#</th>
              <th className="border-l border-black">التاريخ والوقت</th>
              <th className="border-l border-black">المنفذ</th>
              <th className="border-l border-black">الدور</th>
              <th className="border-l border-black">العملية</th>
              <th>التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={l.id} className="border-b border-black align-top">
                <td className="border-l border-black">{i + 1}</td>
                <td className="border-l border-black whitespace-nowrap" dir="ltr">
                  {formatDateAr(l.timestamp)}
                </td>
                <td className="border-l border-black font-semibold">{l.actorName}</td>
                <td className="border-l border-black">{ROLE_LABEL[l.actorRole] || l.actorRole}</td>
                <td className="border-l border-black font-semibold">{l.action}</td>
                <td className="text-[11px] leading-4">{l.details || "-"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-500">
                  لا توجد عمليات مسجلة على هذه الجمعية بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-10 mt-16 text-center text-sm">
          <div>
            <div className="border-t border-black pt-2 font-semibold">أمين السر</div>
            <div className="text-xs text-gray-500 mt-1">الاسم والتوقيع</div>
          </div>
          <div>
            <div className="border-t border-black pt-2 font-semibold">رئيس الجمعية</div>
            <div className="text-xs text-gray-500 mt-1">الاسم والتوقيع</div>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 mt-10 text-center">
          صادر إلكترونياً من منصة إدارة الجمعيات العمومية — سجل التدقيق غير قابل للتعديل
        </p>
      </div>
    </main>
  );
}
