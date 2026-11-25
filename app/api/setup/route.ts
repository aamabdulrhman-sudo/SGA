import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { setupCompleted, logAudit } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ setupCompleted: await setupCompleted() });
}

/** First-run only: create the platform manager account (all permissions). */
export async function POST(req: NextRequest) {
  if (await setupCompleted()) {
    return NextResponse.json(
      { error: "تم إكمال الإعداد مسبقاً — لا يمكن إنشاء مدير منصة آخر عبر هذه الصفحة" },
      { status: 403 }
    );
  }

  const { name, username, nationalId, password } = await req.json();

  if (!name?.trim() || !username?.trim() || !nationalId?.trim() || !password) {
    return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
  }
  if (!/^\d{10}$/.test(nationalId.trim())) {
    return NextResponse.json({ error: "رقم الهوية يجب أن يكون 10 أرقام" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
  }

  const dupUser = await prisma.user.findFirst({
    where: { OR: [{ username: username.trim() }, { nationalId: nationalId.trim() }] },
  });
  if (dupUser) {
    return NextResponse.json({ error: "اسم المستخدم أو رقم الهوية مستخدم مسبقاً" }, { status: 400 });
  }

  const manager = await prisma.user.create({
    data: {
      username: username.trim(),
      name: name.trim(),
      nationalId: nationalId.trim(),
      passwordHash: await bcrypt.hash(password, 10),
      role: "PLATFORM_MANAGER",
      isActive: true,
    },
  });

  await logAudit(null, manager.name, "PLATFORM_MANAGER", "إعداد المنصة (أول تثبيت)", `تم إنشاء حساب مدير المنصة: ${manager.username}`);

  return NextResponse.json({ ok: true });
}
