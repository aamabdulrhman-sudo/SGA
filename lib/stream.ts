export type StreamProvider = "YOUTUBE" | "ZOOM" | "TEAMS" | "EMBED" | "UNKNOWN";

export type ResolvedStream = {
  provider: StreamProvider;
  /** رابط جاهز للتضمين داخل iframe (null إذا كانت المنصة تمنع التضمين) */
  embedUrl: string | null;
  /** الرابط الأصلي للفتح في نافذة خارجية */
  originalUrl: string;
};

function extractYouTubeId(url: URL): string | null {
  // youtu.be/<id>
  if (url.hostname.includes("youtu.be")) {
    return url.pathname.slice(1).split("/")[0] || null;
  }
  // youtube.com/watch?v=<id>
  const v = url.searchParams.get("v");
  if (v) return v;
  // youtube.com/live/<id> | /embed/<id> | /shorts/<id>
  const m = url.pathname.match(/\/(live|embed|shorts)\/([\w-]+)/);
  if (m) return m[2];
  return null;
}

/**
 * يحدد مزوّد البث من الرابط ويحوّله لرابط قابل للتضمين.
 * YouTube / أي رابط embed → iframe مباشرة.
 * Zoom / Teams → يمنعان التضمين (X-Frame-Options) → زر انضمام خارجي.
 */
export function resolveStream(rawUrl?: string | null): ResolvedStream | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { provider: "UNKNOWN", embedUrl: null, originalUrl: rawUrl.trim() };
  }

  const host = url.hostname.replace(/^www\./, "");

  // YouTube — يمكن تضمينه مباشرة
  if (host.endsWith("youtube.com") || host.endsWith("youtu.be") || host.endsWith("youtube-nocookie.com")) {
    const id = extractYouTubeId(url);
    if (id) {
      return {
        provider: "YOUTUBE",
        embedUrl: `https://www.youtube.com/embed/${id}?autoplay=0&rel=0`,
        originalUrl: rawUrl.trim(),
      };
    }
  }

  // Zoom — لا يسمح بالتضمين
  if (host.endsWith("zoom.us") || host.endsWith("zoom.com") || host.endsWith("zoomgov.com")) {
    return { provider: "ZOOM", embedUrl: null, originalUrl: rawUrl.trim() };
  }

  // Microsoft Teams — لا يسمح بالتضمين
  if (host.endsWith("teams.microsoft.com") || host.endsWith("teams.live.com")) {
    return { provider: "TEAMS", embedUrl: null, originalUrl: rawUrl.trim() };
  }

  // أي رابط آخر — نحاول التضمين مباشرة (يعمل مع روابط OBS/إيفنتات embed)
  return { provider: "EMBED", embedUrl: rawUrl.trim(), originalUrl: rawUrl.trim() };
}

export const PROVIDER_LABEL: Record<StreamProvider, string> = {
  YOUTUBE: "يوتيوب",
  ZOOM: "زوم",
  TEAMS: "مايكروسوفت تيمز",
  EMBED: "بث مضمّن",
  UNKNOWN: "رابط خارجي",
};
