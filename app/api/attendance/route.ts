import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff, logAudit } from "@/lib/auth";

/** Toggle / set attendance for a shareholder (staff) or self (shareholder), or proxy attendance */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { shareholderId, present, proxyId } = await req.json();

  if (isStaff(session.role)) {
    const sh = await prisma.shareholder.update({
      where: { id: shareholderId },
      data: { isPresent: present, attendedAt: present ? new Date() : null },
    });
    await logAudit(
      sh.assemblyId,
      session.name,
      session.role,
      present ? "تسجيل حضور" : "إلغاء حضور",
      `المساهم: ${sh.name} (${sh.sharesCount} سهم)`
    );
    return NextResponse.json({ ok: true });
  }

  if (session.role === "SHAREHOLDER" && shareholderId === session.shareholderId) {
    const sh = await prisma.shareholder.update({
      where: { id: shareholderId },
      data: { isPresent: present, attendedAt: present ? new Date() : null },
    });
    if (present) {
      await logAudit(sh.assemblyId, sh.name, "SHAREHOLDER", "تسجيل حضور أصالة", `الأسهم: ${sh.sharesCount}`);
    }
    return NextResponse.json({ ok: true });
  }

  if (session.role === "PROXY" && proxyId && session.proxyIds?.includes(proxyId)) {
    await prisma.proxy.update({
      where: { id: proxyId },
      data: { proxyAttended: present, proxyAttendedAt: present ? new Date() : null },
    });
    if (present) {
      const rec = await prisma.proxy.findUnique({
        where: { id: proxyId },
        include: { shareholder: true },
      });
      await logAudit(
        rec!.assemblyId,
        session.name,
        "PROXY",
        "تسجيل حضور بالوكالة",
        `نيابة عن: ${rec!.shareholder.name} | الأسهم: ${rec!.shareholder.sharesCount}`
      );
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
}
