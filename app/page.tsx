import Link from "next/link";
import { redirect } from "next/navigation";
import { setupCompleted } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Vote, FileText, Users, Rocket } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const needsSetup = !(await setupCompleted());

  // First install: force the setup wizard before anything else
  if (needsSetup) {
    redirect("/setup");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-navy-800 via-navy-800 to-slate-900 text-white">
      <header className="max-w-6xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">منصة الجمعيات العمومية</h1>
            <p className="text-xs text-slate-400">نظام حوكمة المساهمات والتصويت الإلكتروني</p>
          </div>
        </div>
        <Link
          href="/login"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
        >
          تسجيل الدخول
        </Link>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-14 text-center">
        {needsSetup && (
          <Link
            href="/setup"
            className="block max-w-2xl mx-auto mb-8 bg-emerald-600 hover:bg-emerald-700 transition rounded-xl p-5 text-right"
          >
            <div className="flex items-center gap-3">
              <Rocket className="h-8 w-8 shrink-0" />
              <div>
                <div className="font-extrabold text-lg">الإعداد الأولي — أنشئ حساب مدير المنصة</div>
                <div className="text-sm text-emerald-100 mt-0.5">
                  هذه خطوة أول تثبيت إلزامية لتفعيل النظام. تُقفل الصفحة نهائياً بعد إنشاء الحساب.
                </div>
              </div>
            </div>
          </Link>
        )}
        <Badge className="bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 mb-5">
          منصة سعودية متوافقة مع متطلبات الحوكمة
        </Badge>
        <h2 className="text-4xl md:text-5xl font-extrabold leading-snug mb-5">
          إدارة الجمعيات العامة وتصويت المساهمين
          <span className="block text-emerald-400 mt-2">بشفافية وأمان واحتساب مرجّح بالأسهم</span>
        </h2>
        <p className="text-slate-300 max-w-2xl mx-auto leading-8">
          منصة متكاملة لإدارة الاجتماعات العامة: سجل المساهمين، اعتماد التوكيلات، احتساب النصاب القانوني
          لحظياً، التصويت على بنود جدول الأعمال، وتصدير المحاضر الرسمية ونتائج التصويت.
        </p>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto mt-6 bg-white/5 border border-white/10 rounded-xl p-4 leading-7">
          بوابات الشركات خاصة ومحمية — الدخول متاح للمساهمين والمفوضين ورجال العمل المصرح لهم فقط عبر تسجيل
          الدخول. لا تُعرض أي بيانات للشركات على هذه الصفحة حفاظاً على سريتها.
        </p>

        <div className="grid md:grid-cols-4 gap-4 mt-12 text-right">
          {[
            { icon: Users, t: "سجل المساهمين", d: "استيراد Excel أو إدخال يدوي مع احتساب أوزان التصويت تلقائياً" },
            { icon: FileText, t: "اعتماد التوكيلات", d: "رفع مستندات الوكالة واعتمادها من أمين السر مع قفل التصويت المزدوج" },
            { icon: Vote, t: "تصويت مرجّح بالأسهم", d: "تصويت اعتيادي وتراكمي (انتخاب مجلس الإدارة) بأوزان دقيقة" },
            { icon: ShieldCheck, t: "نصاب لحظي وسجل تدقيق", d: "مؤشر النصاب القانوني الحي وسجل تدقيق كامل لكل عملية" },
          ].map((f) => (
            <div key={f.t} className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur">
              <f.icon className="h-7 w-7 text-emerald-400 mb-3" />
              <h3 className="font-bold mb-1.5">{f.t}</h3>
              <p className="text-sm text-slate-400 leading-6">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-6 text-center text-sm text-slate-500">
        منصة إدارة الجمعيات العمومية وتصويت المساهمين — جميع العمليات مسجلة في سجل تدقيق غير قابل للتعديل
      </footer>
    </main>
  );
}
