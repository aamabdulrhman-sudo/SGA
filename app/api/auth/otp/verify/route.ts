import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveIdentifier, resolveStaff, createSession, logAudit } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { identifier, code } = await req.json();
  if (!identifier || !code) {
    return NextResponse.json({ error: "الرجاء إدخال رمز التحقق" }, { status: 400 });
  }

  const clean = identifier.trim();
  const demo = process.env.DEMO_MODE === "true";

  const staff = await resolveStaff(clean);
  if (staff?.disabled) {
    return NextResponse.json({ error: "هذا الحساب معطل — راجع مدير المنصة" }, { status: 403 });
  }

  if (!demo || code !== "1234") {
    const otp = await prisma.otpCode.findFirst({
      where: {
        identifier: clean,
        code: code.trim(),
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, { status: 401 });
    }
    await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });
  }

  const resolved = await resolveIdentifier(clean);
  if (!resolved) {
    return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  }

  let redirect = "/login";
  const auditAssemblyId: string | null = "assemblyId" in resolved ? (resolved.assemblyId ?? null) : null;

  if (resolved.type === "PLATFORM_MANAGER" || resolved.type === "SECRETARY") {
    await createSession({
      role: resolved.type,
      name: resolved.name,
      identifier: clean,
      userId: resolved.userId,
    });
    await logAudit(null, resolved.name, resolved.type, "تسجيل دخول", "دخول فريق العمل عبر رمز التحقق");
    redirect = "/admin";
  } else if (resolved.type === "SHAREHOLDER") {
    await createSession({
      role: "SHAREHOLDER",
      name: resolved.name,
      identifier: clean,
      shareholderId: resolved.shareholderId,
      assemblyId: resolved.assemblyId,
      companyId: resolved.companyId,
    });
    await logAudit(
      auditAssemblyId,
      resolved.name,
      "SHAREHOLDER",
      "تسجيل دخول مساهم",
      `دخول عبر الهوية: ${clean}`
    );
  } else {
    await createSession({
      role: "PROXY",
      name: resolved.name,
      identifier: clean,
      proxyIds: resolved.proxyIds,
      assemblyId: resolved.assemblyId,
      companyId: resolved.companyId,
    });
    await logAudit(
      auditAssemblyId,
      resolved.name,
      "PROXY",
      "تسجيل دخول مفوض",
      `دخول المفوض عبر الهوية: ${clean}`
    );
  }

  if (resolved.companyId) {
    const company = await prisma.company.findUnique({ where: { id: resolved.companyId } });
    if (company) redirect = `/c/${company.slug}`;
  }

  return NextResponse.json({ ok: true, role: resolved.type, redirect });
}
