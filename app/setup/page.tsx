import { prisma } from "@/lib/prisma";
import SetupForm from "@/components/setup-form";
import { ShieldCheck, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const managerExists = (await prisma.user.count({ where: { role: "PLATFORM_MANAGER" } })) > 0;

  if (managerExists) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-100">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md text-center">
          <Lock className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h1 className="font-bold text-lg mb-1">الإعداد مكتمل</h1>
          <p className="text-sm text-slate-500 mb-5 leading-6">
            تم إنشاء حساب مدير المنصة مسبقاً — صفحة الإعداد الأولي محجوبة نهائياً لأسباب أمنية.
            استخدم صفحة تسجيل الدخول للوصول إلى النظام.
          </p>
          <a href="/login" className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-lg text-sm">
            الانتقال لتسجيل الدخول
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-navy-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 text-white">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold">إعداد المنصة — أول تثبيت</h1>
          <p className="text-sm text-slate-300 mt-2 leading-6">
            أنشئ حساب <strong>مدير المنصة</strong> بصلاحيات كاملة.
            <br />
            هذه الصفحة تظهر مرة واحدة فقط وستُقفل نهائياً بعد إنشاء الحساب.
          </p>
        </div>
        <SetupForm />
      </div>
    </main>
  );
}
