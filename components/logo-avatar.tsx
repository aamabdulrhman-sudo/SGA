import { Building2 } from "lucide-react";

export default function LogoAvatar({
  logoUrl,
  name,
  themeColor,
  size = 40,
  className = "",
}: {
  logoUrl?: string | null;
  name: string;
  themeColor?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, backgroundColor: themeColor || "#0F172A" };
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`شعار ${name}`}
        style={style}
        className={`rounded-xl object-contain bg-white border border-slate-200 shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      style={style}
      className={`rounded-xl flex items-center justify-center shrink-0 ${className}`}
    >
      <Building2 className="text-white" style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}
