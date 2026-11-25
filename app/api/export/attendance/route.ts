import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SECRETARY") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const assemblyId = req.nextUrl.searchParams.get("assemblyId");
  if (!assemblyId) return NextResponse.json({ error: "assemblyId مطلوب" }, { status: 400 });

  const assembly = await prisma.assembly.findUnique({
    where: { id: assemblyId },
    include: {
      company: true,
      shareholders: { include: { proxiesAsPrincipal: true }, orderBy: { sharesCount: "desc" } },
    },
  });
  if (!assembly) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const totalShares = assembly.shareholders.reduce((a, s) => a + s.sharesCount, 0);

  const rows = assembly.shareholders.map((s, i) => {
    const proxy = s.proxiesAsPrincipal.find((p) => p.status === "APPROVED");
    const viaProxy = proxy?.proxyAttended || false;
    const attended = s.isPresent || viaProxy;
    return {
      "#": i + 1,
      "اسم المساهم": s.name,
      "رقم الهوية / السجل": s.nationalId,
      "الجوال": s.mobile || "-",
      "البريد الإلكتروني": s.email || "-",
      "عدد الأسهم": s.sharesCount,
      "نسبة التصويت %": totalShares ? ((s.sharesCount / totalShares) * 100).toFixed(2) : "0",
      "صفة الحضور": attended ? (viaProxy && !s.isPresent ? "حضور بالوكالة" : "حضور أصالة") : "غائب",
      "المفوض بالوكالة": proxy ? `${proxy.proxyName} (${proxy.proxyNationalId}) — ${proxy.status === "APPROVED" ? "معتمد" : proxy.status === "PENDING" ? "قيد المراجعة" : "مرفوض"}` : "-",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "كشف الحضور");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="attendance-${assembly.company.slug}.xlsx"`,
    },
  });
}
