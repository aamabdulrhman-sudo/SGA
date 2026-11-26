import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff, logAudit } from "@/lib/auth";
import * as XLSX from "xlsx";

/** Add a shareholder to the company register (staff) */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { companyId, name, nationalId, mobile, email, sharesCount } = await req.json();
  if (!companyId || !name?.trim() || !nationalId?.trim() || !sharesCount) {
    return NextResponse.json({ error: "الشركة والاسم والهوية وعدد الأسهم مطلوبة" }, { status: 400 });
  }
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "الشركة غير موجودة" }, { status: 404 });
  }
  const dup = await prisma.companyShareholder.findFirst({
    where: { companyId, nationalId: nationalId.trim() },
  });
  if (dup) {
    return NextResponse.json({ error: "رقم الهوية مسجل مسبقاً في سجل الشركة" }, { status: 400 });
  }
  const sh = await prisma.companyShareholder.create({
    data: {
      companyId,
      name: name.trim(),
      nationalId: nationalId.trim(),
      mobile: mobile?.trim() || null,
      email: email?.trim() || null,
      sharesCount: Number(sharesCount),
    },
  });
  await logAudit(
    null,
    session.name,
    session.role,
    "إضافة مساهم لسجل الشركة",
    `${sh.name} (هوية: ${sh.nationalId}) — ${sh.sharesCount} سهم — الشركة: ${company.name}`
  );
  return NextResponse.json({ ok: true, id: sh.id });
}

/** Bulk import to the company register from Excel/CSV (staff) */
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const formData = await req.formData();
  const companyId = formData.get("companyId") as string;
  const file = formData.get("file") as File;
  if (!companyId || !file) {
    return NextResponse.json({ error: "الشركة والملف مطلوبان" }, { status: 400 });
  }
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "الشركة غير موجودة" }, { status: 404 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buf, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const HEADER_MAP: Record<string, string> = {
    "الاسم": "name",
    "الاسم الكامل": "name",
    "اسم المساهم": "name",
    "name": "name",
    "الهوية": "nationalId",
    "رقم الهوية": "nationalId",
    "السجل التجاري": "nationalId",
    "national_id": "nationalId",
    "nationalid": "nationalId",
    "id": "nationalId",
    "الجوال": "mobile",
    "رقم الجوال": "mobile",
    "mobile": "mobile",
    "البريد": "email",
    "البريد الإلكتروني": "email",
    "email": "email",
    "الأسهم": "sharesCount",
    "عدد الأسهم": "sharesCount",
    "shares": "sharesCount",
    "shares_count": "sharesCount",
  };

  let imported = 0;
  const errors: string[] = [];

  for (const [i, row] of rows.entries()) {
    const mapped: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      const key = HEADER_MAP[String(k).trim().toLowerCase()] || HEADER_MAP[String(k).trim()];
      if (key) mapped[key] = String(v).trim();
    }
    if (!mapped.name || !mapped.nationalId || !mapped.sharesCount) {
      errors.push(`الصف ${i + 2}: بيانات ناقصة (الاسم/الهوية/الأسهم)`);
      continue;
    }
    const shares = parseInt(mapped.sharesCount.replace(/,/g, ""), 10);
    if (isNaN(shares) || shares <= 0) {
      errors.push(`الصف ${i + 2}: عدد أسهم غير صالح`);
      continue;
    }
    const dup = await prisma.companyShareholder.findFirst({
      where: { companyId, nationalId: mapped.nationalId },
    });
    if (dup) {
      errors.push(`الصف ${i + 2}: الهوية ${mapped.nationalId} مسجلة مسبقاً — تم التجاوز`);
      continue;
    }
    await prisma.companyShareholder.create({
      data: {
        companyId,
        name: mapped.name,
        nationalId: mapped.nationalId,
        mobile: mapped.mobile || null,
        email: mapped.email || null,
        sharesCount: shares,
      },
    });
    imported++;
  }

  await logAudit(
    null,
    session.name,
    session.role,
    "استيراد سجل مساهمي الشركة",
    `تم استيراد ${imported} مساهم من الملف ${file.name} — الشركة: ${company.name}${errors.length ? ` — تحذيرات: ${errors.length}` : ""}`
  );

  return NextResponse.json({ ok: true, imported, errors: errors.slice(0, 20) });
}

/** Remove a shareholder from the company register (staff) — assembly snapshots unaffected */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await req.json();
  const sh = await prisma.companyShareholder.findUnique({ where: { id }, include: { company: true } });
  if (!sh) {
    return NextResponse.json({ error: "المساهم غير موجود في السجل" }, { status: 404 });
  }
  await prisma.companyShareholder.delete({ where: { id: sh.id } });
  await logAudit(
    null,
    session.name,
    session.role,
    "حذف مساهم من سجل الشركة",
    `${sh.name} (هوية: ${sh.nationalId}) — الشركة: ${sh.company.name}`
  );
  return NextResponse.json({ ok: true });
}
