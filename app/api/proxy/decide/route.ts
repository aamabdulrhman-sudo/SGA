import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, logAudit } from "@/lib/auth";

/** Secretary approves or rejects a proxy delegation request */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SECRETARY") {
    return NextResponse.json({ error: "هذه العملية متاحة لأمين السر فقط" }, { status: 403 });
  }

  const { proxyId, decision, rejectionReason } = await req.json();

  const proxy = await prisma.proxy.findUnique({
    where: { id: proxyId },
    include: { shareholder: true, assembly: true },
  });
  if (!proxy) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

  if (decision === "APPROVE") {
    await prisma.proxy.update({
      where: { id: proxy.id },
      data: {
        status: "APPROVED",
        approvedBy: session.name,
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });
    await logAudit(
      proxy.assemblyId,
      session.name,
      "SECRETARY",
      "اعتماد توكيل",
      `اعتماد الوكالة: ${proxy.proxyName} (هوية: ${proxy.proxyNationalId}) نيابة عن المساهم ${proxy.shareholder.name} (${proxy.shareholder.sharesCount} سهم). تم توليد حساب دخول للمفوض وقفل التصويت المباشر للمساهم الأصلي.`,
      req.headers.get("x-forwarded-for")?.split(",")[0]
    );
    return NextResponse.json({
      ok: true,
      message: `تم اعتماد الوكالة وتوليد حساب دخول للمفوض ${proxy.proxyName} — الدخول: رقم الهوية ${proxy.proxyNationalId} + رمز التحقق`,
    });
  }

  if (decision === "REJECT") {
    if (!rejectionReason?.trim()) {
      return NextResponse.json({ error: "يجب ذكر سبب الرفض" }, { status: 400 });
    }
    await prisma.proxy.update({
      where: { id: proxy.id },
      data: { status: "REJECTED", rejectionReason: rejectionReason.trim() },
    });
    await logAudit(
      proxy.assemblyId,
      session.name,
      "SECRETARY",
      "رفض توكيل",
      `رفض وكالة: ${proxy.proxyName} نيابة عن ${proxy.shareholder.name} — السبب: ${rejectionReason.trim()}`
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "قرار غير معروف" }, { status: 400 });
}
