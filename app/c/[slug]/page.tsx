import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff } from "@/lib/auth";
import { ShieldAlert, ArrowRight, Building2, Users, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import LogoAvatar from "@/components/logo-avatar";
import CompanyRegisterManager from "@/components/company-register-manager";
import AdminAssemblyForm from "@/components/admin-assembly-form";
import SecretaryRoom from "@/components/rooms/secretary-room";
import ShareholderRoom from "@/components/rooms/shareholder-room";
import ProxyRoom from "@/components/rooms/proxy-room";
import { STATUS_LABEL, ASSEMBLY_TYPE_LABEL, formatDateAr, formatWeight } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CompanyPortal({
  params,
}: {
  params: { slug: string };
}) {
  const session = await getSession();

  // بوابات الشركات محمية — الزائر غير المسجل يُحوَّل لصفحة الدخول مباشرة
  if (!session) {
    redirect(`/login?redirect=/c/${params.slug}`);
  }

  const company = await prisma.company.findUnique({
    where: { slug: params.slug },
    include: {
      assemblies: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { shareholders: true, agendaItems: true } } },
      },
      registerShareholders: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!company) notFound();

  // المساهم والمفوض مقيّدان بجلسة شركتهم — لا يمكنهم دخول بوابات شركات أخرى
  const scoped = session.role === "SHAREHOLDER" || session.role === "PROXY";
  if (scoped && session.companyId !== company.id) {
    return <AccessDenied text="جلسة الدخول الخاصة بك مقيدة بشركة أخرى — لا يمكنك الدخول إلى بوابة هذه الشركة." />;
  }

  // المساهم/المفوض: غرفته مباشرة حسب جمعيته المسجلة في الجلسة
  if (session.role === "SHAREHOLDER" && session.shareholderId) {
    const assembly = company.assemblies.find((a) => a.id === session.assemblyId) || company.assemblies.find((a) => a.status === "ACTIVE");
    if (!assembly) return <AccessDenied text="لا توجد جمعية مرتبطة بحسابك حالياً." />;
    return (
      <ShareholderRoom
        assemblyId={assembly.id}
        companyName={company.name}
        logoUrl={company.logoUrl}
        themeColor={company.themeColor}
      />
    );
  }
  if (session.role === "PROXY") {
    const assembly = company.assemblies.find((a) => a.id === session.assemblyId) || company.assemblies.find((a) => a.status === "ACTIVE");
    if (!assembly) return <AccessDenied text="لا توجد جمعية مرتبطة بحسابك حالياً." />;
    return (
      <ProxyRoom
        assemblyId={assembly.id}
        companyName={company.name}
        logoUrl={company.logoUrl}
        themeColor={company.themeColor}
      />
    );
  }

  // فريق العمل: لوحة إدارة الشركة (السجل + الجمعيات)
  if (isStaff(session.role)) {
    const registerTotal = company.registerShareholders.reduce((a, s) => a + s.sharesCount, 0);
    return (
      <main className="min-h-screen bg-slate-100 pb-20">
        <header className="bg-navy-800 text-white">
          <div className="max-w-6xl mx-auto px-4 py-5">
            <Link href="/admin" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 w-fit">
              <ArrowRight className="h-3.5 w-3.5" /> العودة للوحة الإدارة
            </Link>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <LogoAvatar logoUrl={company.logoUrl} name={company.name} themeColor={company.themeColor} size={52} />
                <div>
                  <h1 className="font-extrabold text-xl">{company.name}</h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    س.ت: {company.crNumber} • المعرف: <span dir="ltr">{company.slug}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Users className="h-4 w-4 text-emerald-400" />
                  سجل الشركة: {company.registerShareholders.length} مساهم ({formatWeight(registerTotal)} سهم)
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CalendarDays className="h-4 w-4 text-emerald-400" />
                  {company.assemblies.length} جمعية
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 mt-5 space-y-5">
          <CompanyRegisterManager
            companyId={company.id}
            companySlug={company.slug}
            initialShareholders={company.registerShareholders.map((s) => ({
              id: s.id,
              name: s.name,
              nationalId: s.nationalId,
              mobile: s.mobile,
              email: s.email,
              sharesCount: s.sharesCount,
            }))}
          />

          <AdminAssemblyForm companies={[{ id: company.id, name: company.name, slug: company.slug }]} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-5 w-5 text-emerald-600" />
                جمعيات الشركة
              </CardTitle>
              <CardDescription>كل جمعية تحتفظ بنسخة مستقلة من سجل المساهمين لحظة إنشائها — فتح غرفة التحكم لكل جمعية على حدة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {company.assemblies.length === 0 && (
                <p className="text-sm text-slate-500">لا توجد جمعيات — أنشئ جمعية من النموذج أعلاه وسيتم سحب سجل المساهمين إليها تلقائياً.</p>
              )}
              {company.assemblies.map((a) => (
                <div key={a.id} className="border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm">{a.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {ASSEMBLY_TYPE_LABEL[a.type]} • {formatDateAr(a.scheduledAt)} • {a._count.shareholders} مساهم • {a._count.agendaItems} بنود
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Badge variant={a.status === "ACTIVE" ? "success" : "muted"}>{STATUS_LABEL[a.status]}</Badge>
                    <Link
                      href={`/c/${company.slug}/a/${a.id}`}
                      className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      غرفة التحكم <ArrowRight className="h-3 w-3 rotate-180" />
                    </Link>
                    <a href={`/print/shareholders/${a.id}`} target="_blank" className="text-xs font-semibold text-slate-500 hover:text-navy-800 hover:underline">
                      كشف المساهمين PDF
                    </a>
                    <a href={`/print/minutes/${a.id}`} target="_blank" className="text-xs font-semibold text-slate-500 hover:text-navy-800 hover:underline">
                      المحضر PDF
                    </a>
                    <a href={`/print/audit/${a.id}`} target="_blank" className="text-xs font-semibold text-slate-500 hover:text-navy-800 hover:underline">
                      سجل التدقيق PDF
                    </a>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return <AccessDenied text="دور حسابك لا يسمح بالدخول إلى بوابة الشركة." />;
}

function AccessDenied({ text }: { text: string }) {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md text-center">
        <ShieldAlert className="h-12 w-12 mx-auto text-slate-300 mb-3" />
        <h1 className="font-bold text-lg mb-1">وصول مرفوض</h1>
        <p className="text-sm text-slate-500 mb-5">{text}</p>
        <Link href="/" className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-lg text-sm">
          العودة للرئيسية
        </Link>
      </div>
    </main>
  );
}
