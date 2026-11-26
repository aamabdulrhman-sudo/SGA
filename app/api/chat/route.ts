import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff } from "@/lib/auth";

const MAX_LEN = 500;
const FLOOD_MS = 2000;

/** التحقق أن الجلسة مخوّلة للدردشة في هذه الجمعية */
async function authorize(assemblyId: string) {
  const session = await getSession();
  if (!session) return { error: "يجب تسجيل الدخول", status: 401 as const };
  if (isStaff(session.role)) {
    const assembly = await prisma.assembly.findUnique({ where: { id: assemblyId } });
    if (!assembly) return { error: "الجمعية غير موجودة", status: 404 as const };
    return { session };
  }
  if (session.assemblyId !== assemblyId) {
    return { error: "غير مصرح — الجلسة غير مرتبطة بهذه الجمعية", status: 403 as const };
  }
  return { session };
}

/** جلب رسائل الدردشة (آخر 200 رسالة) */
export async function GET(req: NextRequest) {
  const assemblyId = req.nextUrl.searchParams.get("assemblyId");
  if (!assemblyId) return NextResponse.json({ error: "assemblyId مطلوب" }, { status: 400 });
  const auth = await authorize(assemblyId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const messages = await prisma.chatMessage.findMany({
    where: { assemblyId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return NextResponse.json({ messages });
}

/** إرسال رسالة / استفسار */
export async function POST(req: NextRequest) {
  const { assemblyId, message } = await req.json().catch(() => ({}) as any);
  if (!assemblyId || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "الرسالة فارغة" }, { status: 400 });
  }
  if (message.trim().length > MAX_LEN) {
    return NextResponse.json({ error: `الرسالة طويلة — الحد الأقصى ${MAX_LEN} حرف` }, { status: 400 });
  }
  const auth = await authorize(assemblyId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const session = auth.session!;

  // حماية بسيطة من التكرار السريع
  const last = await prisma.chatMessage.findFirst({
    where: { assemblyId, senderName: session.name },
    orderBy: { createdAt: "desc" },
  });
  if (last && Date.now() - new Date(last.createdAt).getTime() < FLOOD_MS) {
    return NextResponse.json({ error: "انتظر لحظات قبل إرسال رسالة جديدة" }, { status: 429 });
  }

  const staff = isStaff(session.role);
  const created = await prisma.chatMessage.create({
    data: {
      assemblyId,
      senderName: session.name,
      senderRole: session.role,
      message: message.trim(),
      isStaffReply: staff,
    },
  });
  return NextResponse.json({ ok: true, message: created });
}
