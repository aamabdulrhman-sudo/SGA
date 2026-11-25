"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FlaskConical, UserCog, User, UserRound, UserCheck, LogOut } from "lucide-react";

const ROLES = [
  { key: "SECRETARY", label: "أمين السر", icon: UserCog, color: "bg-navy-800" },
  { key: "SHAREHOLDER_1", label: "مساهم 1 (عبدالرحمن - 45%)", icon: User, color: "bg-emerald-600" },
  { key: "SHAREHOLDER_2", label: "مساهم 2 (سارة - 30%)", icon: UserRound, color: "bg-blue-600" },
  { key: "PROXY", label: "مفوض معتمد (خالد)", icon: UserCheck, color: "bg-amber-600" },
];

export default function DemoSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setHidden(!d.demoMode))
      .catch(() => setHidden(true));
  }, []);

  if (hidden || pathname?.startsWith("/print")) return null;

  async function switchRole(key: string) {
    setLoading(key);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: key }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push(data.redirect);
        router.refresh();
      }
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="fixed bottom-4 left-4 z-[100] no-print">
      {open && (
        <div className="mb-3 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden w-72">
          <div className="bg-navy-800 text-white px-4 py-2.5 text-xs font-bold flex items-center gap-2">
            <FlaskConical className="h-3.5 w-3.5 text-emerald-400" />
            مبدّل الأدوار التجريبي — وضع الاختبار فقط
          </div>
          {ROLES.map((r) => (
            <button
              key={r.key}
              onClick={() => switchRole(r.key)}
              disabled={loading !== null}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 transition disabled:opacity-50 text-right cursor-pointer border-b border-slate-100 last:border-0"
            >
              <span className={`${r.color} text-white rounded-lg p-1.5`}>
                <r.icon className="h-4 w-4" />
              </span>
              <span className="font-semibold">
                {loading === r.key ? "جارٍ التبديل..." : r.label}
              </span>
            </button>
          ))}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition cursor-pointer border-t border-slate-200"
          >
            <LogOut className="h-4 w-4" />
            <span className="font-semibold">تسجيل الخروج</span>
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-navy-800 text-white rounded-full pl-5 pr-4 py-3 shadow-2xl text-sm font-bold hover:bg-navy-700 transition cursor-pointer"
      >
        <FlaskConical className="h-5 w-5 text-emerald-400" />
        تبديل الدور
      </button>
    </div>
  );
}
