import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff } from "@/lib/auth";
import { getLiveStatus, livekitEnabled } from "@/lib/livekit";

/** حالة البث الداخلي — للاستقصاء من واجهات الغرف */
export async function GET(req: NextRequest) {
  const assemblyId = req.nextUrl.searchParams.get("assemblyId");
  if (!assemblyId) return NextResponse.json({ error: "assemblyId مطلوب" }, { status: 400 });
  if (!livekitEnabled()) return NextResponse.json({ enabled: false });

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  if (!isStaff(session.role) && session.assemblyId !== assemblyId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const assembly = await prisma.assembly.findUnique({ where: { id: assemblyId } });
  if (!assembly) return NextResponse.json({ error: "الجمعية غير موجودة" }, { status: 404 });

  const status = await getLiveStatus(assemblyId, assembly.internalLive);
  return NextResponse.json({ enabled: true, ...status });
}
