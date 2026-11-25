"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { KeyRound, CheckCircle2 } from "lucide-react";

export default function SetupForm() {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          username: f.get("username"),
          nationalId: f.get("nationalId"),
          password: f.get("password"),
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "حدث خطأ");
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card className="shadow-2xl">
        <CardContent className="py-10 text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto mb-3" />
          <h2 className="font-extrabold text-lg mb-1">تم إنشاء حساب مدير المنصة بنجاح</h2>
          <p className="text-sm text-slate-500">جارٍ تحويلك لصفحة تسجيل الدخول...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-2xl">
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>الاسم الكامل *</Label>
            <Input name="name" required placeholder="مثال: م. فهد المطيري" />
          </div>
          <div>
            <Label>اسم المستخدم *</Label>
            <Input name="username" required dir="ltr" placeholder="manager" autoComplete="username" />
          </div>
          <div>
            <Label>رقم الهوية الوطنية *</Label>
            <Input name="nationalId" required dir="ltr" inputMode="numeric" maxLength={10} placeholder="10 أرقام" />
          </div>
          <div>
            <Label>كلمة المرور (8 أحرف على الأقل) *</Label>
            <Input name="password" required dir="ltr" type="password" minLength={8} autoComplete="new-password" />
          </div>
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
            <KeyRound className="h-4 w-4" />
            {loading ? "جارٍ الإنشاء..." : "إنشاء حساب مدير المنصة وقفل الإعداد"}
          </Button>
          <p className="text-[11px] text-slate-400 text-center leading-5">
            مدير المنصة يملك جميع الصلاحيات: إدارة حسابات فريق العمل، الشركات والجمعيات،
            وإعدادات بوابات الرسائل (SMS / البريد / واتساب).
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
