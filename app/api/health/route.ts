import { NextResponse } from "next/server";
import { setupCompleted } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    demoMode: process.env.DEMO_MODE === "true",
    setupCompleted: await setupCompleted(),
  });
}
