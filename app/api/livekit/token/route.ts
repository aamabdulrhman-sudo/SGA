import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff } from "@/lib/auth";
import { createJoinToken, livekitEnabled, publicWsUrl } from "@/lib/livekit";

/** رمز دخول غرفة البث الداخلي — المذيع (فريق العمل) ينشر، الحضور يشاهدون فقط */
export async function POST(req: NextRequest) {
  if (!livekitEnabled()) {
    return NextResponse.json({ error: "البث الداخلي غير مفعّل — يلزم ضبط LIVEKIT_API_KEY و LIVEKIT_API_SECRET" }, { status: 503 });
  }
  const { assemblyId } = await req.json().catch(() => ({}) as any);
  if (!assemblyId) return NextResponse.json({ error: "assemblyId مطلوب" }, { status: 400 });

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  if (!isStaff(session.role)) {
    if (session.assemblyId !== assemblyId) {
      return NextResponse.json({ error: "غير مصرح — الجلسة غير مرتبطة بهذه الجمعية" }, { status: 403 });
    }
  } else {
    const assembly = await prisma.assembly.findUnique({ where: { id: assemblyId } });
    if (!assembly) return NextResponse.json({ error: "الجمعية غير موجودة" }, { status: 404 });
  }

  const token = await createJoinToken(assemblyId, session);
  return NextResponse.json({ token, wsUrl: publicWsUrl(req) });
}
