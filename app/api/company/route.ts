import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff, logAudit } from "@/lib/auth";

/** Company data + register shareholders (staff only, scoped lookups) */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const slug = req.nextUrl.searchParams.get("slug");
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!slug && !companyId) {
    return NextResponse.json({ error: "slug أو companyId مطلوب" }, { status: 400 });
  }
  const company = await prisma.company.findUnique({
    where: slug ? { slug } : { id: companyId! },
    include: { registerShareholders: { orderBy: { createdAt: "asc" } } },
  });
  if (!company) {
    return NextResponse.json({ error: "الشركة غير موجودة" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      crNumber: company.crNumber,
      logoUrl: company.logoUrl,
    },
    register: company.registerShareholders.map((s) => ({
      id: s.id,
      name: s.name,
      nationalId: s.nationalId,
      mobile: s.mobile,
      email: s.email,
      sharesCount: s.sharesCount,
    })),
  });
}

/** Create company (staff) */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { name, slug, crNumber, themeColor, logoUrl } = await req.json();
  if (!name?.trim() || !slug?.trim() || !crNumber?.trim()) {
    return NextResponse.json({ error: "الاسم والسجل التجاري والمعرف مطلوبة" }, { status: 400 });
  }
  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const dup = await prisma.company.findUnique({ where: { slug: cleanSlug } });
  if (dup) {
    return NextResponse.json({ error: "المعرف (slug) مستخدم مسبقاً" }, { status: 400 });
  }
  const company = await prisma.company.create({
    data: {
      name: name.trim(),
      slug: cleanSlug,
      crNumber: crNumber.trim(),
      themeColor: themeColor || "#0F172A",
      logoUrl: logoUrl || null,
    },
  });
  await logAudit(null, session.name, session.role, "إنشاء شركة", `${company.name} (${company.slug})`);
  return NextResponse.json({ ok: true, slug: company.slug });
}

/** Update company data (staff) — slug stays immutable to keep /c/[slug] links stable */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { companyId, name, crNumber, themeColor, logoUrl } = await req.json();
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "الشركة غير موجودة" }, { status: 404 });
  }
  if (!name?.trim() || !crNumber?.trim()) {
    return NextResponse.json({ error: "الاسم والسجل التجاري مطلوبان" }, { status: 400 });
  }
  const data: Record<string, unknown> = {
    name: name.trim(),
    crNumber: crNumber.trim(),
    themeColor: themeColor || company.themeColor,
    logoUrl: logoUrl?.trim() ? logoUrl.trim() : null,
  };
  await prisma.company.update({ where: { id: company.id }, data });
  await logAudit(
    null,
    session.name,
    session.role,
    "تعديل بيانات شركة",
    `الشركة: ${company.name} (${company.slug})`
  );
  return NextResponse.json({ ok: true });
}

/** Delete company (staff) — cascades to its assemblies and all related records */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { companyId } = await req.json();
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { _count: { select: { assemblies: true } } },
  });
  if (!company) {
    return NextResponse.json({ error: "الشركة غير موجودة" }, { status: 404 });
  }
  if (company._count.assemblies > 0) {
    return NextResponse.json(
      { error: `لا يمكن حذف الشركة — تحتوي على ${company._count.assemblies} جمعية. احذف الجمعيات أولاً.` },
      { status: 400 }
    );
  }
  await prisma.company.delete({ where: { id: company.id } });
  await logAudit(
    null,
    session.name,
    session.role,
    "حذف شركة",
    `الشركة المحذوفة: ${company.name} (${company.slug})`
  );
  return NextResponse.json({ ok: true });
}
