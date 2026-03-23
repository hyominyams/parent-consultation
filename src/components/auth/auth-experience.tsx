"use client";

import { useActionState, useEffect, useState } from "react";
import {
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { parentAccessAction, teacherLoginAction } from "@/lib/actions/auth-actions";
import { CONSENT_COPY } from "@/lib/config/consent";
import { INITIAL_ACTION_STATE } from "@/types/action-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthExperienceProps = {
  initialRole?: "PARENT" | "TEACHER";
};

function FieldError({
  errors,
  name,
}: {
  errors?: Record<string, string[]>;
  name: string;
}) {
  const message = errors?.[name]?.[0];

  if (!message) {
    return null;
  }

  return <p className="text-sm text-[#a83836]">{message}</p>;
}

function ConsentChecklist() {
  return (
    <div className="rounded-3xl bg-surface-container-low p-6 border border-surface-container-high">
      <div className="flex items-center gap-2 text-sm font-bold text-text-strong">
        <ShieldCheck className="h-4 w-4 text-primary" />
        개인정보의 안전한 보호 및 이용 안내
      </div>
      <p className="text-readable mt-3 text-[11px] leading-relaxed text-text-soft tracking-tight">
        최초 1회 정보 입력을 통해 계정이 자동 생성됩니다. 입력하신 정보는 본인 확인 및 상담 관리를 위해서만 활용되며, <span className="font-bold text-text-strong">상담 기간 종료 시 모든 데이터는 즉시 영구 파기됩니다.</span>
      </p>

      <div className="mt-5 grid gap-3">
        <label className="flex items-start gap-4 rounded-2xl bg-white px-5 py-4 transition-all hover:bg-primary-container/20 border border-transparent hover:border-primary/20">
          <input
            type="checkbox"
            name="privacyConsent"
            className="mt-1 h-4 w-4 rounded border-surface-container-highest bg-surface-container text-primary"
          />
          <div className="grid gap-1">
            <strong className="text-sm font-bold text-text-strong">
              {CONSENT_COPY.privacy.title} (필수)
            </strong>
            <div className="text-readable grid gap-0.5 text-[11px] leading-relaxed text-text-muted">
              <p>관리 주체: {CONSENT_COPY.privacy.organization}</p>
              <p>수집 항목: {CONSENT_COPY.privacy.items}</p>
              <p>이용 목적: {CONSENT_COPY.privacy.purpose}</p>
              <p className="font-bold text-primary">
                보관 기간: {CONSENT_COPY.privacy.retention}
              </p>
            </div>
          </div>
        </label>

        <label className="flex items-start gap-4 rounded-2xl bg-white px-5 py-4 transition-all hover:ring-1 hover:ring-[color:var(--primary-container)]">
          <input
            type="checkbox"
            name="thirdPartyConsent"
            className="mt-1 h-4 w-4 rounded border-none bg-[color:var(--surface-container)] text-[color:var(--primary)]"
          />
          <div className="grid gap-1">
            <strong className="text-sm font-bold text-[color:var(--text-strong)]">
              {CONSENT_COPY.thirdParty.title} (필수)
            </strong>
            <div className="text-readable grid gap-0.5 text-[11px] leading-relaxed text-[color:var(--text-muted)]">
              <p>제공 기관: {CONSENT_COPY.thirdParty.organization}</p>
              <p>이용 목적: {CONSENT_COPY.thirdParty.purpose}</p>
              <p>보관 기간: {CONSENT_COPY.thirdParty.retention}</p>
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}

function ParentAccessForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(parentAccessAction, INITIAL_ACTION_STATE);

  useEffect(() => {
    if (state.status === "error" && state.message) {
      toast.error(state.message, { id: "parent-auth-error" });
    }

    if (state.status === "success") {
      toast.success(state.message, { id: "parent-auth-success" });
      if (state.redirectTo) {
        router.push(state.redirectTo);
      }
    }
  }, [router, state]);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-3 sm:items-start">
        <div className="grid gap-2">
          <Label htmlFor="grade">학년</Label>
          <select
            id="grade"
            name="grade"
            className="h-12 rounded-2xl bg-surface-container-low border border-surface-container-high px-4 text-text-strong outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all"
            defaultValue="6"
          >
            {[1, 2, 3, 4, 5, 6].map((grade) => (
              <option key={grade} value={grade}>
                {grade}학년
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors} name="grade" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="classroom">반</Label>
          <Input id="classroom" name="classroom" type="number" inputMode="numeric" placeholder="선택 입력" />
          <FieldError errors={state.fieldErrors} name="classroom" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="studentNumber">번호</Label>
          <Input id="studentNumber" name="studentNumber" type="number" inputMode="numeric" placeholder="예: 7" />
          <FieldError errors={state.fieldErrors} name="studentNumber" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
        <div className="grid gap-2">
          <Label htmlFor="studentName">학생 이름</Label>
          <Input id="studentName" name="studentName" placeholder="예: 김민수" />
          <FieldError errors={state.fieldErrors} name="studentName" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="parentName">학부모 성함</Label>
          <Input id="parentName" name="parentName" placeholder="예: 김지은" />
          <FieldError errors={state.fieldErrors} name="parentName" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
        <div className="grid gap-2">
          <Label htmlFor="phone">연락처</Label>
          <Input id="phone" name="phone" inputMode="tel" autoComplete="tel-national" placeholder="01012345678" />
          <p className="text-[11px] leading-relaxed text-text-muted">하이픈(`-`)을 넣어도 자동으로 제외되어 저장됩니다.</p>
          <FieldError errors={state.fieldErrors} name="phone" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pin">비회원용 비밀번호</Label>
          <Input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="1234"
          />
          <p className="text-[13px] leading-relaxed text-text-muted">
            예약 확인을 위해 암호를 기억하세요.
          </p>
          <FieldError errors={state.fieldErrors} name="pin" />
        </div>
      </div>

      <ConsentChecklist />

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        style={{ color: '#ffffff' }}
        className="mt-6 w-full rounded-2xl py-7 text-lg shadow-lg transition-all hover:scale-[1.02] active:scale-95"
      >
        {pending ? <Sparkles className="mr-2 h-5 w-5 animate-pulse" style={{ color: '#ffffff' }} /> : null}
        {pending ? "본인 정보 확인 중..." : "정보 확인 후 상담 포털 입장하기"}
      </Button>

      {state.meta?.loginId ? (
        <div className="text-readable rounded-[1.5rem] bg-[color:var(--secondary-container)] px-5 py-4 text-sm text-[color:var(--secondary-foreground)]">
          현재 연결된 로그인 ID: <strong>{state.meta.loginId}</strong>
        </div>
      ) : null}
    </form>
  );
}

function TeacherLoginForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(teacherLoginAction, INITIAL_ACTION_STATE);

  useEffect(() => {
    if (state.status === "error" && state.message) {
      toast.error(state.message, { id: "teacher-auth-error" });
    }

    if (state.status === "success") {
      toast.success(state.message, { id: "teacher-auth-success" });
      if (state.redirectTo) {
        router.push(state.redirectTo);
      }
    }
  }, [router, state]);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
        <div className="grid gap-2">
          <Label htmlFor="teacher-grade">학년</Label>
          <select
            id="teacher-grade"
            name="grade"
            className="h-12 rounded-2xl bg-[color:var(--surface-1)] px-4 outline-none ring-1 ring-[rgba(76,101,115,0.08)]"
            defaultValue="6"
          >
            {[1, 2, 3, 4, 5, 6].map((grade) => (
              <option key={grade} value={grade}>
                {grade}학년
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors} name="grade" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="teacher-classroom">반</Label>
          <Input id="teacher-classroom" name="classroom" type="number" inputMode="numeric" placeholder="1" />
          <FieldError errors={state.fieldErrors} name="classroom" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
        <div className="grid gap-2">
          <Label htmlFor="teacherName">교사 이름</Label>
          <Input id="teacherName" name="teacherName" placeholder="예: 정하늘" />
          <FieldError errors={state.fieldErrors} name="teacherName" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">암호</Label>
          <Input id="password" name="password" type="password" placeholder="암호 입력" />
          <FieldError errors={state.fieldErrors} name="password" />
        </div>
      </div>

      <ConsentChecklist />

      <Card className="bg-primary-container/40 p-5 shadow-none border border-primary/20">
        <p className="text-sm font-bold text-on-primary-container">교사 계정 안내</p>
        <p className="text-readable mt-2 text-sm leading-relaxed text-on-primary-container/80">
          교사 계정은 학년·반별로 미리 준비되어 있으며, 담임 성함이 등록된 학급만 로그인할 수 있습니다.
        </p>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending} style={{ color: '#ffffff' }}>
          {pending ? "로그인 중..." : "교사 대시보드 입장"}
        </Button>
      </div>
    </form>
  );
}

export function AuthExperience({ initialRole = "PARENT" }: AuthExperienceProps) {
  const [role, setRole] = useState<"PARENT" | "TEACHER">(initialRole);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-12 px-5 py-24 sm:px-8">
      <div className="text-center">
        <Badge variant="primary" className="mb-6 rounded-full px-4 py-1.5 font-bold tracking-widest uppercase">
          <Sparkles className="mr-2 inline h-4 w-4" />
          School Portal
        </Badge>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-text-strong sm:text-5xl md:text-6xl">
          <span className="block sm:inline">2026학년도</span>
          <span className="mt-2 block whitespace-nowrap text-primary sm:ml-3 sm:mt-0 sm:inline">학부모 상담신청</span>
        </h1>
        <p className="text-readable mx-auto mt-6 max-w-2xl font-body text-lg font-medium leading-relaxed text-text-soft">
          학생 정보로 로그인해 원하는 상담 시간을 편리하게 예약하세요. 별도의 회원가입 없이 안전하게
          이용하실 수 있습니다.
        </p>
      </div>

      {/* Removed the large image and side content cards to keep the UI clean, moving directly to Auth Card */}
      <Card className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-2xl shadow-primary/5 border border-surface-container-high md:p-12">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary-container/30 opacity-40 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-10">
          <div className="flex w-full justify-center">
            <div className="inline-flex w-full max-w-[18rem] rounded-full border border-surface-container-high bg-surface-container-low p-1.5">
              {[
                { value: "PARENT", label: "학부모", icon: CheckCircle2 },
                { value: "TEACHER", label: "교사", icon: GraduationCap },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRole(item.value as "PARENT" | "TEACHER")}
                    className={cn(
                      "inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-3.5 text-[13px] font-bold transition-all sm:px-8 sm:text-sm",
                      role === item.value
                        ? "bg-white text-primary shadow-lg shadow-primary/10 border border-primary/10"
                        : "text-text-soft hover:text-text-strong",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", role === item.value ? "text-primary" : "text-text-muted")} />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid w-full gap-5">
            {role === "PARENT" ? (
              <div className="flex flex-col gap-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[color:var(--primary)]" />
                    <div>
                      <p className="text-readable font-display font-medium text-[color:var(--text-strong)]">
                        정확한 학생 및 학부모 정보를 입력해주세요.
                      </p>
                    </div>
                  </div>
                <ParentAccessForm />
              </div>
            ) : (
              <TeacherLoginForm />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
