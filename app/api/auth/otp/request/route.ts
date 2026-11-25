import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveIdentifier, resolveStaff, logAudit } from "@/lib/auth";
import { deliverOtp } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const { identifier } = await req.json();
  if (!identifier || typeof identifier !== "string") {
    return NextResponse.json({ error: "الرجاء إدخال رقم الهوية / السجل التجاري" }, { status: 400 });
  }

  const clean = identifier.trim();

  // Disabled staff accounts are blocked entirely
  const staff = await resolveStaff(clean);
  if (staff?.disabled) {
    return NextResponse.json({ error: "هذا الحساب معطل — راجع مدير المنصة" }, { status: 403 });
  }

  const resolved = await resolveIdentifier(clean);
  if (!resolved) {
    return NextResponse.json(
      { error: "لا يوجد حساب مرتبط بهذا الرقم في أي جمعية مسجلة" },
      { status: 404 }
    );
  }

  const code = Math.floor(1000 + Math.random() * 9000).toString();
  await prisma.otpCode.create({
    data: {
      identifier: clean,
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  // Resolve contact info for OTP delivery
  let contacts: { mobile?: string | null; email?: string | null } = {};
  if (resolved.type === "SHAREHOLDER") {
    const sh = await prisma.shareholder.findUnique({ where: { id: resolved.shareholderId! } });
    contacts = { mobile: sh?.mobile, email: sh?.email };
  } else if (resolved.type === "PROXY") {
    const px = await prisma.proxy.findFirst({ where: { proxyNationalId: clean, status: "APPROVED" } });
    contacts = { mobile: px?.proxyMobile, email: px?.proxyEmail };
  }

  const delivery = await deliverOtp(contacts, code);

  if (delivery.sent) {
    await logAudit(
      resolved.assemblyId ?? null,
      resolved.name,
      resolved.type,
      "طلب رمز تحقق",
      `أُرسل رمز التحقق عبر: ${delivery.channels.join(", ")}`
    );
    return NextResponse.json({
      ok: true,
      role: resolved.type,
      name: resolved.name,
      sentVia: delivery.channels,
      hint: `تم إرسال رمز التحقق عبر: ${delivery.channels.join(", ")}`,
    });
  }

  const demo = process.env.DEMO_MODE === "true";
  if (demo) {
    return NextResponse.json({
      ok: true,
      role: resolved.type,
      name: resolved.name,
      demoCode: code,
      hint: "وضع التجربة: لم تُهيأ بوابة رسائل — استخدم الرمز الظاهر أو الرمز الشامل 1234",
    });
  }

  return NextResponse.json(
    { error: "خدمة إرسال رموز التحقق غير مهيأة — راجع مدير المنصة لإعداد بوابة الرسائل (SMS / البريد / واتساب)" },
    { status: 503 }
  );
}
