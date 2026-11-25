import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "ga-platform-dev-secret"
);

export const SESSION_COOKIE = "ga_session";

export type StaffRole = "PLATFORM_MANAGER" | "SECRETARY_GENERAL" | "SECRETARY";

export type SessionData = {
  role: StaffRole | "SHAREHOLDER" | "PROXY";
  name: string;
  identifier: string;
  userId?: string;
  shareholderId?: string;
  proxyIds?: string[];
  assemblyId?: string;
  companyId?: string;
};

export function isStaff(role?: string): role is StaffRole | "SHAREHOLDER" | "PROXY" {
  return role === "SECRETARY" || role === "SECRETARY_GENERAL" || role === "PLATFORM_MANAGER";
}

/** إدارة الحسابات متاحة لمدير المنصة وأمين السر الرئيسي فقط */
export function canManageUsers(role?: string) {
  return role === "PLATFORM_MANAGER" || role === "SECRETARY_GENERAL";
}

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

/** True once the first-run platform manager account exists (setup wizard locked). */
export async function setupCompleted() {
  const count = await prisma.user.count({ where: { role: "PLATFORM_MANAGER" } });
  return count > 0;
}

/** Resolve an identifier (username / national id) -> staff account */
export async function resolveStaff(identifier: string) {
  const clean = identifier.trim();
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: clean }, { nationalId: clean }] },
  });
  if (!user) return null;
  if (!user.isActive) return { user, disabled: true };
  return { user, disabled: false };
}

/** Resolve an identifier -> role + context (staff / shareholder / proxy) */
export async function resolveIdentifier(identifier: string) {
  const clean = identifier.trim();

  const staff = await resolveStaff(clean);
  if (staff && !staff.disabled) {
    return {
      type: staff.user.role as "PLATFORM_MANAGER" | "SECRETARY_GENERAL" | "SECRETARY",
      name: staff.user.name,
      userId: staff.user.id,
    };
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
