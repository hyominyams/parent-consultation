"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  CalendarRange,
  CheckCheck,
  Settings2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  markAllTeacherNotificationsReadAction,
  markTeacherNotificationReadAction,
} from "@/lib/actions/teacher-actions";
import type { TeacherDashboardData } from "@/lib/data/portal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatFullDate } from "@/lib/utils";

type TeacherDashboardClientProps = {
  data: TeacherDashboardData;
};

const QUICK_LINKS = [
  {
    href: "/teacher/availability",
    title: "일정 관리/확인",
    summary: "시간대를 조정하고 예약된 신청자 정보도 함께 확인합니다.",
    icon: CalendarClock,
    cta: "일정 관리/확인 열기",
  },
  {
    href: "/teacher/settings",
    title: "상담 설정",
    summary: "시간 간격과 운영 시간을 주차별로 조정합니다.",
    icon: Settings2,
    cta: "설정 열기",
  },
] as const;

function SummaryTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[color:var(--surface-container-high)] bg-[color:var(--surface-container-lowest)] px-5 py-5">
      <p className="text-sm font-semibold text-[color:var(--text-muted)]">{label}</p>
      <p className="mt-3 font-display text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-soft)]">{helper}</p>
    </div>
  );
}

export function TeacherDashboardClient({ data }: TeacherDashboardClientProps) {
  const router = useRouter();
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totals = data.summary.reduce(
    (acc, item) => ({
      booked: acc.booked + item.booked,
      open: acc.open + item.open,
      blocked: acc.blocked + item.blocked,
    }),
    {
      booked: 0,
      open: 0,
      blocked: 0,
    },
  );

  const latestNotifications = data.notifications.slice(0, 3);

  function announce(message?: string, isError?: boolean) {
    if (!message) {
      return;
    }

    if (isError) {
      toast.error(message);
      return;
    }

    toast.success(message);
  }

  function handleNotificationRead(notificationId: string) {
    setPendingTarget(notificationId);

    startTransition(async () => {
      try {
        const result = await markTeacherNotificationReadAction(notificationId);
        announce(result.message, result.status === "error");
        router.refresh();
      } finally {
        setPendingTarget(null);
      }
    });
  }

  function handleAllNotificationsRead() {
    setPendingTarget("all");

    startTransition(async () => {
      try {
        const result = await markAllTeacherNotificationsReadAction();
        announce(result.message, result.status === "error");
        router.refresh();
      } finally {
        setPendingTarget(null);
      }
    });
  }

  return (
    <div className="grid gap-4">
      <Card className="overflow-hidden border border-black/5 bg-white p-0 shadow-[0_20px_60px_rgba(30,57,75,0.06)]">
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <Badge variant="primary" className="rounded-full px-4 py-1.5 font-bold tracking-[0.16em] uppercase">
                Overview
              </Badge>
              <h2 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)] sm:text-4xl">
                오늘 확인할 항목
              </h2>
              <p className="mt-3 text-sm leading-6 text-[color:var(--text-soft)]">
                새 알림과 예약 현황을 먼저 확인하고, 일정 관리나 상담 설정 화면으로 바로 이동할 수
                있습니다.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="rounded-xl px-5 text-base !text-white [&_svg]:!text-white">
                <Link href="/teacher/availability">
                  <CalendarRange className="h-[18px] w-[18px]" />
                  일정 관리/확인
                </Link>
              </Button>
              <Button asChild variant="soft" className="rounded-xl px-5 text-base">
                <Link href="/teacher/settings">
                  <Settings2 className="h-[18px] w-[18px]" />
                  상담 설정
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              label="읽지 않은 알림"
              value={`${data.unreadCount}건`}
              helper="새 예약과 변경 사항을 확인합니다."
            />
            <SummaryTile
              label="예약 완료"
              value={`${totals.booked}건`}
              helper="이미 신청이 완료된 상담입니다."
            />
            <SummaryTile
              label="신청 가능"
              value={`${totals.open}개`}
              helper="학부모가 현재 선택할 수 있는 시간입니다."
            />
            <SummaryTile
              label="신청 불가"
              value={`${totals.blocked}개`}
              helper="직접 닫아 둔 시간입니다."
            />
          </div>
        </div>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <Card className="border border-black/5 bg-white p-6 shadow-[0_20px_60px_rgba(30,57,75,0.06)] sm:p-7">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">
            바로 이동
          </h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
            자주 사용하는 관리 화면으로 빠르게 이동할 수 있습니다.
          </p>

          <div className="mt-5 grid gap-3">
            {QUICK_LINKS.map((linkItem) => {
              const Icon = linkItem.icon;

              return (
                <Link
                  key={linkItem.href}
                  href={linkItem.href}
                  className="rounded-[1.5rem] border border-[color:var(--surface-container-high)] bg-[color:var(--surface-container-lowest)] p-5 transition-all hover:-translate-y-0.5 hover:border-[color:var(--primary)]/20 hover:shadow-[0_16px_36px_rgba(30,57,75,0.08)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--text-muted)]">{linkItem.title}</p>
                      <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">
                        {linkItem.summary}
                      </h3>
                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--primary)]">
                        {linkItem.cta}
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="rounded-full bg-[color:var(--primary-container)] p-3 text-[color:var(--primary)]">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card className="border border-black/5 bg-white p-6 shadow-[0_20px_60px_rgba(30,57,75,0.06)] sm:p-7">
          <div className="flex flex-col gap-4 border-b border-[color:var(--surface-container-high)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">
                최근 알림
              </h2>
              <p className="mt-2 text-sm text-[color:var(--text-soft)]">
                최근 알림 3건을 먼저 확인할 수 있습니다.
              </p>
            </div>
            <Button
              type="button"
              variant="soft"
              size="sm"
              onClick={handleAllNotificationsRead}
              disabled={pending || data.unreadCount === 0}
              className="rounded-full"
            >
              <CheckCheck className="h-4 w-4" />
              전체 읽음
            </Button>
          </div>

          {latestNotifications.length === 0 ? (
            <div className="py-8 text-sm text-[color:var(--text-soft)]">표시할 알림이 없습니다.</div>
          ) : (
            <div className="mt-5 grid gap-3">
              {latestNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "rounded-[1.35rem] border px-4 py-4 sm:px-5",
                    notification.isRead
                      ? "border-[color:var(--surface-container-high)] bg-[color:var(--surface-container-lowest)]"
                      : "border-[color:var(--primary)]/12 bg-[color:var(--primary-container)]/35",
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-[color:var(--text-strong)]">
                          {notification.title}
                        </p>
                        {notification.isRead ? (
                          <Badge variant="muted">읽음</Badge>
                        ) : (
                          <Badge variant="booked">새 알림</Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
                        {notification.message}
                      </p>
                      <p className="mt-3 text-xs font-medium text-[color:var(--text-muted)]">
                        {notification.scheduleLabel ?? formatFullDate(notification.createdAt)}
                      </p>
                    </div>

                    {!notification.isRead ? (
                      <Button
                        type="button"
                        variant="soft"
                        size="sm"
                        onClick={() => handleNotificationRead(notification.id)}
                        disabled={pending && pendingTarget === notification.id}
                        className="rounded-full"
                      >
                        <Bell className="h-4 w-4" />
                        읽음 처리
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
