import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff } from "@/lib/auth";
import { ShieldAlert } from "lucide-react";
import SecretaryRoom from "@/components/rooms/secretary-room";

export const dynamic = "force-dynamic";

/** غرفة تحكم جمعية محددة — لأعضاء فريق العمل فقط */
export default async function AssemblyRoomPage({
  params,
}: {
  params: { slug: string; assemblyId: string };
}) {
  const session = await getSession();
  if (!session) notFound();

  const company = await prisma.company.findUnique({
    where: { slug: params.slug },
    include: { assemblies: true },
  });
  if (!company) notFound();

  const assembly = company.assemblies.find((a) => a.id === params.assemblyId);
  if (!assembly) notFound();

  // المساهم والمفوض لا يدخلان غرف التحكم — مقيّدان بجلسة شركتهم
  if (!isStaff(session.role)) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md text-center">
          <ShieldAlert className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h1 className="font-bold text-lg mb-1">وصول مرفوض</h1>
          <p className="text-sm text-slate-500 mb-5">غرف التحكم متاحة لأعضاء فريق العمل فقط — بوابتك عبر الصفحة الرئيسية للشركة.</p>
          <Link href="/" className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-lg text-sm">
            العودة للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  return (
    <SecretaryRoom
      assemblyId={assembly.id}
      companyName={company.name}
      companySlug={company.slug}
      logoUrl={company.logoUrl}
      themeColor={company.themeColor}
    />
  );
}
