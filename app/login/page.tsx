"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, KeyRound, ArrowRight } from "lucide-react";

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

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect");

  const [step, setStep] = useState<"id" | "otp">("id");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "otp") otpRef.current?.focus();
  }, [step]);

  async function requestCode() {
    setError("");
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
      setDemoCode(data.demoCode || null);
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-navy-800 to-slate-900 flex items-center justify-center p-4">
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
            <CardTitle className="text-xl">
              {step === "id" ? "تسجيل الدخول" : "رمز التحقق"}
            </CardTitle>
            <CardDescription>
              {step === "id"
                ? "أدخل رقم الهوية الوطنية أو السجل التجاري المسجل لديك"
                : `مرحباً ${roleName} — أدخل رمز التحقق المرسل إليك`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "id" ? (
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
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 leading-5">
                  <strong>حسابات تجريبية:</strong>
                  <br />• أمين السر: <span dir="ltr">9000000001</span>
                  <br />• مساهم (عبدالرحمن 45%): <span dir="ltr">1010101010</span>
                  <br />• مساهم (سارة 30%): <span dir="ltr">1020202020</span>
                  <br />• مفوض معتمد (خالد): <span dir="ltr">1050505050</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {demoCode && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 text-center">
                    <strong>وضع التجربة (محاكاة SMS):</strong>
                    <div className="text-2xl font-extrabold tracking-[0.5em] mt-1" dir="ltr">
                      {demoCode}
                    </div>
                    أو استخدم الرمز الشامل <strong dir="ltr">1234</strong>
                  </div>
                )}
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
                  onClick={() => { setStep("id"); setCode(""); setError(""); }}
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
