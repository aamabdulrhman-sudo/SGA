"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, ShieldCheck } from "lucide-react";

export type ChatMessageDto = {
  id: string;
  senderName: string;
  senderRole: string;
  message: string;
  isStaffReply: boolean;
  createdAt: string;
};

const ROLE_LABEL: Record<string, string> = {
  SHAREHOLDER: "مساهم",
  PROXY: "مفوض",
  SECRETARY: "أمين السر",
  SECRETARY_GENERAL: "أمين السر العام",
  PLATFORM_MANAGER: "مدير المنصة",
};

function timeLabel(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function LiveChat({
  assemblyId,
  viewerRole,
  viewerName,
  title = "دردشة البث المباشر — استفسارات المساهمين",
  className,
}: {
  assemblyId: string;
  viewerRole: string;
  viewerName: string;
  title?: string;
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const isStaff = ["SECRETARY", "SECRETARY_GENERAL", "PLATFORM_MANAGER"].includes(viewerRole);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat?assemblyId=${assemblyId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
      setError(null);
    } catch {
      /* إبقاء الرسائل الحالية عند فشل مؤقت */
    }
  }, [assemblyId]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    if (stickToBottom.current && boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [messages]);

  function onScroll() {
    const el = boxRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const clean = text.trim();
    if (!clean || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assemblyId, message: clean }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "تعذر إرسال الرسالة");
      } else {
        setText("");
        stickToBottom.current = true;
        await poll();
      }
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-sm text-navy-800">
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            {title}
          </div>
          <Badge variant="success">مباشر</Badge>
        </div>

        <div
          ref={boxRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-64 max-h-96"
        >
          {messages.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">
              لا توجد رسائل بعد — اكتب استفسارك وسيجيب عليه أمين السر مباشرة.
            </p>
          )}
          {messages.map((m) => {
            const mine = m.senderName === viewerName && m.senderRole === viewerRole;
            const staff = m.isStaffReply;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${
                    staff
                      ? "bg-emerald-600 text-white rounded-tr-sm"
                      : mine
                      ? "bg-navy-800 text-white rounded-tl-sm"
                      : "bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-sm"
                  }`}
                >
                  <div className={`flex items-center gap-1.5 text-[11px] font-bold mb-1 ${staff || mine ? "text-white/80" : "text-slate-500"}`}>
                    {staff && <ShieldCheck className="h-3 w-3" />}
                    <span className="truncate max-w-40">{m.senderName}</span>
                    <span className="opacity-70">• {ROLE_LABEL[m.senderRole] || m.senderRole}</span>
                    <span className="opacity-60" dir="ltr">{timeLabel(m.createdAt)}</span>
                  </div>
                  <div className="whitespace-pre-wrap break-words">{m.message}</div>
                </div>
              </div>
            );
          })}
        </div>

        {error && <div className="px-4 pb-2 text-xs font-semibold text-red-600">{error}</div>}

        <form onSubmit={send} className="border-t border-slate-100 p-3 flex gap-2 items-center">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isStaff ? "اكتب ردك على استفسارات المساهمين..." : "اكتب استفسارك هنا..."}
            maxLength={500}
            className="flex-1"
          />
          <Button type="submit" size="sm" variant="emerald" disabled={busy || !text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
