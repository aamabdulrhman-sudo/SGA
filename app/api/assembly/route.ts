import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff, logAudit } from "@/lib/auth";

const VALID_STATUSES = ["DRAFT", "ACTIVE", "CLOSED"];

/** Create assembly (staff) */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { companyId, title, type, scheduledAt, streamUrl, quorumPercentage } = await req.json();
  if (!companyId || !title?.trim() || !scheduledAt) {
    return NextResponse.json({ error: "البيانات غير مكتملة" }, { status: 400 });
  }
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "الشركة غير موجودة" }, { status: 404 });
  }
  const scheduled = new Date(scheduledAt);
  if (isNaN(scheduled.getTime())) {
    return NextResponse.json({ error: "تاريخ الجمعية غير صالح" }, { status: 400 });
  }
  const assembly = await prisma.assembly.create({
    data: {
      companyId,
      title: title.trim(),
      type: type === "EXTRAORDINARY" ? "EXTRAORDINARY" : "ORDINARY",
      scheduledAt: scheduled,
      streamUrl: streamUrl?.trim() || null,
      quorumPercentage: Number(quorumPercentage) || 50,
      status: "DRAFT",
    },
  });
  await logAudit(assembly.id, session.name, session.role, "إنشاء جمعية", `الجمعية: ${assembly.title} — الشركة: ${company.name}`);
  return NextResponse.json({ ok: true, assemblyId: assembly.id });
}

/** Update assembly status / stream (staff) */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { assemblyId, status, streamUrl } = await req.json();
  const assembly = await prisma.assembly.findUnique({ where: { id: assemblyId } });
  if (!assembly) {
    return NextResponse.json({ error: "الجمعية غير موجودة" }, { status: 404 });
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (status) data.status = status;
  if (streamUrl !== undefined) data.streamUrl = streamUrl || null;
  const updated = await prisma.assembly.update({ where: { id: assemblyId }, data });
  await logAudit(
    updated.id,
    session.name,
    session.role,
    "تحديث حالة الجمعية",
    `الحالة الجديدة: ${updated.status}`
  );
  return NextResponse.json({ ok: true });
}

/** Delete assembly (staff) — only drafts can be deleted to protect voting records */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { assemblyId } = await req.json();
  const assembly = await prisma.assembly.findUnique({
    where: { id: assemblyId },
    include: { _count: { select: { shareholders: true, agendaItems: true } } },
  });
  if (!assembly) {
    return NextResponse.json({ error: "الجمعية غير موجودة" }, { status: 404 });
  }
  if (assembly.status !== "DRAFT") {
    return NextResponse.json(
      { error: "لا يمكن حذف جمعية منشورة — يمكن حذف المسودات فقط" },
      { status: 400 }
    );
  }
  await prisma.assembly.delete({ where: { id: assemblyId } });
  await logAudit(
    null,
    session.name,
    session.role,
    "حذف جمعية (مسودة)",
    `الجمعية المحذوفة: ${assembly.title} (${assembly._count.shareholders} مساهم، ${assembly._count.agendaItems} بنود)`
  );
  return NextResponse.json({ ok: true });
}
