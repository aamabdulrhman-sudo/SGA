import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("ar-SA", { useGrouping: true }).format(n);
}

export function formatWeight(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatDateAr(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "long",
    timeStyle: "short",
    calendar: "gregory",
    numberingSystem: "latn",
  }).format(date);
}

export const ASSEMBLY_TYPE_LABEL: Record<string, string> = {
  ORDINARY: "جمعية عادية",
  EXTRAORDINARY: "جمعية غير عادية",
};

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "مسودة",
  ACTIVE: "نشط",
  CLOSED: "منعقد/مغلق",
  OPEN: "مفتوح للتصويت",
  PENDING: "قيد المراجعة",
  APPROVED: "معتمد",
  REJECTED: "مرفوض",
  REVOKED: "ملغي",
};

export const CHOICE_LABEL: Record<string, string> = {
  APPROVE: "موافق",
  REJECT: "غير موافق",
  ABSTAIN: "متحفظ",
};

export const ROLE_LABEL: Record<string, string> = {
  PLATFORM_MANAGER: "مدير المنصة",
  SECRETARY: "أمين السر",
  SHAREHOLDER: "مساهم",
  PROXY: "مفوض",
  ADMIN: "مدير النظام",
};
