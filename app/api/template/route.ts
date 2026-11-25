import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function GET() {
  const rows = [
    { "الاسم الكامل": "عبدالرحمن عبدالله", "رقم الهوية": "1010101010", "الجوال": "0551111111", "البريد الإلكتروني": "name@email.com", "عدد الأسهم": 450000 },
    { "الاسم الكامل": "سارة محمد", "رقم الهوية": "1020202020", "الجوال": "0552222222", "البريد الإلكتروني": "name@email.com", "عدد الأسهم": 300000 },
    { "الاسم الكامل": "شركة الاستثمار المتقدم", "رقم الهوية": "7001234567", "الجوال": "0112345678", "البريد الإلكتروني": "corp@company.sa", "عدد الأسهم": 250000 },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "سجل المساهمين");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="cap-table-template.xlsx"',
    },
  });
}
