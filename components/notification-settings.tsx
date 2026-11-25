"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MessageSquare, Mail, Smartphone, Send, CheckCircle2, XCircle } from "lucide-react";

type ChannelConfig = {
  enabled: boolean;
  providerName: string;
  endpointUrl: string;
  apiKey: string;
  senderName: string;
};

type Config = {
  sms: ChannelConfig;
  email: ChannelConfig & { fromEmail: string };
  whatsapp: ChannelConfig;
};

const EMPTY: Config = {
  sms: { enabled: false, providerName: "", endpointUrl: "", apiKey: "", senderName: "" },
  email: { enabled: false, providerName: "", endpointUrl: "", apiKey: "", senderName: "", fromEmail: "" },
  whatsapp: { enabled: false, providerName: "", endpointUrl: "", apiKey: "", senderName: "" },
};

function ChannelCard({
  channel,
  icon: Icon,
  title,
  desc,
  config,
  onChange,
  testRecipient,
  setTestRecipient,
  onTest,
  busy,
  placeholder,
}: any) {
  const c: ChannelConfig & { fromEmail?: string } = config;
  return (
    <Card className={c.enabled ? "border-emerald-300" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-5 w-5 text-emerald-600" />
            {title}
          </CardTitle>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
            <input
              type="checkbox"
              checked={c.enabled}
              onChange={(e) => onChange({ ...c, enabled: e.target.checked })}
              className="h-4 w-4 accent-emerald-600"
            />
            {c.enabled ? <Badge variant="success">مفعل</Badge> : <Badge variant="muted">معطل</Badge>}
          </label>
        </div>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>اسم مزود الخدمة</Label>
            <Input dir="ltr" placeholder="مثال: Unifonic / Twilio" value={c.providerName} onChange={(e) => onChange({ ...c, providerName: e.target.value })} />
          </div>
          <div>
            <Label>اسم المرسل (Sender)</Label>
            <Input dir="ltr" placeholder="SGA-Platform" value={c.senderName} onChange={(e) => onChange({ ...c, senderName: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>رابط الخدمة (Webhook / API Endpoint)</Label>
          <Input dir="ltr" placeholder="https://gateway.provider.com/v1/send" value={c.endpointUrl} onChange={(e) => onChange({ ...c, endpointUrl: e.target.value })} />
        </div>
        <div>
          <Label>مفتاح الـ API (Authorization: Bearer)</Label>
          <Input dir="ltr" type="password" placeholder="sk-..." value={c.apiKey} onChange={(e) => onChange({ ...c, apiKey: e.target.value })} />
        </div>
        {channel === "email" && (
          <div>
            <Label>البريد المرسل (From)</Label>
            <Input dir="ltr" type="email" placeholder="noreply@company.sa" value={c.fromEmail} onChange={(e) => onChange({ ...c, fromEmail: e.target.value })} />
          </div>
        )}
        <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-48">
            <Label>رقم/عنوان تجريبي للاختبار</Label>
            <Input dir="ltr" placeholder={placeholder} value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" disabled={busy || !c.enabled} onClick={onTest}>
            <Send className="h-3.5 w-3.5" /> إرسال رسالة اختبار
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NotificationSettings() {
  const [config, setConfig] = useState<Config>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testSms, setTestSms] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testWa, setTestWa] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/settings", { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setConfig({ ...EMPTY, ...data.config });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok) setMsg({ ok: true, text: "تم حفظ الإعدادات بنجاح" });
      else setMsg({ ok: false, text: data.error || "حدث خطأ" });
    } finally {
      setBusy(false);
    }
  }

  async function test(channel: string, recipient: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, recipient }),
      });
      const data = await res.json();
      if (res.ok) setMsg({ ok: true, text: data.message });
      else setMsg({ ok: false, text: data.error || "فشل الاختبار" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`rounded-xl p-3.5 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.ok ? <CheckCircle2 className="inline h-4 w-4 ml-1" /> : <XCircle className="inline h-4 w-4 ml-1" />}
          {msg.text}
        </div>
      )}

      <Card>
        <CardContent className="py-4 text-sm text-slate-600 leading-7">
          <strong>طريقة الربط:</strong> تدعم المنصة أي بوابة ترسل عبر HTTP POST. عند إرسال رمز التحقق يُرسل الطلب التالي إلى
          رابط الخدمة مع الترويسة <code dir="ltr" className="bg-slate-100 px-1 rounded">Authorization: Bearer &lt;API Key&gt;</code>:
          <pre dir="ltr" className="bg-navy-800 text-emerald-300 text-xs rounded-lg p-3 mt-2 overflow-x-auto">{`POST <endpointUrl>
{
  "to": "05xxxxxxxx",
  "message": "رمز التحقق: 1234",
  "from": "<senderName>",
  "provider": "<providerName>"
}`}</pre>
          ترتيب القنوات عند إرسال رمز التحقق: تُجرَّب جميع القنوات المفعلة المتوفرة لديها بيانات تواصل للمستخدم (SMS ← البريد ← واتساب).
          إن لم تُفعّل أي بوابة ولم يكن وضع التجربة مفعلاً، لن يستطيع المساهمون استلام رموز الدخول.
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-5">
        <ChannelCard
          channel="sms"
          icon={Smartphone}
          title="رسائل SMS"
          desc="بوابة الرسائل النصية لإرسال رموز التحقق للمساهمين والمفوضين"
          config={config.sms}
          onChange={(c: any) => setConfig({ ...config, sms: c })}
          testRecipient={testSms}
          setTestRecipient={setTestSms}
          onTest={() => test("sms", testSms)}
          busy={busy}
          placeholder="05xxxxxxxx"
        />
        <ChannelCard
          channel="email"
          icon={Mail}
          title="البريد الإلكتروني"
          desc="بوابة البريد لإرسال رموز التحقق والإشعارات عبر Email"
          config={config.email}
          onChange={(c: any) => setConfig({ ...config, email: c })}
          testRecipient={testEmail}
          setTestRecipient={setTestEmail}
          onTest={() => test("email", testEmail)}
          busy={busy}
          placeholder="name@email.com"
        />
        <ChannelCard
          channel="whatsapp"
          icon={MessageSquare}
          title="واتساب WhatsApp"
          desc="بوابة واتساب (مثل WhatsApp Business API) لإرسال رموز التحقق"
          config={config.whatsapp}
          onChange={(c: any) => setConfig({ ...config, whatsapp: c })}
          testRecipient={testWa}
          setTestRecipient={setTestWa}
          onTest={() => test("whatsapp", testWa)}
          busy={busy}
          placeholder="9665xxxxxxxx"
        />
      </div>

      <div className="flex justify-end sticky bottom-4">
        <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 shadow-xl" onClick={save} disabled={busy}>
          {busy ? "جارٍ الحفظ..." : "حفظ جميع الإعدادات"}
        </Button>
      </div>
    </div>
  );
}
