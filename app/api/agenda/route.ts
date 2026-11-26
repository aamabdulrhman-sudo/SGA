import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff, logAudit } from "@/lib/auth";

/** Create agenda item (staff) — with optional per-item legal quorum */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { assemblyId, title, description, votingType, seatsCount, quorumPercentage } = await req.json();
  if (!assemblyId || !title?.trim()) {
    return NextResponse.json({ error: "عنوان البند مطلوب" }, { status: 400 });
  }
  const assembly = await prisma.assembly.findUnique({ where: { id: assemblyId } });
  if (!assembly) {
    return NextResponse.json({ error: "الجمعية غير موجودة" }, { status: 404 });
  }

  // نصاب البند القانوني: قيمة خاصة بالبند، وإلا يرث نصاب الجمعية
  let itemQuorum: number | null = null;
  if (quorumPercentage !== undefined && quorumPercentage !== null && String(quorumPercentage).trim() !== "") {
    const q = Number(quorumPercentage);
    if (isNaN(q) || q < 1 || q > 100) {
      return NextResponse.json({ error: "نصاب البند يجب أن يكون بين 1 و 100" }, { status: 400 });
    }
    itemQuorum = Math.round(q);
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
      quorumPercentage: itemQuorum,
    },
  });
  await logAudit(
    assemblyId,
    session.name,
    session.role,
    "إضافة بند",
    `البند ${item.orderIndex}: ${item.title} — النصاب القانوني للبند: ${itemQuorum ?? assembly.quorumPercentage}%`
  );
  return NextResponse.json({ ok: true, itemId: item.id });
}

/** Update agenda item status (staff): DRAFT -> OPEN -> CLOSED.
 *  عند فتح التصويت تُحسب نسبة الحضور الفعلية وتوثَّق مقابل نصاب البند القانوني */
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
    include: {
      assembly: { include: { shareholders: { include: { proxiesAsPrincipal: true } }, proxies: true } },
    },
  });
  if (!item) return NextResponse.json({ error: "البند غير موجود" }, { status: 404 });

  // Only one item open at a time (orderly governance)
  if (status === "OPEN") {
    await prisma.agendaItem.updateMany({
      where: { assemblyId: item.assemblyId, status: "OPEN" },
      data: { status: "CLOSED" },
    });
  }

  const data: Record<string, unknown> = { status };

  if (status === "OPEN") {
    // احتساب النصاب الفعلي لحظة فتح بند التصويت
    const shareholders = item.assembly.shareholders;
    const totalShares = shareholders.reduce((a, s) => a + s.sharesCount, 0);
    const presentOriginal = shareholders.filter((s) => s.isPresent).reduce((a, s) => a + s.sharesCount, 0);
    const attendedProxyShareholderIds = new Set(
      item.assembly.proxies.filter((p) => p.status === "APPROVED" && p.proxyAttended).map((p) => p.shareholderId)
    );
    const proxyShares = shareholders
      .filter((s) => !s.isPresent && (attendedProxyShareholderIds.has(s.id) || s.proxiesAsPrincipal.some((p) => p.status === "APPROVED" && p.proxyAttended)))
      .reduce((a, s) => a + s.sharesCount, 0);
    const presentTotal = presentOriginal + proxyShares;
    const pct = totalShares > 0 ? (presentTotal / totalShares) * 100 : 0;
    const required = item.quorumPercentage ?? item.assembly.quorumPercentage;

    data.quorumPctAtOpen = pct;
    data.quorumMetAtOpen = pct >= required;
  }

  const updated = await prisma.agendaItem.update({ where: { id: itemId }, data });

  const statusLabel = { DRAFT: "مسودة", OPEN: "فتح التصويت", CLOSED: "إغلاق التصويت" }[status as "DRAFT"];
  let details = `البند: ${item.title}`;
  if (status === "OPEN") {
    const required = item.quorumPercentage ?? item.assembly.quorumPercentage;
    details += ` — النصاب المطلوب: ${required}% — النصاب الفعلي عند الفتح: ${(updated.quorumPctAtOpen ?? 0).toFixed(2)}% — ${updated.quorumMetAtOpen ? "مكتمل ✓" : "غير مكتمل ✗"}`;
  }
  await logAudit(item.assemblyId, session.name, session.role, statusLabel, details);

  return NextResponse.json({
    ok: true,
    quorum: status === "OPEN"
      ? { required: item.quorumPercentage ?? item.assembly.quorumPercentage, actual: updated.quorumPctAtOpen, met: updated.quorumMetAtOpen }
      : undefined,
  });
}
