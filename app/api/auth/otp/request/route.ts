import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveIdentifier } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { identifier } = await req.json();
  if (!identifier || typeof identifier !== "string") {
    return NextResponse.json({ error: "الرجاء إدخال رقم الهوية / السجل التجاري" }, { status: 400 });
  }

  const resolved = await resolveIdentifier(identifier);
  if (!resolved) {
    return NextResponse.json(
      { error: "لا يوجد حساب مرتبط بهذا الرقم في أي جمعية مسجلة" },
      { status: 404 }
    );
  }

  const code = Math.floor(1000 + Math.random() * 9000).toString();
  await prisma.otpCode.create({
    data: {
      identifier: identifier.trim(),
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  const demo = process.env.DEMO_MODE === "true";
  return NextResponse.json({
    ok: true,
    role: resolved.type,
    name: resolved.name,
    // Demo mode: return the code so the user can test instantly without SMS gateway
    demoCode: demo ? code : undefined,
    hint: demo ? "وضع التجربة: استخدم الرمز الظاهر أو الرمز الشامل 1234" : "تم إرسال رمز التحقق عبر SMS",
  });
}
