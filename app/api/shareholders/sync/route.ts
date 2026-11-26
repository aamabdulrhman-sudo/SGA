import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff, logAudit } from "@/lib/auth";

/** Pull company-register shareholders into an assembly (missing ones only) */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { assemblyId } = await req.json();
  const assembly = await prisma.assembly.findUnique({
    where: { id: assemblyId },
    include: { shareholders: true, company: true },
  });
  if (!assembly) {
    return NextResponse.json({ error: "الجمعية غير موجودة" }, { status: 404 });
  }

  const register = await prisma.companyShareholder.findMany({
    where: { companyId: assembly.companyId },
  });
  const existingIds = new Set(assembly.shareholders.map((s) => s.nationalId));
  const missing = register.filter((r) => !existingIds.has(r.nationalId));

  if (missing.length > 0) {
    await prisma.shareholder.createMany({
      data: missing.map((r) => ({
        assemblyId: assembly.id,
        name: r.name,
        nationalId: r.nationalId,
        mobile: r.mobile,
        email: r.email,
        sharesCount: r.sharesCount,
      })),
    });
    await logAudit(
      assembly.id,
      session.name,
      session.role,
      "مزامنة سجل الشركة مع الجمعية",
      `تمت إضافة ${missing.length} مساهم من سجل الشركة: ${assembly.company.name}`
    );
  }

  return NextResponse.json({
    ok: true,
    added: missing.length,
    registerTotal: register.length,
    assemblyTotal: assembly.shareholders.length + missing.length,
  });
}
