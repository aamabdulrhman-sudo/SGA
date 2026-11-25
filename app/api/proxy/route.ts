import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, logAudit } from "@/lib/auth";

/** Shareholder submits a new proxy delegation request */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SHAREHOLDER" || !session.shareholderId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { proxyName, proxyNationalId, proxyMobile, proxyEmail, documentUrl } = await req.json();

  if (!proxyName?.trim() || !proxyNationalId?.trim()) {
    return NextResponse.json({ error: "اسم المفوض ورقم هويته مطلوبان" }, { status: 400 });
  }
  if (!/^\d{10}$/.test(proxyNationalId.trim())) {
    return NextResponse.json({ error: "رقم الهوية يجب أن يكون 10 أرقام" }, { status: 400 });
  }

  const shareholder = await prisma.shareholder.findUnique({
    where: { id: session.shareholderId },
    include: { assembly: true },
  });
  if (!shareholder) return NextResponse.json({ error: "حساب غير موجود" }, { status: 404 });
  if (shareholder.assembly.status !== "ACTIVE") {
    return NextResponse.json({ error: "الجمعية غير نشطة" }, { status: 400 });
  }

  const activeExisting = await prisma.proxy.findFirst({
    where: {
      shareholderId: shareholder.id,
      assemblyId: shareholder.assemblyId,
      status: { in: ["PENDING", "APPROVED"] },
    },
  });
  if (activeExisting) {
    return NextResponse.json(
      { error: "لديك طلب توكيل قائم بالفعل. يجب إلغاؤه أو رفضه قبل إضافة مفوض جديد" },
      { status: 400 }
    );
  }

  const proxy = await prisma.proxy.create({
    data: {
      assemblyId: shareholder.assemblyId,
      shareholderId: shareholder.id,
      proxyName: proxyName.trim(),
      proxyNationalId: proxyNationalId.trim(),
      proxyMobile: proxyMobile?.trim() || null,
      proxyEmail: proxyEmail?.trim() || null,
      documentUrl: documentUrl || null,
      status: "PENDING",
    },
  });

  await logAudit(
    shareholder.assemblyId,
    shareholder.name,
    "SHAREHOLDER",
    "طلب توكيل جديد",
    `تعيين: ${proxyName} (هوية: ${proxyNationalId}) — بانتظار اعتماد أمين السر`
  );

  return NextResponse.json({ ok: true, proxyId: proxy.id });
}

/** Shareholder revokes their own proxy (only while PENDING or before voting opens usage) */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SHAREHOLDER" || !session.shareholderId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { proxyId } = await req.json();
  const proxy = await prisma.proxy.findFirst({
    where: {
      id: proxyId,
      shareholderId: session.shareholderId,
      status: { in: ["PENDING", "APPROVED"] },
    },
  });
  if (!proxy) return NextResponse.json({ error: "طلب غير موجود أو غير قابل للإلغاء" }, { status: 404 });

  await prisma.proxy.update({
    where: { id: proxy.id },
    data: { status: "REVOKED" },
  });

  await logAudit(
    proxy.assemblyId,
    session.name,
    "SHAREHOLDER",
    "إلغاء توكيل",
    `إلغاء وكالة: ${proxy.proxyName} (هوية: ${proxy.proxyNationalId})`
  );

  return NextResponse.json({ ok: true });
}
