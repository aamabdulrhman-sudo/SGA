import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveIdentifier, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { identifier, code } = await req.json();
  if (!identifier || !code) {
    return NextResponse.json({ error: "الرجاء إدخال رمز التحقق" }, { status: 400 });
  }

  const clean = identifier.trim();
  const demo = process.env.DEMO_MODE === "true";

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

  if (resolved.type === "SECRETARY") {
    await createSession({
      role: "SECRETARY",
      name: resolved.name,
      identifier: clean,
    });
    await prisma.auditLog.create({
      data: {
        actorName: resolved.name,
        actorRole: "SECRETARY",
        action: "تسجيل دخول",
        details: "دخول أمين السر إلى النظام",
      },
    });
  } else if (resolved.type === "SHAREHOLDER") {
    await createSession({
      role: "SHAREHOLDER",
      name: resolved.name,
      identifier: clean,
      shareholderId: resolved.shareholderId,
      assemblyId: resolved.assemblyId,
      companyId: resolved.companyId,
    });
    await prisma.auditLog.create({
      data: {
        assemblyId: resolved.assemblyId,
        actorName: resolved.name,
        actorRole: "SHAREHOLDER",
        action: "تسجيل دخول مساهم",
        details: `دخول عبر الهوية: ${clean}`,
      },
    });
  } else {
    await createSession({
      role: "PROXY",
      name: resolved.name,
      identifier: clean,
      proxyIds: resolved.proxyIds,
      assemblyId: resolved.assemblyId,
      companyId: resolved.companyId,
    });
    await prisma.auditLog.create({
      data: {
        assemblyId: resolved.assemblyId,
        actorName: resolved.name,
        actorRole: "PROXY",
        action: "تسجيل دخول مفوض",
        details: `دخول المفوض عبر الهوية: ${clean}`,
      },
    });
  }

  // redirect target based on company slug
  let slug = "alofoq";
  if (resolved.companyId) {
    const company = await prisma.company.findUnique({ where: { id: resolved.companyId } });
    if (company) slug = company.slug;
  }

  return NextResponse.json({
    ok: true,
    role: resolved.type,
    redirect: `/c/${slug}`,
  });
}
