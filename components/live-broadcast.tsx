"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Room, RoomEvent, Track, type RemoteTrackPublication } from "livekit-client";
import { Badge } from "@/components/ui/badge";
import LiveChat from "@/components/live-chat";
import { Video, Users, Radio } from "lucide-react";

type StatusDto = { enabled: boolean; internalLive: boolean; hostOnline: boolean; participants: number };

export default function LiveBroadcast({
  assemblyId,
  viewerRole,
  viewerName,
}: {
  assemblyId: string;
  viewerRole: string;
  viewerName: string;
}) {
  const [status, setStatus] = useState<StatusDto | null>(null);
  const [connected, setConnected] = useState(false);
  const [watching, setWatching] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);

  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const attachedTrackRef = useRef<{ detach: (el: HTMLElement) => void } | null>(null);
  const connectingRef = useRef(false);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/livekit/status?assemblyId=${assemblyId}`, { cache: "no-store" });
      if (res.ok) setStatus(await res.json());
    } catch {
      /* تجاهل */
    }
  }, [assemblyId]);

  useEffect(() => {
    pollStatus();
    const t = setInterval(pollStatus, 5000);
    return () => clearInterval(t);
  }, [pollStatus]);

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  function clearVideo() {
    if (attachedTrackRef.current && videoRef.current) {
      try {
        attachedTrackRef.current.detach(videoRef.current);
      } catch {
        /* تجاهل */
      }
      attachedTrackRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  /** يعرض مشاركة الشاشة إن وُجدت وإلا الكاميرا */
  function updateVideoSource(room: Room) {
    const el = videoRef.current;
    if (!el) return;
    let picked: RemoteTrackPublication | undefined;
    for (const p of room.remoteParticipants.values()) {
      const screen = p.getTrackPublication(Track.Source.ScreenShare);
      if (screen?.isSubscribed && screen.videoTrack) {
        picked = screen;
        break;
      }
      const cam = p.getTrackPublication(Track.Source.Camera);
      if (cam?.isSubscribed && cam.videoTrack && !picked) picked = cam;
    }
    if (picked?.videoTrack) {
      if (attachedTrackRef.current !== picked.videoTrack) {
        clearVideo();
        picked.videoTrack.attach(el);
        attachedTrackRef.current = picked.videoTrack as unknown as { detach: (el: HTMLElement) => void };
        setWatching(true);
      }
    } else {
      clearVideo();
      setWatching(false);
    }
  }

  function attachAudio(room: Room) {
    const el = audioRef.current;
    if (!el) return;
    for (const p of room.remoteParticipants.values()) {
      const mic = p.getTrackPublication(Track.Source.Microphone);
      if (mic?.isSubscribed && mic.audioTrack) {
        mic.audioTrack.attach(el);
        return;
      }
    }
    el.srcObject = null;
  }

  async function connect() {
    if (connectingRef.current || roomRef.current) return;
    connectingRef.current = true;
    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assemblyId }),
      });
      const data = await res.json();
      if (!res.ok) return;

      const room = new Room({ adaptiveStream: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (_t, _pub) => {
        updateVideoSource(room);
        attachAudio(room);
      });
      room.on(RoomEvent.TrackUnsubscribed, () => {
        updateVideoSource(room);
        attachAudio(room);
      });
      room.on(RoomEvent.ParticipantConnected, () => {
        updateVideoSource(room);
        attachAudio(room);
      });
      room.on(RoomEvent.ParticipantDisconnected, () => {
        updateVideoSource(room);
        attachAudio(room);
      });
      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setWatching(false);
        roomRef.current = null;
      });

      await room.connect(data.wsUrl, data.token);
      setConnected(true);
      updateVideoSource(room);
      attachAudio(room);
    } catch {
      /* سيُعاد المحاولة عند توفر المذيع */
    } finally {
      connectingRef.current = false;
    }
  }

  // الاتصال تلقائياً عند توفر المذيع
  useEffect(() => {
    if (status?.enabled && status.internalLive && status.hostOnline && !roomRef.current) {
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.hostOnline, status?.enabled, status?.internalLive]);

  const showLive = connected && watching;

  return (
    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
      <audio ref={audioRef} autoPlay className="hidden" />

      {!showLive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 gap-3 bg-navy-900">
          <Video className="h-10 w-10" />
          <p className="text-sm font-semibold text-center px-6">
            {status?.internalLive
              ? status?.hostOnline
                ? "جارٍ الاتصال بالبث..."
                : "البث الداخلي مفعّل — بانتظار بدء أمين السر للبث من غرفة التحكم"
              : "البث الداخلي غير مفعّل لهذه الجمعية"}
          </p>
        </div>
      )}

      {/* شارات الحالة داخل الفيديو */}
      <div className="absolute top-3 flex gap-2" style={{ insetInlineEnd: "0.75rem", insetInlineStart: "auto" }}>
        {showLive && (
          <Badge className="bg-red-600 flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 animate-pulse" /> مباشر
          </Badge>
        )}
        <Badge variant="muted" className="flex items-center gap-1 bg-black/60 text-white border-white/20">
          <Users className="h-3.5 w-3.5" />
          {status?.participants ?? 0}
        </Badge>
      </div>

      {/* دردشة الاستفسارات داخل الفيديو نفسه */}
      {chatVisible && (
        <div className="absolute bottom-3 top-16 w-64 sm:w-72" style={{ insetInlineEnd: "0.75rem" }}>
          <LiveChat
            assemblyId={assemblyId}
            viewerRole={viewerRole}
            viewerName={viewerName}
            title="دردشة البث"
            overlay
          />
        </div>
      )}

      {/* زر إظهار/إخفاء الدردشة */}
      <button
        onClick={() => setChatVisible(!chatVisible)}
        className="absolute top-3 flex items-center text-xs font-bold bg-black/60 text-white border border-white/20 rounded-full px-3 py-1 hover:bg-black/80 cursor-pointer"
        style={{ insetInlineStart: "0.75rem", insetInlineEnd: "auto" }}
      >
        {chatVisible ? "إخفاء الدردشة" : "إظهار الدردشة"}
      </button>
    </div>
  );
}
