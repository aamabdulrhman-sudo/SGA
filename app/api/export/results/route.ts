import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff } from "@/lib/auth";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const assemblyId = req.nextUrl.searchParams.get("assemblyId");
  if (!assemblyId) return NextResponse.json({ error: "assemblyId مطلوب" }, { status: 400 });

  const assembly = await prisma.assembly.findUnique({
    where: { id: assemblyId },
    include: {
      company: true,
      agendaItems: { orderBy: { orderIndex: "asc" }, include: { votes: { include: { shareholder: true } } } },
      shareholders: true,
    },
  });
  if (!assembly) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const totalShares = assembly.shareholders.reduce((a, s) => a + s.sharesCount, 0);
  const sheets: { name: string; rows: Record<string, unknown>[] }[] = [];

  for (const item of assembly.agendaItems) {
    if (item.votingType === "STANDARD") {
      const approve = item.votes.filter((v) => v.choice === "APPROVE").reduce((a, v) => a + v.sharesWeight, 0);
      const reject = item.votes.filter((v) => v.choice === "REJECT").reduce((a, v) => a + v.sharesWeight, 0);
      const abstain = item.votes.filter((v) => v.choice === "ABSTAIN").reduce((a, v) => a + v.sharesWeight, 0);
      const cast = approve + reject + abstain;
      sheets.push({
        name: `بند ${item.orderIndex}`,
        rows: [
          { "البيان": "البند", "القيمة": `${item.orderIndex}. ${item.title}` },
          { "البيان": "نوع التصويت", "القيمة": "اعتماد/رفض/تحفظ مرجّح بالأسهم" },
          { "البيان": "إجمالي الأسهم المصوتة", "القيمة": cast },
          { "البيان": "نسبة المشاركة %", "القيمة": totalShares ? ((cast / totalShares) * 100).toFixed(2) : "0" },
          { "البيان": "موافق (أسهم)", "القيمة": approve },
          { "البيان": "غير موافق (أسهم)", "القيمة": reject },
          { "البيان": "متحفظ (أسهم)", "القيمة": abstain },
          { "البيان": "النتيجة", "القيمة": approve > reject ? "تمت الموافقة" : "مرفوض" },
        ],
      });
    } else {
      const map = new Map<string, number>();
      for (const v of item.votes) {
        map.set(v.choice, (map.get(v.choice) || 0) + v.sharesWeight);
      }
      const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
      const seats = item.seatsCount || 1;
      const rows = sorted.map(([name, shares], i) => ({
        "الترتيب": i + 1,
        "اسم المرشح": name,
        "الأصوات المرجحة (أسهم)": shares,
        "النتيجة": i < seats ? "فائز" : "غير فائز",
      }));
      sheets.push({ name: `بند ${item.orderIndex}`, rows });
    }
  }

  const wb = XLSX.utils.book_new();
  if (sheets.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ "ملاحظة": "لا توجد نتائج بعد" }]), "النتائج");
  }
  for (const s of sheets) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.rows), s.name);
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="results-${assembly.company.slug}.xlsx"`,
    },
  });
}
