import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

/**
 * DEMO ONLY: quick role switcher for testing all flows instantly.
 */
export async function POST(req: NextRequest) {
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json({ error: "غير متاح" }, { status: 403 });
  }
  const { role } = await req.json();

  if (role === "SECRETARY") {
    const admin = await prisma.adminUser.findFirst();
    if (!admin) return NextResponse.json({ error: "لا يوجد أمين سر" }, { status: 404 });
    await createSession({
      role: "SECRETARY",
      name: admin.name,
      identifier: admin.nationalId,
    });
    return NextResponse.json({ ok: true, redirect: "/admin" });
  }

  const assembly = await prisma.assembly.findFirst({
    include: { company: true },
  });
  if (!assembly) return NextResponse.json({ error: "لا توجد جمعية" }, { status: 404 });

  if (role === "SHAREHOLDER_1" || role === "SHAREHOLDER_2") {
    const nid = role === "SHAREHOLDER_1" ? "1010101010" : "1020202020";
    const sh = await prisma.shareholder.findFirst({
      where: { nationalId: nid, assemblyId: assembly.id },
    });
    if (!sh) return NextResponse.json({ error: "المساهم غير موجود" }, { status: 404 });
    await createSession({
      role: "SHAREHOLDER",
      name: sh.name,
      identifier: nid,
      shareholderId: sh.id,
      assemblyId: assembly.id,
      companyId: assembly.companyId,
    });
    return NextResponse.json({ ok: true, redirect: `/c/${assembly.company.slug}` });
  }

  if (role === "PROXY") {
    const proxy = await prisma.proxy.findFirst({
      where: { status: "APPROVED", assemblyId: assembly.id },
    });
    if (!proxy) return NextResponse.json({ error: "لا يوجد مفوض معتمد" }, { status: 404 });
    await createSession({
      role: "PROXY",
      name: proxy.proxyName,
      identifier: proxy.proxyNationalId,
      proxyIds: [proxy.id],
      assemblyId: assembly.id,
      companyId: assembly.companyId,
    });
    return NextResponse.json({ ok: true, redirect: `/c/${assembly.company.slug}` });
  }

  return NextResponse.json({ error: "دور غير معروف" }, { status: 400 });
}
