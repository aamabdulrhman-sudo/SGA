import { prisma } from "@/lib/prisma";
import { getSession, isStaff } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { STATUS_LABEL, ASSEMBLY_TYPE_LABEL, formatDateAr, ROLE_LABEL } from "@/lib/utils";
import AdminCompanyForm from "@/components/admin-company-form";
import AdminAssemblyForm from "@/components/admin-assembly-form";
import AdminCompanyActions from "@/components/admin-company-actions";
import AdminAssemblyActions from "@/components/admin-assembly-actions";
import LogoAvatar from "@/components/logo-avatar";
import { Building2, ArrowLeft, ShieldCheck, Users, Settings, Home } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md text-center">
          <ShieldCheck className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h1 className="font-bold text-lg mb-1">لوحة الإدارة</h1>
          <p className="text-sm text-slate-500 mb-5">هذه الصفحة متاحة لأمين السر ومدير المنصة بعد تسجيل الدخول.</p>
          <Link href="/login" className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-lg text-sm">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  const companies = await prisma.company.findMany({
    include: { assemblies: { orderBy: { scheduledAt: "desc" }, include: { _count: { select: { shareholders: true, agendaItems: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const isManager = session.role === "PLATFORM_MANAGER";

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <header className="bg-navy-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg">لوحة الإدارة المركزية</h1>
              <p className="text-xs text-slate-400">
                إدارة الشركات والجمعيات العمومية — {session.name}
                <Badge className="mr-2 bg-emerald-600">{ROLE_LABEL[session.role] || session.role}</Badge>
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/admin/users" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg font-semibold">
              <Users className="h-4 w-4" /> حسابات المستخدمين
            </Link>
            {isManager && (
              <Link href="/admin/settings" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg font-semibold">
                <Settings className="h-4 w-4" /> إعدادات الرسائل
              </Link>
            )}
            <Link href="/" className="flex items-center gap-1.5 text-slate-300 hover:text-white px-2">
              <Home className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 mt-5 space-y-5">
        <AdminCompanyForm />
        <AdminAssemblyForm companies={companies.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))} />

        <div className="grid md:grid-cols-2 gap-5">
          {companies.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <LogoAvatar logoUrl={c.logoUrl} name={c.name} themeColor={c.themeColor} size={44} />
                    <div>
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <CardDescription>
                        س.ت: {c.crNumber} • المعرف: <span dir="ltr">{c.slug}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <AdminCompanyActions
                    company={{ id: c.id, name: c.name, slug: c.slug, crNumber: c.crNumber, themeColor: c.themeColor, logoUrl: c.logoUrl }}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {c.assemblies.length === 0 && <p className="text-sm text-slate-500">لا توجد جمعيات.</p>}
                {c.assemblies.map((a) => (
                  <div key={a.id} className="border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm">{a.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {ASSEMBLY_TYPE_LABEL[a.type]} • {formatDateAr(a.scheduledAt)} • {a._count.shareholders} مساهم •{" "}
                        {a._count.agendaItems} بنود
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={a.status === "ACTIVE" ? "success" : "muted"}>{STATUS_LABEL[a.status]}</Badge>
                        <AdminAssemblyActions assemblyId={a.id} assemblyTitle={a.title} status={a.status} />
                      </div>
                      <Link
                        href={`/c/${c.slug}/a/${a.id}`}
                        className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        غرفة التحكم <ArrowLeft className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
                <Link
                  href={`/c/${c.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
                >
                  بوابة الشركة (السجل والجمعيات) <ArrowLeft className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
