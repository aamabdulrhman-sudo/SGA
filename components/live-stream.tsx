"use client";

import { useMemo } from "react";
import { resolveStream, PROVIDER_LABEL, type StreamProvider } from "@/lib/stream";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MonitorPlay, ExternalLink, Video, CirclePlay } from "lucide-react";

function ProviderIcon({ provider }: { provider: StreamProvider }) {
  if (provider === "ZOOM") {
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#2D8CFF] text-white font-extrabold text-xs">
        ZM
      </span>
    );
  }
  if (provider === "TEAMS") {
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#5B5FC7] text-white font-extrabold text-xs">
        T
      </span>
    );
  }
  if (provider === "YOUTUBE") {
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF0000] text-white">
        <CirclePlay className="h-5 w-5" />
      </span>
    );
  }
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800 text-white">
      <Video className="h-4 w-4" />
    </span>
  );
}

export default function LiveStream({ streamUrl }: { streamUrl?: string | null }) {
  const resolved = useMemo(() => resolveStream(streamUrl), [streamUrl]);
  if (!resolved) return null;

  const external = !resolved.embedUrl;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <MonitorPlay className="h-5 w-5 text-emerald-600" />
          البث المباشر للجمعية
        </CardTitle>
        <Badge variant="info" className="flex items-center gap-1">
          <ProviderIcon provider={resolved.provider} />
          <span className="align-middle">{PROVIDER_LABEL[resolved.provider]}</span>
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {external ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center space-y-4">
            <div className="flex items-center justify-center">
              <ProviderIcon provider={resolved.provider} />
            </div>
            <div>
              <div className="font-extrabold text-navy-800">
                بث الجمعية يُبثّ عبر {PROVIDER_LABEL[resolved.provider]}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                منصة {PROVIDER_LABEL[resolved.provider]} لا تسمح بعرض البث داخل الصفحة — انضم عبر النافذة الخارجية،
                ويمكنك متابعة التصويت وإرسال استفساراتك من دردشة البث هنا مباشرة.
              </p>
            </div>
            <a href={resolved.originalUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="emerald">
                <ExternalLink className="h-4 w-4" />
                انضم إلى البث عبر {PROVIDER_LABEL[resolved.provider]}
              </Button>
            </a>
          </div>
        ) : (
          <>
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={resolved.embedUrl!}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title="بث الجمعية العامة"
              />
            </div>
            <div className="flex justify-end">
              <a href={resolved.originalUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline">
                  <ExternalLink className="h-3.5 w-3.5" />
                  فتح البث في نافذة جديدة
                </Button>
              </a>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
