import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff, logAudit } from "@/lib/auth";

/** Create agenda item (staff) */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { assemblyId, title, description, votingType, seatsCount } = await req.json();
  if (!assemblyId || !title?.trim()) {
    return NextResponse.json({ error: "عنوان البند مطلوب" }, { status: 400 });
  }
  const count = await prisma.agendaItem.count({ where: { assemblyId } });
  const item = await prisma.agendaItem.create({
    data: {
      assemblyId,
      orderIndex: count + 1,
      title: title.trim(),
      description: description?.trim() || null,
      votingType: votingType === "CUMULATIVE" ? "CUMULATIVE" : "STANDARD",
      seatsCount: votingType === "CUMULATIVE" ? Number(seatsCount) || 1 : null,
      status: "DRAFT",
    },
  });
  await logAudit(assemblyId, session.name, "SECRETARY", "إضافة بند", `البند ${item.orderIndex}: ${item.title}`);
  return NextResponse.json({ ok: true, itemId: item.id });
}

/** Update agenda item status (staff): DRAFT -> OPEN -> CLOSED */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { itemId, status } = await req.json();
  if (!["DRAFT", "OPEN", "CLOSED"].includes(status)) {
    return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
  }

  const item = await prisma.agendaItem.findUnique({
    where: { id: itemId },
    include: { assembly: true },
  });
  if (!item) return NextResponse.json({ error: "البند غير موجود" }, { status: 404 });

  // Only one item open at a time (orderly governance)
  if (status === "OPEN") {
    await prisma.agendaItem.updateMany({
      where: { assemblyId: item.assemblyId, status: "OPEN" },
      data: { status: "CLOSED" },
    });
  }

  const updated = await prisma.agendaItem.update({ where: { id: itemId }, data: { status } });

  const statusLabel = { DRAFT: "مسودة", OPEN: "فتح التصويت", CLOSED: "إغلاق التصويت" }[status as "DRAFT"];
  await logAudit(item.assemblyId, session.name, "SECRETARY", statusLabel, `البند: ${item.title}`);

  return NextResponse.json({ ok: true });
}
