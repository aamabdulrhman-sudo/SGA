import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, logAudit } from "@/lib/auth";
import * as XLSX from "xlsx";

/** Manually add a shareholder (secretary) */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SECRETARY") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { assemblyId, name, nationalId, mobile, email, sharesCount } = await req.json();
  if (!assemblyId || !name?.trim() || !nationalId?.trim() || !sharesCount) {
    return NextResponse.json({ error: "الاسم والهوية وعدد الأسهم مطلوبة" }, { status: 400 });
  }
  const dup = await prisma.shareholder.findFirst({
    where: { assemblyId, nationalId: nationalId.trim() },
  });
  if (dup) {
    return NextResponse.json({ error: "رقم الهوية مسجل مسبقاً" }, { status: 400 });
  }
  const sh = await prisma.shareholder.create({
    data: {
      assemblyId,
      name: name.trim(),
      nationalId: nationalId.trim(),
      mobile: mobile?.trim() || null,
      email: email?.trim() || null,
      sharesCount: Number(sharesCount),
    },
  });
  await logAudit(
    assemblyId,
    session.name,
    "SECRETARY",
    "إضافة مساهم",
    `${sh.name} (هوية: ${sh.nationalId}) — ${sh.sharesCount} سهم`
  );
  return NextResponse.json({ ok: true, id: sh.id });
}

/** Bulk import from Excel/CSV (secretary) */
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SECRETARY") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const formData = await req.formData();
  const assemblyId = formData.get("assemblyId") as string;
  const file = formData.get("file") as File;
  if (!assemblyId || !file) {
    return NextResponse.json({ error: "الملف والجمعية مطلوبان" }, { status: 400 });
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
    const dup = await prisma.shareholder.findFirst({
      where: { assemblyId, nationalId: mapped.nationalId },
    });
    if (dup) {
      errors.push(`الصف ${i + 2}: الهوية ${mapped.nationalId} مسجلة مسبقاً — تم التجاوز`);
      continue;
    }
    await prisma.shareholder.create({
      data: {
        assemblyId,
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
    assemblyId,
    session.name,
    "SECRETARY",
    "استيراد سجل مساهمين",
    `تم استيراد ${imported} مساهم من الملف ${file.name}${errors.length ? ` — تحذيرات: ${errors.length}` : ""}`
  );

  return NextResponse.json({ ok: true, imported, errors: errors.slice(0, 20) });
}
