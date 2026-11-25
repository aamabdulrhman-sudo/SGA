import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff, logAudit } from "@/lib/auth";
import bcrypt from "bcryptjs";

async function guard() {
  const session = await getSession();
  if (!session || !isStaff(session.role)) return null;
  return session;
}

/** List staff accounts — secretary sees secretaries only, manager sees all */
export async function GET() {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const where = session.role === "PLATFORM_MANAGER" ? {} : { role: "SECRETARY" };
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true, username: true, name: true, nationalId: true,
      role: true, isActive: true, createdAt: true,
    },
  });
  return NextResponse.json({ ok: true, users });
}

/** Create a staff account */
export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { name, username, nationalId, password, role } = await req.json();

  const targetRole = role === "PLATFORM_MANAGER" ? "PLATFORM_MANAGER" : "SECRETARY";
  if (targetRole === "PLATFORM_MANAGER" && session.role !== "PLATFORM_MANAGER") {
    return NextResponse.json({ error: "إنشاء حسابات مدير المنصة متاح لمدير المنصة فقط" }, { status: 403 });
  }
  if (!name?.trim() || !username?.trim() || !nationalId?.trim() || !password) {
    return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
  }
  if (!/^\d{10}$/.test(nationalId.trim())) {
    return NextResponse.json({ error: "رقم الهوية يجب أن يكون 10 أرقام" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
  }

  const dup = await prisma.user.findFirst({
    where: { OR: [{ username: username.trim() }, { nationalId: nationalId.trim() }] },
  });
  if (dup) return NextResponse.json({ error: "اسم المستخدم أو الهوية مستخدم مسبقاً" }, { status: 400 });

  const user = await prisma.user.create({
    data: {
      username: username.trim(),
      name: name.trim(),
      nationalId: nationalId.trim(),
      passwordHash: await bcrypt.hash(password, 10),
      role: targetRole,
      isActive: true,
    },
  });

  await logAudit(null, session.name, session.role, "إضافة حساب مستخدم", `${user.name} (${user.username}) — الدور: ${targetRole === "PLATFORM_MANAGER" ? "مدير منصة" : "أمين سر"}`);

  return NextResponse.json({ ok: true, id: user.id });
}

/** Update a staff account: enable/disable, reset password, rename */
export async function PATCH(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { userId, isActive, password, name } = await req.json();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });

  if (target.role === "PLATFORM_MANAGER" && session.role !== "PLATFORM_MANAGER") {
    return NextResponse.json({ error: "لا يمكن تعديل حسابات مدير المنصة إلا بواسطة مدير المنصة" }, { status: 403 });
  }
  if (target.id === session.userId && isActive === false) {
    return NextResponse.json({ error: "لا يمكن تعطيل حسابك الحالي" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (isActive !== undefined) data.isActive = !!isActive;
  if (name?.trim()) data.name = name.trim();
  if (password) {
    if (password.length < 8) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  await prisma.user.update({ where: { id: target.id }, data });

  const action = isActive !== undefined ? (isActive ? "تفعيل حساب" : "تعطيل حساب") : password ? "إعادة تعيين كلمة مرور" : "تعديل حساب";
  await logAudit(null, session.name, session.role, action, `الحساب: ${target.name} (${target.username})`);

  return NextResponse.json({ ok: true });
}

/** Delete a staff account */
export async function DELETE(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { userId } = await req.json();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });

  if (target.role === "PLATFORM_MANAGER" && session.role !== "PLATFORM_MANAGER") {
    return NextResponse.json({ error: "لا يمكن حذف حسابات مدير المنصة إلا بواسطة مدير المنصة" }, { status: 403 });
  }
  if (target.id === session.userId) {
    return NextResponse.json({ error: "لا يمكن حذف حسابك الحالي" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: target.id } });
  await logAudit(null, session.name, session.role, "حذف حساب مستخدم", `الحساب المحذوف: ${target.name} (${target.username})`);

  return NextResponse.json({ ok: true });
}
