"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Room, RoomEvent, Track, ConnectionState, type RemoteParticipant } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LiveChat from "@/components/live-chat";
import {
  Video, VideoOff, Mic, MicOff, MonitorUp, Radio, Users, CircleStop,
} from "lucide-react";

type StatusDto = { enabled: boolean; internalLive: boolean; hostOnline: boolean; participants: number };

export default function LiveStudio({
  assemblyId,
  staffRole,
  staffName,
  onEnded,
}: {
  assemblyId: string;
  staffRole: string;
  staffName: string;
  onEnded?: () => void;
}) {
  const [connected, setConnected] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);
  const [status, setStatus] = useState<StatusDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startingRef = useRef(false);

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
    const t = setInterval(pollStatus, 8000);
    return () => clearInterval(t);
  }, [pollStatus]);

  // تنظيف الاتصال عند مغادرة الصفحة
  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  function attachLocalCamera(room: Room) {
    const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
    if (pub?.videoTrack && videoRef.current) {
      pub.videoTrack.attach(videoRef.current);
    }
  }

  async function startBroadcast(withCam: boolean, withMic: boolean) {
    if (startingRef.current) return;
    startingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assemblyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر الحصول على رمز البث");

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.LocalTrackPublished, (pub) => {
        if (pub.source === Track.Source.Camera) {
          setCamOn(true);
          attachLocalCamera(room);
        }
        if (pub.source === Track.Source.Microphone) setMicOn(true);
        if (pub.source === Track.Source.ScreenShare) setScreenOn(true);
      });
      room.on(RoomEvent.LocalTrackUnpublished, (pub) => {
        if (pub.source === Track.Source.Camera) setCamOn(false);
        if (pub.source === Track.Source.Microphone) setMicOn(false);
        if (pub.source === Track.Source.ScreenShare) setScreenOn(false);
      });
      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setCamOn(false);
        setMicOn(false);
        setScreenOn(false);
      });

      await room.connect(data.wsUrl, data.token);
      setConnected(true);
      await pollStatus();

      if (withCam) {
        try {
          await room.localParticipant.setCameraEnabled(true);
        } catch {
          setError("تعذر الوصول إلى الكاميرا — تحقق من الصلاحيات");
        }
      }
      if (withMic) {
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
        } catch {
          setError("تعذر الوصول إلى المايك — تحقق من الصلاحيات");
        }
      }
    } catch (e: any) {
      setError(e?.message || "تعذر بدء البث");
      roomRef.current = null;
    } finally {
      setBusy(false);
      startingRef.current = false;
    }
  }

  async function stopBroadcast() {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setConnected(false);
    setCamOn(false);
    setMicOn(false);
    setScreenOn(false);
    await pollStatus();
    onEnded?.();
  }

  async function toggleCam() {
    if (!roomRef.current) return;
    setBusy(true);
    try {
      await roomRef.current.localParticipant.setCameraEnabled(!camOn);
    } finally {
      setBusy(false);
    }
  }

  async function toggleMic() {
    if (!roomRef.current) return;
    setBusy(true);
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(!micOn);
    } finally {
      setBusy(false);
    }
  }

  async function toggleScreen() {
    if (!roomRef.current) return;
    setBusy(true);
    try {
      await roomRef.current.localParticipant.setScreenShareEnabled(!screenOn);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl p-3.5 text-sm font-semibold bg-red-50 text-red-700 border border-red-200">{error}</div>
      )}

      {/* شريط الحالة */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {connected ? (
            <Badge className="bg-red-600 flex items-center gap-1.5 py-1">
              <Radio className="h-3.5 w-3.5 animate-pulse" /> بثك مباشر الآن
            </Badge>
          ) : (
            <Badge variant="muted">البث غير منشور</Badge>
          )}
          <Badge variant="info" className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {status?.participants ?? 0} داخل الغرفة
          </Badge>
        </div>
        {connected && (
          <Button size="sm" variant="destructive" onClick={stopBroadcast}>
            <CircleStop className="h-4 w-4" /> إنهاء البث
          </Button>
        )}
      </div>

      {/* الفيديو + الدردشة المتراكبة داخله */}
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        {connected && camOn ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 gap-3">
            <Video className="h-10 w-10" />
            <p className="text-sm font-semibold">
              {connected ? "الكاميرا متوقفة — البث صوتي / شاشة فقط" : "ستظهر معاينة الكاميرا هنا بعد بدء البث"}
            </p>
          </div>
        )}

        {/* دردشة الاستفسارات داخل الفيديو نفسه — لوحة جانبية */}
        {connected && chatVisible && (
          <div className="absolute top-3 bottom-3 w-64 sm:w-72" style={{ insetInlineEnd: "0.75rem" }}>
            <LiveChat
              assemblyId={assemblyId}
              viewerRole={staffRole}
              viewerName={staffName}
              title="دردشة البث"
              overlay
            />
          </div>
        )}

        {/* أزرار التحكم — أسفل منتصف الفيديو */}
        <div className="absolute bottom-3 inset-x-0 flex justify-center flex-wrap gap-2 px-3 pointer-events-none">
          {!connected ? (
            <>
              <span className="pointer-events-auto">
                <Button size="sm" variant="emerald" disabled={busy} onClick={() => startBroadcast(true, true)}>
                  <Video className="h-4 w-4" /> ابدأ البث بالكاميرا والمايك
                </Button>
              </span>
              <span className="pointer-events-auto">
                <Button size="sm" variant="outline" className="bg-white/90" disabled={busy} onClick={() => startBroadcast(false, true)}>
                  <Mic className="h-4 w-4" /> بث صوتي فقط
                </Button>
              </span>
            </>
          ) : (
            <>
              <span className="pointer-events-auto">
                <Button size="sm" variant={camOn ? "secondary" : "outline"} className="bg-white/90" disabled={busy} onClick={toggleCam}>
                  {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  {camOn ? "إيقاف الكاميرا" : "تشغيل الكاميرا"}
                </Button>
              </span>
              <span className="pointer-events-auto">
                <Button size="sm" variant={micOn ? "secondary" : "outline"} className="bg-white/90" disabled={busy} onClick={toggleMic}>
                  {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  {micOn ? "كتم المايك" : "تفعيل المايك"}
                </Button>
              </span>
              <span className="pointer-events-auto">
                <Button size="sm" variant={screenOn ? "emerald" : "outline"} className="bg-white/90" disabled={busy} onClick={toggleScreen}>
                  <MonitorUp className="h-4 w-4" />
                  {screenOn ? "إيقاف مشاركة الشاشة" : "مشاركة الشاشة"}
                </Button>
              </span>
              <span className="pointer-events-auto">
                <Button size="sm" variant="outline" className="bg-white/90" onClick={() => setChatVisible(!chatVisible)}>
                  {chatVisible ? "إخفاء الدردشة" : "إظهار الدردشة"}
                </Button>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
