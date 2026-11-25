import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff } from "@/lib/auth";
import { ShieldAlert } from "lucide-react";
import SecretaryRoom from "@/components/rooms/secretary-room";
import ShareholderRoom from "@/components/rooms/shareholder-room";
import ProxyRoom from "@/components/rooms/proxy-room";

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
      assemblies: { orderBy: { scheduledAt: "desc" }, include: { shareholders: true } },
    },
  });
  if (!company) notFound();

  // المساهم والمفوض مقيّدان بجلسة شركتهم — لا يمكنهم دخول بوابات شركات أخرى
  const scoped = session.role === "SHAREHOLDER" || session.role === "PROXY";
  if (scoped && session.companyId !== company.id) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md text-center">
          <ShieldAlert className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h1 className="font-bold text-lg mb-1">وصول مرفوض</h1>
          <p className="text-sm text-slate-500 mb-5">جلسة الدخول الخاصة بك مقيدة بشركة أخرى — لا يمكنك الدخول إلى بوابة هذه الشركة.</p>
          <Link href="/" className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-lg text-sm">
            العودة للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  const activeAssembly = company.assemblies.find((a) => a.status === "ACTIVE") || company.assemblies[0];

  if (!activeAssembly) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{company.name}</h1>
          <p className="text-slate-500">لا توجد جمعيات مسجلة حالياً لهذه الشركة.</p>
        </div>
      </div>
    );
  }

  const logoProps = { logoUrl: company.logoUrl, themeColor: company.themeColor };

  if (isStaff(session.role)) {
    return <SecretaryRoom assemblyId={activeAssembly.id} companyName={company.name} {...logoProps} />;
  }
  if (session.role === "SHAREHOLDER" && session.shareholderId) {
    return <ShareholderRoom assemblyId={activeAssembly.id} companyName={company.name} {...logoProps} />;
  }
  if (session.role === "PROXY") {
    return <ProxyRoom assemblyId={activeAssembly.id} companyName={company.name} {...logoProps} />;
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md text-center">
        <ShieldAlert className="h-12 w-12 mx-auto text-slate-300 mb-3" />
        <h1 className="font-bold text-lg mb-1">وصول مرفوض</h1>
        <p className="text-sm text-slate-500 mb-5">دور حسابك لا يسمح بالدخول إلى بوابة الشركة.</p>
        <Link href="/" className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-lg text-sm">
          العودة للرئيسية
        </Link>
      </div>
    </main>
  );
}
