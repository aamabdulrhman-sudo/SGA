"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { formatDateAr } from "@/lib/utils";
import { UserPlus, Ban, CheckCircle2, Trash2, KeyRound, CheckCircle2 as Check, XCircle } from "lucide-react";

type StaffUser = {
  id: string;
  username: string;
  name: string;
  nationalId: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export default function StaffUsersManager({
  isManager,
  currentUserId,
}: {
  isManager: boolean;
  currentUserId: string;
}) {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/users", { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setUsers(data.users);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function call(method: string, body: unknown, successText: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: successText });
        setAddOpen(false);
        setResetTarget(null);
        setNewPassword("");
      } else setMsg({ ok: false, text: data.error || "حدث خطأ" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const ROLE_LABEL: Record<string, string> = {
    PLATFORM_MANAGER: "مدير منصة",
    SECRETARY_GENERAL: "أمين السر الرئيسي",
    SECRETARY: "أمين سر",
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`rounded-xl p-3.5 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.ok ? <Check className="inline h-4 w-4 ml-1" /> : <XCircle className="inline h-4 w-4 ml-1" />}
          {msg.text}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)} disabled={busy}>
          <UserPlus className="h-4 w-4" /> إضافة حساب جديد
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            حسابات فريق العمل ({users.length})
            {!isManager && <Badge variant="info" className="mr-2">تدير حسابات أماني السر فقط (بدون مديري المنصة)</Badge>}
          </CardTitle>
          <CardDescription>
            الحسابات المعطلة لا تستطيع تسجيل الدخول إطلاقاً — الحساب المُنشأ عبر معالج الإعداد الأولي (مدير المنصة) لا يظهر هنا إلا لمدير المنصة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>اسم المستخدم</TableHead>
                <TableHead>الهوية</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-semibold">{u.name}</TableCell>
                  <TableCell dir="ltr">{u.username}</TableCell>
                  <TableCell dir="ltr">{u.nationalId}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "PLATFORM_MANAGER" ? "default" : u.role === "SECRETARY_GENERAL" ? "warning" : "info"}>
                      {ROLE_LABEL[u.role] || u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <Badge variant="success">نشط</Badge>
                    ) : (
                      <Badge variant="danger">معطل</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{formatDateAr(u.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy || u.id === currentUserId}
                        onClick={() => { setResetTarget(u); setNewPassword(""); }}
                        title="إعادة تعيين كلمة المرور"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      {u.isActive ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy || u.id === currentUserId}
                          onClick={() => call("PATCH", { userId: u.id, isActive: false }, `تم تعطيل حساب: ${u.name}`)}
                        >
                          <Ban className="h-3.5 w-3.5" /> تعطيل
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="emerald"
                          disabled={busy}
                          onClick={() => call("PATCH", { userId: u.id, isActive: true }, `تم تفعيل حساب: ${u.name}`)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> تفعيل
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy || u.id === currentUserId}
                        onClick={() => {
                          if (confirm(`حذف حساب ${u.name} نهائياً؟`)) {
                            call("DELETE", { userId: u.id }, `تم حذف حساب: ${u.name}`);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                    لا توجد حسابات — أضف أول حساب الآن.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add user dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="إضافة حساب مستخدم جديد">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            await call(
              "POST",
              {
                name: f.get("name"),
                username: f.get("username"),
                nationalId: f.get("nationalId"),
                password: f.get("password"),
                role: f.get("role"),
              },
              "تم إنشاء الحساب بنجاح"
            );
          }}
          className="space-y-3"
        >
          <div><Label>الاسم الكامل *</Label><Input name="name" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>اسم المستخدم *</Label><Input name="username" required dir="ltr" /></div>
            <div><Label>رقم الهوية *</Label><Input name="nationalId" required dir="ltr" inputMode="numeric" maxLength={10} /></div>
          </div>
          <div>
            <Label>الدور *</Label>
            <Select name="role" defaultValue="SECRETARY">
              <option value="SECRETARY">أمين سر (إدارة الشركات والجمعيات)</option>
              <option value="SECRETARY_GENERAL">أمين السر الرئيسي (إدارة الشركات والجمعيات + الحسابات)</option>
              {isManager && <option value="PLATFORM_MANAGER">مدير منصة (جميع الصلاحيات)</option>}
            </Select>
          </div>
          <div><Label>كلمة المرور (8 أحرف على الأقل) *</Label><Input name="password" required dir="ltr" type="password" minLength={8} /></div>
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={busy}>
            إنشاء الحساب
          </Button>
        </form>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetTarget} onClose={() => setResetTarget(null)} title={`إعادة تعيين كلمة المرور — ${resetTarget?.name || ""}`}>
        <div className="space-y-3">
          <Label>كلمة المرور الجديدة (8 أحرف على الأقل)</Label>
          <Input dir="ltr" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} />
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={busy || newPassword.length < 8}
            onClick={() => call("PATCH", { userId: resetTarget!.id, password: newPassword }, "تم تحديث كلمة المرور")}
          >
            <KeyRound className="h-4 w-4" /> تحديث كلمة المرور
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
