import { getSession } from "@/lib/auth";
import Link from "next/link";
import NotificationSettings from "@/components/notification-settings";
import { ShieldCheck, Settings, Users, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session || session.role !== "PLATFORM_MANAGER") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md text-center">
          <ShieldCheck className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h1 className="font-bold text-lg mb-1">إعدادات بوابات الرسائل</h1>
          <p className="text-sm text-slate-500 mb-5">هذه الصفحة متاحة لمدير المنصة فقط بعد تسجيل الدخول.</p>
          <Link href="/login" className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-lg text-sm">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <header className="bg-navy-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg">إعدادات بوابات الرسائل (SMS / البريد / واتساب)</h1>
              <p className="text-xs text-slate-400">
                إعداد قنوات إرسال رموز التحقق والإشعارات — مدير المنصة: {session.name}
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/admin" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg font-semibold">
              <Building2 className="h-4 w-4" /> الشركات والجمعيات
            </Link>
            <Link href="/admin/users" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg font-semibold">
              <Users className="h-4 w-4" /> حسابات المستخدمين
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 mt-5">
        <NotificationSettings />
      </div>
    </main>
  );
}
