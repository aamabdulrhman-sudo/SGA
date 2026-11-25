import { getSession, canManageUsers } from "@/lib/auth";
import Link from "next/link";
import StaffUsersManager from "@/components/staff-users-manager";
import { ShieldCheck, Users, Settings, Building2 } from "lucide-react";
import { ROLE_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getSession();
  if (!session || !canManageUsers(session.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md text-center">
          <ShieldCheck className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h1 className="font-bold text-lg mb-1">إدارة حسابات المستخدمين</h1>
          <p className="text-sm text-slate-500 mb-5">هذه الصفحة متاحة لمدير المنصة وأمين السر الرئيسي فقط.</p>
          <Link href="/login" className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-lg text-sm">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  const isManager = session.role === "PLATFORM_MANAGER";

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <header className="bg-navy-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg">إدارة حسابات المستخدمين وأدوارهم</h1>
              <p className="text-xs text-slate-400">
                إضافة وإزالة وتعطيل حسابات فريق العمل — {session.name}
                <span className="mr-2 text-emerald-400 font-bold">({ROLE_LABEL[session.role] || session.role})</span>
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/admin" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg font-semibold">
              <Building2 className="h-4 w-4" /> الشركات والجمعيات
            </Link>
            {isManager && (
              <Link href="/admin/settings" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg font-semibold">
                <Settings className="h-4 w-4" /> إعدادات الرسائل
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 mt-5">
        <StaffUsersManager isManager={isManager} currentUserId={session.userId || ""} />
      </div>
    </main>
  );
}
