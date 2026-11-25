import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { resolveStaff, createSession, logAudit } from "@/lib/auth";

/** Staff login (secretary / platform manager) with username or national ID + password */
export async function POST(req: NextRequest) {
  const { identifier, password } = await req.json();
  if (!identifier?.trim() || !password) {
    return NextResponse.json({ error: "اسم المستخدم / رقم الهوية وكلمة المرور مطلوبة" }, { status: 400 });
  }

  const staff = await resolveStaff(identifier);
  if (!staff) {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }
  if (staff.disabled) {
    return NextResponse.json({ error: "هذا الحساب معطل — راجع مدير المنصة" }, { status: 403 });
  }

  const valid = await bcrypt.compare(password, staff.user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }

  const role = staff.user.role as "PLATFORM_MANAGER" | "SECRETARY";
  await createSession({
    role,
    name: staff.user.name,
    identifier: staff.user.nationalId,
    userId: staff.user.id,
  });

  await logAudit(null, staff.user.name, role, "تسجيل دخول", `دخول فريق العمل: ${staff.user.username}`);

  return NextResponse.json({ ok: true, role, redirect: "/admin" });
}
