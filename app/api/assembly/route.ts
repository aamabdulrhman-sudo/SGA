import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, logAudit } from "@/lib/auth";

/** Create assembly (secretary) */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SECRETARY") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { companyId, title, type, scheduledAt, streamUrl, quorumPercentage } = await req.json();
  if (!companyId || !title?.trim() || !scheduledAt) {
    return NextResponse.json({ error: "البيانات غير مكتملة" }, { status: 400 });
  }
  const assembly = await prisma.assembly.create({
    data: {
      companyId,
      title: title.trim(),
      type: type === "EXTRAORDINARY" ? "EXTRAORDINARY" : "ORDINARY",
      scheduledAt: new Date(scheduledAt),
      streamUrl: streamUrl?.trim() || null,
      quorumPercentage: Number(quorumPercentage) || 50,
      status: "DRAFT",
    },
  });
  await logAudit(assembly.id, session.name, "SECRETARY", "إنشاء جمعية", `الجمعية: ${assembly.title}`);
  return NextResponse.json({ ok: true, assemblyId: assembly.id });
}

/** Update assembly status (secretary) */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SECRETARY") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { assemblyId, status, streamUrl } = await req.json();
  const data: Record<string, unknown> = {};
  if (status) data.status = status;
  if (streamUrl !== undefined) data.streamUrl = streamUrl || null;
  const assembly = await prisma.assembly.update({ where: { id: assemblyId }, data });
  await logAudit(
    assembly.id,
    session.name,
    "SECRETARY",
    "تحديث حالة الجمعية",
    `الحالة الجديدة: ${assembly.status}`
  );
  return NextResponse.json({ ok: true });
}
