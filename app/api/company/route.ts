import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, logAudit } from "@/lib/auth";

/** Create / update company (super admin secretary) */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SECRETARY") {
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
  await logAudit(null, session.name, "SECRETARY", "إنشاء شركة", `${company.name} (${company.slug})`);
  return NextResponse.json({ ok: true, slug: company.slug });
}
