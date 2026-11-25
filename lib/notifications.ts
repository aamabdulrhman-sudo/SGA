import "server-only";
import { prisma } from "./prisma";

export type ChannelConfig = {
  enabled: boolean;
  providerName: string;
  endpointUrl: string;
  apiKey: string;
  senderName: string;
};

export type NotificationsConfig = {
  sms: ChannelConfig;
  email: ChannelConfig & { fromEmail: string };
  whatsapp: ChannelConfig;
};

const DEFAULTS: NotificationsConfig = {
  sms: { enabled: false, providerName: "", endpointUrl: "", apiKey: "", senderName: "" },
  email: { enabled: false, providerName: "", endpointUrl: "", apiKey: "", senderName: "", fromEmail: "" },
  whatsapp: { enabled: false, providerName: "", endpointUrl: "", apiKey: "", senderName: "" },
};

export async function getNotificationsConfig(): Promise<NotificationsConfig> {
  const row = await prisma.setting.findUnique({ where: { key: "notifications" } });
  if (!row) return DEFAULTS;
  try {
    const parsed = JSON.parse(row.value);
    return {
      sms: { ...DEFAULTS.sms, ...parsed.sms },
      email: { ...DEFAULTS.email, ...parsed.email },
      whatsapp: { ...DEFAULTS.whatsapp, ...parsed.whatsapp },
    };
  } catch {
    return DEFAULTS;
  }
}

export async function saveNotificationsConfig(config: NotificationsConfig) {
  await prisma.setting.upsert({
    where: { key: "notifications" },
    update: { value: JSON.stringify(config) },
    create: { key: "notifications", value: JSON.stringify(config) },
  });
}

/** POSTs a generic JSON payload to the configured gateway endpoint. */
export async function sendViaChannel(cfg: ChannelConfig, to: string, message: string, extra?: Record<string, string>) {
  if (!cfg.enabled || !cfg.endpointUrl) return false;
  try {
    const res = await fetch(cfg.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        to,
        message,
        from: cfg.senderName || undefined,
        provider: cfg.providerName || undefined,
        ...extra,
      }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type OtpDeliveryResult = {
  sent: boolean;
  channels: string[];
  fallbackCode?: string; // returned only in demo mode when no gateway is configured
};

export async function deliverOtp(
  contacts: { mobile?: string | null; email?: string | null },
  code: string
): Promise<OtpDeliveryResult> {
  const config = await getNotificationsConfig();
  const message = `رمز التحقق الخاص بك في منصة الجمعيات العمومية: ${code}`;
  const channels: string[] = [];

  if (contacts.mobile && config.sms.enabled) {
    if (await sendViaChannel(config.sms, contacts.mobile, message)) channels.push("sms");
  }
  if (contacts.email && config.email.enabled) {
    if (
      await sendViaChannel(
        config.email,
        contacts.email,
        message,
        config.email.fromEmail ? { from: config.email.fromEmail } : undefined
      )
    )
      channels.push("email");
  }
  if (contacts.mobile && config.whatsapp.enabled) {
    if (await sendViaChannel(config.whatsapp, contacts.mobile, message)) channels.push("whatsapp");
  }

  const demo = process.env.DEMO_MODE === "true";
  return {
    sent: channels.length > 0,
    channels,
    fallbackCode: demo && channels.length === 0 ? code : undefined,
  };
}
