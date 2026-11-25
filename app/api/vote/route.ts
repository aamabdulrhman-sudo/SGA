import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff, logAudit } from "@/lib/auth";

interface StandardPayload {
  agendaItemId: string;
  choice: "APPROVE" | "REJECT" | "ABSTAIN";
  principalIds?: string[]; // proxy voting: which principals to vote for
}

interface CumulativePayload {
  agendaItemId: string;
  allocations: { candidate: string; shares: number }[];
  principalIds?: string[];
}

function getIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || isStaff(session.role)) {
    return NextResponse.json({ error: "غير مصرح بالتصويت" }, { status: 403 });
  }

  const body = await req.json();
  const item = await prisma.agendaItem.findUnique({
    where: { id: body.agendaItemId },
    include: { assembly: true },
  });

  if (!item) return NextResponse.json({ error: "البند غير موجود" }, { status: 404 });
  if (item.assembly.status !== "ACTIVE") {
    return NextResponse.json({ error: "الجمعية غير نشطة حالياً" }, { status: 400 });
  }
  if (item.status !== "OPEN") {
    return NextResponse.json({ error: "التصويت مغلق على هذا البند" }, { status: 400 });
  }

  const ip = getIp(req);
  const principalIds: string[] =
    session.role === "PROXY" ? body.principalIds || [] : [session.shareholderId!];

  const results: { principalId: string; ok: boolean; error?: string }[] = [];

  for (const principalId of principalIds) {
    try {
      let proxyRecord: { id: string } | null = null;

      if (session.role === "PROXY") {
        const rec = await prisma.proxy.findFirst({
          where: {
            id: { in: session.proxyIds },
            shareholderId: principalId,
            status: "APPROVED",
            assemblyId: item.assemblyId,
          },
        });
        if (!rec) {
          results.push({ principalId, ok: false, error: "لا توجد وكالة معتمدة" });
          continue;
        }
        proxyRecord = rec;
        await prisma.proxy.update({
          where: { id: rec.id },
          data: { proxyAttended: true, proxyAttendedAt: new Date() },
        });
      } else {
        // Direct shareholder voting is locked if an approved proxy exists
        const approved = await prisma.proxy.findFirst({
          where: {
            shareholderId: principalId,
            status: "APPROVED",
            assemblyId: item.assemblyId,
          },
        });
        if (approved) {
          results.push({
            principalId,
            ok: false,
            error: `تم تفويض ${approved.proxyName} للتصويت نيابة عنك`,
          });
          continue;
        }
      }

      const principal = await prisma.shareholder.findUnique({
        where: { id: principalId },
      });
      if (!principal) {
        results.push({ principalId, ok: false, error: "المساهم غير موجود" });
        continue;
      }

      // Direct shareholder attendance: marked present when voting in person.
      // Proxy votes mark proxy attendance only (shareholder counted بالوكالة, not أصالة).
      if (!proxyRecord) {
        await prisma.shareholder.update({
          where: { id: principalId },
          data: { isPresent: true, attendedAt: principal.attendedAt ?? new Date() },
        });
      }

      if (item.votingType === "STANDARD") {
        const choice = body.choice;
        if (!["APPROVE", "REJECT", "ABSTAIN"].includes(choice)) {
          results.push({ principalId, ok: false, error: "اختيار غير صالح" });
          continue;
        }
        const existing = await prisma.vote.findFirst({
          where: { agendaItemId: item.id, shareholderId: principalId },
        });
        if (existing) {
          results.push({ principalId, ok: false, error: "تم التصويت مسبقاً على هذا البند" });
          continue;
        }
        await prisma.vote.create({
          data: {
            agendaItemId: item.id,
            shareholderId: principalId,
            castByRole: session.role,
            proxyId: proxyRecord?.id,
            choice,
            sharesWeight: principal.sharesCount,
            ipAddress: ip,
          },
        });
        await logAudit(
          item.assemblyId,
          session.role === "PROXY" ? `${session.name} (مفوض)` : principal.name,
          session.role,
          "تصويت",
          `البند: ${item.title} | الاختيار: ${choice} | الأسهم المرجحة: ${principal.sharesCount}`,
          ip
        );
        results.push({ principalId, ok: true });
      } else {
        // CUMULATIVE
        const seats = item.seatsCount || 1;
        const maxPoints = principal.sharesCount * seats;
        const allocations: { candidate: string; shares: number }[] = body.allocations || [];
        const totalAllocated = allocations.reduce((a, x) => a + (x.shares || 0), 0);
        if (totalAllocated > maxPoints) {
          results.push({
            principalId,
            ok: false,
            error: `مجموع التوزيع (${totalAllocated}) يتجاوز رصيدك (${maxPoints} نقطة = ${principal.sharesCount} سهم × ${seats} مقاعد)`,
          });
          continue;
        }
        if (totalAllocated !== maxPoints) {
          results.push({
            principalId,
            ok: false,
            error: `يجب توزيع كامل الرصيد (${maxPoints} نقطة)، الموزع حالياً: ${totalAllocated}`,
          });
          continue;
        }
        await prisma.vote.deleteMany({
          where: { agendaItemId: item.id, shareholderId: principalId },
        });
        await prisma.vote.createMany({
          data: allocations
            .filter((a) => a.shares > 0)
            .map((a) => ({
              agendaItemId: item.id,
              shareholderId: principalId,
              castByRole: session.role,
              proxyId: proxyRecord?.id,
              choice: a.candidate,
              sharesWeight: a.shares,
              ipAddress: ip,
            })),
        });
        await logAudit(
          item.assemblyId,
          session.role === "PROXY" ? `${session.name} (مفوض)` : principal.name,
          session.role,
          "تصويت تراكمي",
          `البند: ${item.title} | توزيع ${totalAllocated} نقطة على ${allocations.filter((a) => a.shares > 0).length} مرشح`,
          ip
        );
        results.push({ principalId, ok: true });
      }
    } catch (e) {
      results.push({ principalId, ok: false, error: "خطأ غير متوقع" });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json(
    { ok: allOk, results },
    { status: allOk ? 200 : 207 }
  );
}
