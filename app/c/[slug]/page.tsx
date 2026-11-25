import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import SecretaryRoom from "@/components/rooms/secretary-room";
import ShareholderRoom from "@/components/rooms/shareholder-room";
import ProxyRoom from "@/components/rooms/proxy-room";
import GuestView from "@/components/rooms/guest-view";

export const dynamic = "force-dynamic";

export default async function CompanyPortal({
  params,
}: {
  params: { slug: string };
}) {
  const company = await prisma.company.findUnique({
    where: { slug: params.slug },
    include: {
      assemblies: { orderBy: { scheduledAt: "desc" }, include: { shareholders: true } },
    },
  });
  if (!company) notFound();

  const session = await getSession();
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

  const totalShares = activeAssembly.shareholders.reduce((a, s) => a + s.sharesCount, 0);

  if (session?.role === "SECRETARY") {
    return <SecretaryRoom assemblyId={activeAssembly.id} companyName={company.name} />;
  }
  if (session?.role === "SHAREHOLDER" && session.shareholderId) {
    return <ShareholderRoom assemblyId={activeAssembly.id} companyName={company.name} />;
  }
  if (session?.role === "PROXY") {
    return <ProxyRoom assemblyId={activeAssembly.id} companyName={company.name} />;
  }
  return (
    <GuestView
      companySlug={company.slug}
      companyName={company.name}
      assemblyTitle={activeAssembly.title}
      totalShares={totalShares}
    />
  );
}
