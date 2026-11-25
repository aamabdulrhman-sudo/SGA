import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "ga-platform-dev-secret"
);

export const SESSION_COOKIE = "ga_session";

export type SessionData = {
  role: "SECRETARY" | "SHAREHOLDER" | "PROXY";
  name: string;
  identifier: string; // national id used to login
  shareholderId?: string;
  proxyIds?: string[];
  assemblyId?: string;
  companyId?: string;
};

export async function createSession(data: SessionData) {
  const token = await new SignJWT(data)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(SECRET);
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Resolve identifier -> role + context */
export async function resolveIdentifier(identifier: string) {
  const clean = identifier.trim();

  const admin = await prisma.adminUser.findFirst({
    where: {
      OR: [{ username: clean }, { nationalId: clean }],
    },
  });
  if (admin) {
    return { type: "SECRETARY" as const, name: admin.name, adminId: admin.id };
  }

  const shareholder = await prisma.shareholder.findFirst({
    where: { nationalId: clean },
    include: { assembly: true },
  });
  if (shareholder) {
    return {
      type: "SHAREHOLDER" as const,
      name: shareholder.name,
      shareholderId: shareholder.id,
      assemblyId: shareholder.assemblyId,
      companyId: shareholder.assembly.companyId,
    };
  }

  const proxyRecords = await prisma.proxy.findMany({
    where: { proxyNationalId: clean, status: "APPROVED" },
    include: { assembly: true },
  });
  if (proxyRecords.length > 0) {
    return {
      type: "PROXY" as const,
      name: proxyRecords[0].proxyName,
      proxyIds: proxyRecords.map((p) => p.id),
      assemblyId: proxyRecords[0].assemblyId,
      companyId: proxyRecords[0].assembly.companyId,
    };
  }

  return null;
}

export async function logAudit(
  assemblyId: string | null,
  actorName: string,
  actorRole: string,
  action: string,
  details?: string,
  ipAddress?: string
) {
  await prisma.auditLog.create({
    data: {
      assemblyId,
      actorName,
      actorRole,
      action,
      details,
      ipAddress,
    },
  });
}
