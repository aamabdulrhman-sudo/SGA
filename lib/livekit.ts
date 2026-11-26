import "server-only";
import { SignJWT } from "jose";
import type { SessionData } from "./auth";

export const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
export const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";
const INTERNAL_URL = process.env.LIVEKIT_INTERNAL_URL || "http://livekit:7880";

/** هل البث الداخلي مفعّل في هذه النسخة؟ */
export function livekitEnabled() {
  return !!(LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
}

export function roomNameFor(assemblyId: string) {
  return `assembly-${assemblyId}`;
}

/** عنوان خادم البث للاتصال من المتصفح */
export function publicWsUrl(req: { headers: { get(name: string): string | null } }) {
  if (process.env.LIVEKIT_PUBLIC_URL) return process.env.LIVEKIT_PUBLIC_URL;
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  const hostname = host.split(":")[0];
  return `${proto === "https" ? "wss" : "ws"}://${hostname}:7880`;
}

function secret() {
  return new TextEncoder().encode(LIVEKIT_API_SECRET);
}

/** إنشاء رمز دخول غرفة البث حسب دور الجلسة */
export async function createJoinToken(assemblyId: string, session: SessionData) {
  const isHost = ["PLATFORM_MANAGER", "SECRETARY_GENERAL", "SECRETARY"].includes(session.role);
  const identity = isHost
    ? `host-${session.userId || session.identifier}`
    : session.role === "SHAREHOLDER"
    ? `shr-${session.shareholderId}`
    : `pxy-${session.proxyIds?.[0] || session.identifier}`;

  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({
    video: {
      roomJoin: true,
      room: roomNameFor(assemblyId),
      canPublish: isHost,
      canSubscribe: true,
      canPublishData: true,
    },
    iss: LIVEKIT_API_KEY,
    sub: identity,
    name: session.name,
    nbf: now - 10,
    exp: now + 60 * 60 * 12,
  })
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret());
}

async function serviceToken(room: string) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({
    video: { room, roomList: true, roomAdmin: true },
    iss: LIVEKIT_API_KEY,
    sub: "sga-room-service",
    nbf: now - 10,
    exp: now + 120,
  })
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret());
}

async function roomService<T = any>(room: string, method: string, body: Record<string, unknown>): Promise<T | null> {
  try {
    const token = await serviceToken(room);
    const res = await fetch(`${INTERNAL_URL}/twirp/livekit.RoomService/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ room, ...body }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type LiveStatus = {
  internalLive: boolean;
  hostOnline: boolean;
  participants: number;
};

/** حالة البث الداخلي للجمعية (هل المذيع متصل + عدد المشاهدين) */
export async function getLiveStatus(assemblyId: string, internalLive: boolean): Promise<LiveStatus> {
  const room = roomNameFor(assemblyId);
  const participants = await roomService<any[]>(room, "ListParticipants", {});
  const list = Array.isArray(participants) ? participants : [];
  return {
    internalLive,
    hostOnline: list.some((p) => typeof p.identity === "string" && p.identity.startsWith("host-")),
    participants: list.length,
  };
}

/** إنهاء بث الجمعية (طرد الجميع من الغرفة) */
export async function endLiveRoom(assemblyId: string) {
  await roomService(roomNameFor(assemblyId), "DeleteRoom", {});
}
