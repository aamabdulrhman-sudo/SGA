import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSession, isStaff } from "@/lib/auth";

export const runtime = "nodejs";

const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(req: NextRequest) {
  // الرفع متاح لفريق العمل وللمساهمين/المفوضين المسجلين فقط
  const session = await getSession();
  if (!session || (!isStaff(session.role) && session.role !== "SHAREHOLDER" && session.role !== "PROXY")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const kind = String(formData.get("kind") || "proxy");
  if (!file) return NextResponse.json({ error: "لا يوجد ملف" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "الحد الأقصى لحجم الملف 10MB" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "المسموح: PDF, JPG, PNG, WEBP" }, { status: 400 });
  }

  const prefix = kind === "logo" ? "logo" : "proxy";
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ ok: true, url: `/uploads/${filename}` });
}
