"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, KeyRound, ArrowRight, UserCog, Smartphone } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-b from-navy-800 to-slate-900 flex items-center justify-center text-white">
          جارٍ التحميل...
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function SetupRedirect() {
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        if (d.setupCompleted === false) window.location.href = "/setup";
      })
      .catch(() => {});
  }, []);
  return null;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // تعقيم مسار الإعادة: مسار داخلي فقط (يبدأ بـ/ وليس //) لمنع فتح روابط خارجية
  const rawRedirect = params.get("redirect");
  const redirectTo = rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : null;

  const [tab, setTab] = useState<"otp" | "staff">("otp");
  const [step, setStep] = useState<"id" | "otp">("id");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [sentVia, setSentVia] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [staffUser, setStaffUser] = useState("");
  const [staffPass, setStaffPass] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "otp") otpRef.current?.focus();
  }, [step]);

  async function requestCode() {
    setError("");
    setInfo("");
    if (!identifier.trim()) return setError("الرجاء إدخال رقم الهوية أو السجل التجاري");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "خطأ في الطلب");
      setSentVia(data.demoCode ? "DEMO" : data.sentVia?.join(", ") || null);
      setRoleName(data.name || "");
      setStep("otp");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, code }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "رمز غير صحيح");
      router.push(redirectTo || data.redirect || "/");
    } finally {
      setLoading(false);
    }
  }

  async function staffLogin() {
    setError("");
    if (!staffUser.trim() || !staffPass) return setError("أدخل اسم المستخدم وكلمة المرور");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: staffUser, password: staffPass }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "بيانات غير صحيحة");
      router.push(redirectTo && redirectTo.startsWith("/admin") ? redirectTo : data.redirect || "/admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-navy-800 to-slate-900 flex items-center justify-center p-4">
      <SetupRedirect />
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 text-slate-300 hover:text-white mb-6 text-sm">
          <ArrowRight className="h-4 w-4" />
          العودة للصفحة الرئيسية
        </Link>

        <Card className="shadow-2xl">
          <CardHeader className="items-center text-center pb-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-2">
              <ShieldCheck className="h-7 w-7 text-emerald-600" />
            </div>
            <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
            <CardDescription>
              {tab === "otp"
                ? "للمساهمين والمفوضين — برقم الهوية ورمز التحقق"
                : "لأماني السر ومديري المنصة — باسم المستخدم وكلمة المرور"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-lg p-1 mb-5">
              <button
                onClick={() => { setTab("otp"); setError(""); setInfo(""); }}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-bold transition cursor-pointer ${tab === "otp" ? "bg-white shadow text-emerald-700" : "text-slate-500"}`}
              >
                <Smartphone className="h-4 w-4" />
                رمز التحقق (OTP)
              </button>
              <button
                onClick={() => { setTab("staff"); setError(""); setInfo(""); setStep("id"); }}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-bold transition cursor-pointer ${tab === "staff" ? "bg-white shadow text-emerald-700" : "text-slate-500"}`}
              >
                <UserCog className="h-4 w-4" />
                فريق العمل
              </button>
            </div>

            {tab === "staff" ? (
              <div className="space-y-4">
                <Input
                  dir="ltr"
                  placeholder="اسم المستخدم أو رقم الهوية"
                  value={staffUser}
                  onChange={(e) => setStaffUser(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && staffLogin()}
                />
                <Input
                  dir="ltr"
                  type="password"
                  placeholder="كلمة المرور"
                  value={staffPass}
                  onChange={(e) => setStaffPass(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && staffLogin()}
                />
                {error && <p className="text-red-600 text-sm text-center">{error}</p>}
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={staffLogin} disabled={loading}>
                  {loading ? "جارٍ الدخول..." : "دخول"}
                </Button>
              </div>
            ) : step === "id" ? (
              <div className="space-y-4">
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  placeholder="رقم الهوية / السجل التجاري"
                  className="text-center text-lg tracking-widest"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onKeyDown={(e) => e.key === "Enter" && requestCode()}
                />
                {error && <p className="text-red-600 text-sm text-center">{error}</p>}
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={requestCode} disabled={loading}>
                  <KeyRound className="h-4 w-4" />
                  {loading ? "جارٍ الإرسال..." : "إرسال رمز التحقق"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-900 text-center">
                  {sentVia === "DEMO" ? (
                    <>
                      <strong>وضع التجربة (لم تُهيأ بوابة رسائل):</strong>
                      <div className="text-2xl font-extrabold tracking-[0.5em] mt-1" dir="ltr">
                        استخدم 1234
                      </div>
                    </>
                  ) : (
                    <>تم إرسال رمز التحقق إلى {roleName} عبر: <strong>{sentVia}</strong></>
                  )}
                </div>
                <Input
                  ref={otpRef}
                  dir="ltr"
                  inputMode="numeric"
                  placeholder="────"
                  className="text-center text-2xl tracking-[0.6em] font-bold"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onKeyDown={(e) => e.key === "Enter" && verify()}
                />
                {error && <p className="text-red-600 text-sm text-center">{error}</p>}
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={verify} disabled={loading || code.length < 4}>
                  {loading ? "جارٍ التحقق..." : "تحقق ودخول"}
                </Button>
                <button
                  onClick={() => { setStep("id"); setCode(""); setError(""); setSentVia(null); }}
                  className="text-sm text-slate-500 hover:text-navy-800 w-full text-center cursor-pointer"
                >
                  تغيير رقم الهوية
                </button>
              </div>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-slate-500 mt-4">
          الدخول مشفر ومسجل في سجل التدقيق — أي محاولة دخول تُوثَّق بالوقت والتاريخ
        </p>
      </div>
    </main>
  );
}
