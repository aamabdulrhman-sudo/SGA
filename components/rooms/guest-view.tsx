import Link from "next/link";
import { Building2, LogIn } from "lucide-react";
import { formatWeight } from "@/lib/utils";

export default function GuestView({
  companySlug,
  companyName,
  assemblyTitle,
  totalShares,
}: {
  companySlug: string;
  companyName: string;
  assemblyTitle: string;
  totalShares: number;
}) {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ backgroundColor: "#0F172A" }}>
          <Building2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold mb-1">{companyName}</h1>
        <p className="text-slate-500 mb-6">{assemblyTitle}</p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-sm text-slate-600 leading-7">
          إجمالي أسهم الشركة: <strong dir="ltr">{formatWeight(totalShares)}</strong> سهم
          <br />
          سجّل الدخول برقم هويتك الوطنية / السجل التجاري للمشاركة والحضور والتصويت، أو برقم هوية المفوض إن كنت ممثلاً بالوكالة.
        </div>

        <Link
          href={`/login?redirect=/c/${companySlug}`}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl transition"
        >
          <LogIn className="h-5 w-5" />
          تسجيل الدخول برمز التحقق (OTP)
        </Link>
      </div>
    </main>
  );
}
