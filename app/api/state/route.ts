import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const assemblyId = req.nextUrl.searchParams.get("assemblyId");
  if (!assemblyId) {
    return NextResponse.json({ error: "assemblyId مطلوب" }, { status: 400 });
  }

  const session = await getSession();

  // لا تُعرض أي بيانات لغير المسجلين
  if (!session) {
    return NextResponse.json({ error: "غير مصرح — سجل الدخول أولاً" }, { status: 401 });
  }

  const assembly = await prisma.assembly.findUnique({
    where: { id: assemblyId },
    include: {
      company: true,
      agendaItems: {
        orderBy: { orderIndex: "asc" },
        include: { votes: { include: { shareholder: true, proxy: true } } },
      },
      shareholders: {
        include: { proxiesAsPrincipal: true, votes: { include: { proxy: true } } },
      },
      proxies: { include: { shareholder: { include: { votes: true } } } },
    },
  });

  if (!assembly) {
    return NextResponse.json({ error: "الجمعية غير موجودة" }, { status: 404 });
  }

  const totalShares = assembly.shareholders.reduce((a, s) => a + s.sharesCount, 0);

  const presentOriginal = assembly.shareholders
    .filter((s) => s.isPresent)
    .reduce((a, s) => a + s.sharesCount, 0);

  const attendedProxyShareholderIds = new Set(
    assembly.proxies
      .filter((p) => p.status === "APPROVED" && p.proxyAttended)
      .map((p) => p.shareholderId)
  );

  const proxyShares = assembly.shareholders
    .filter(
      (s) =>
        !s.isPresent &&
        (attendedProxyShareholderIds.has(s.id) ||
          s.proxiesAsPrincipal.some((p) => p.status === "APPROVED" && p.proxyAttended))
    )
    .reduce((a, s) => a + s.sharesCount, 0);

  const presentTotal = presentOriginal + proxyShares;
  const quorumPct = totalShares > 0 ? (presentTotal / totalShares) * 100 : 0;

  const agenda = assembly.agendaItems.map((item) => {
    const standardVotes = item.votes.filter(
      (v) => item.votingType === "STANDARD"
    );
    const tally = {
      approve: standardVotes.filter((v) => v.choice === "APPROVE").reduce((a, v) => a + v.sharesWeight, 0),
      reject: standardVotes.filter((v) => v.choice === "REJECT").reduce((a, v) => a + v.sharesWeight, 0),
      abstain: standardVotes.filter((v) => v.choice === "ABSTAIN").reduce((a, v) => a + v.sharesWeight, 0),
      voters: new Set(standardVotes.map((v) => v.shareholderId)).size,
    };

    const candidateMap = new Map<string, number>();
    if (item.votingType === "CUMULATIVE") {
      for (const v of item.votes) {
        candidateMap.set(v.choice, (candidateMap.get(v.choice) || 0) + v.sharesWeight);
      }
    }
    const candidates = [...candidateMap.entries()]
      .map(([name, shares]) => ({ name, shares }))
      .sort((a, b) => b.shares - a.shares);

    return {
      id: item.id,
      orderIndex: item.orderIndex,
      title: item.title,
      description: item.description,
      votingType: item.votingType,
      seatsCount: item.seatsCount,
      status: item.status,
      quorumPercentage: item.quorumPercentage,
      quorumPctAtOpen: item.quorumPctAtOpen,
      quorumMetAtOpen: item.quorumMetAtOpen,
      tally,
      candidates,
      totalCastShares: item.votes.reduce((a, v) => a + v.sharesWeight, 0),
    };
  });

  const base = {
    assembly: {
      id: assembly.id,
      title: assembly.title,
      type: assembly.type,
      status: assembly.status,
      scheduledAt: assembly.scheduledAt,
      streamUrl: assembly.streamUrl,
      quorumPercentage: assembly.quorumPercentage,
      company: {
        name: assembly.company.name,
        slug: assembly.company.slug,
        themeColor: assembly.company.themeColor,
        crNumber: assembly.company.crNumber,
      },
    },
    quorum: {
      totalShares,
      presentOriginal,
      proxyShares,
      presentTotal,
      percentage: quorumPct,
      met: quorumPct >= assembly.quorumPercentage,
    },
    agenda,
    serverTime: new Date().toISOString(),
  };

  if (session?.role === "SHAREHOLDER" && session.shareholderId) {
    // المساهم مقيّد بجلسة جمعيته فقط
    if (session.assemblyId !== assemblyId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const me = assembly.shareholders.find((s) => s.id === session.shareholderId);
    if (me) {
      const approvedProxy = me.proxiesAsPrincipal.find((p) => p.status === "APPROVED");
      return NextResponse.json({
        ...base,
        viewer: {
          role: "SHAREHOLDER",
          shareholder: {
            id: me.id,
            name: me.name,
            nationalId: me.nationalId,
            sharesCount: me.sharesCount,
            weightPct: totalShares ? (me.sharesCount / totalShares) * 100 : 0,
            isPresent: me.isPresent,
            myVotes: me.votes.map((v) => ({
              agendaItemId: v.agendaItemId,
              choice: v.choice,
              sharesWeight: v.sharesWeight,
              castByRole: v.castByRole,
              proxyName: v.proxy?.proxyName,
            })),
            delegatedTo: approvedProxy
              ? { name: approvedProxy.proxyName, nationalId: approvedProxy.proxyNationalId }
              : null,
          },
        },
      });
    }
  }

  if (session?.role === "PROXY" && session.proxyIds?.length) {
    // المفوض مقيّد بجلسة جمعيته فقط
    if (session.assemblyId !== assemblyId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const myProxies = assembly.proxies.filter(
      (p) => session.proxyIds!.includes(p.id) && p.status === "APPROVED"
    );
    const principals = myProxies.map((p) => ({
      proxyId: p.id,
      shareholderId: p.shareholderId,
      name: p.shareholder.name,
      sharesCount: p.shareholder.sharesCount,
      attended: p.proxyAttended,
      votedItems: [...new Set(p.shareholder.votes.map((v) => v.agendaItemId))],
    }));
    return NextResponse.json({
      ...base,
      viewer: { role: "PROXY", name: session.name, principals, totalShares: principals.reduce((a, p) => a + p.sharesCount, 0) },
    });
  }

  if (isStaff(session.role)) {
    return NextResponse.json({
      ...base,
      viewer: { role: session!.role, name: session!.name },
      shareholders: assembly.shareholders
        .map((s) => ({
          id: s.id,
          name: s.name,
          nationalId: s.nationalId,
          mobile: s.mobile,
          email: s.email,
          sharesCount: s.sharesCount,
          weightPct: totalShares ? (s.sharesCount / totalShares) * 100 : 0,
          isPresent: s.isPresent,
          attendedAt: s.attendedAt,
          hasApprovedProxy: s.proxiesAsPrincipal.some((p) => p.status === "APPROVED"),
          proxyName:
            s.proxiesAsPrincipal.find((p) => p.status === "APPROVED")?.proxyName || null,
        }))
        .sort((a, b) => b.sharesCount - a.sharesCount),
      proxies: assembly.proxies
        .map((p) => ({
          id: p.id,
          principalName: p.shareholder.name,
          principalNationalId: p.shareholder.nationalId,
          principalShares: p.shareholder.sharesCount,
          proxyName: p.proxyName,
          proxyNationalId: p.proxyNationalId,
          proxyMobile: p.proxyMobile,
          proxyEmail: p.proxyEmail,
          documentUrl: p.documentUrl,
          status: p.status,
          rejectionReason: p.rejectionReason,
          approvedBy: p.approvedBy,
          approvedAt: p.approvedAt,
          proxyAttended: p.proxyAttended,
        }))
        .sort((a, b) => (a.status === "PENDING" ? -1 : b.status === "PENDING" ? 1 : 0)),
      auditLogs: (
        await prisma.auditLog.findMany({
          where: { assemblyId: assembly.id },
          orderBy: { timestamp: "desc" },
          take: 50,
        })
      ).map((l) => ({
        id: l.id,
        actorName: l.actorName,
        actorRole: l.actorRole,
        action: l.action,
        details: l.details,
        timestamp: l.timestamp,
      })),
    });
  }

  // أي دور آخر (جلسة غير صالحة) مرفوض — لا تسريب بيانات
  return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
}
