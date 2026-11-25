import { NextRequest, NextResponse } from "next/server";
import { getSession, logAudit } from "@/lib/auth";
import { getNotificationsConfig, saveNotificationsConfig, sendViaChannel, type NotificationsConfig } from "@/lib/notifications";

/** Notification gateway settings (SMS / Email / WhatsApp) — platform manager only */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "PLATFORM_MANAGER") {
    return NextResponse.json({ error: "هذه الإعدادات متاحة لمدير المنصة فقط" }, { status: 403 });
  }
  return NextResponse.json({ ok: true, config: await getNotificationsConfig() });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PLATFORM_MANAGER") {
    return NextResponse.json({ error: "هذه الإعدادات متاحة لمدير المنصة فقط" }, { status: 403 });
  }

  const body = await req.json();
  const config: NotificationsConfig = {
    sms: { enabled: !!body.sms?.enabled, providerName: body.sms?.providerName || "", endpointUrl: body.sms?.endpointUrl || "", apiKey: body.sms?.apiKey || "", senderName: body.sms?.senderName || "" },
    email: { enabled: !!body.email?.enabled, providerName: body.email?.providerName || "", endpointUrl: body.email?.endpointUrl || "", apiKey: body.email?.apiKey || "", senderName: body.email?.senderName || "", fromEmail: body.email?.fromEmail || "" },
    whatsapp: { enabled: !!body.whatsapp?.enabled, providerName: body.whatsapp?.providerName || "", endpointUrl: body.whatsapp?.endpointUrl || "", apiKey: body.whatsapp?.apiKey || "", senderName: body.whatsapp?.senderName || "" },
  };

  await saveNotificationsConfig(config);
  await logAudit(null, session.name, session.role, "تحديث إعدادات الرسائل", `SMS: ${config.sms.enabled ? "مفعل" : "معطل"} | بريد: ${config.email.enabled ? "مفعل" : "معطل"} | واتساب: ${config.whatsapp.enabled ? "مفعل" : "معطل"}`);

  return NextResponse.json({ ok: true });
}

/** Send a test message through a specific channel */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PLATFORM_MANAGER") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { channel, recipient } = await req.json();
  const config = await getNotificationsConfig();
  const cfg = config[channel as keyof NotificationsConfig];
  if (!cfg) return NextResponse.json({ error: "قناة غير معروفة" }, { status: 400 });
  if (!cfg.enabled || !cfg.endpointUrl) {
    return NextResponse.json({ error: "القناة غير مفعلة أو رابط الخدمة فارغ" }, { status: 400 });
  }
  if (!recipient) return NextResponse.json({ error: "أدخل رقم/عنوان المستلم التجريبي" }, { status: 400 });

  const ok = await sendViaChannel(cfg, recipient, "رسالة تجريبية من منصة الجمعيات العمومية (SGA)");

  if (ok) {
    await logAudit(null, session.name, session.role, "اختبار بوابة رسائل", `قناة: ${channel} → ${recipient}`);
    return NextResponse.json({ ok: true, message: `تم إرسال رسالة الاختبار عبر ${channel} بنجاح` });
  }
  return NextResponse.json({ error: "فشل الإرسال — تحقق من رابط الخدمة ومفتاح الـ API" }, { status: 502 });
}
