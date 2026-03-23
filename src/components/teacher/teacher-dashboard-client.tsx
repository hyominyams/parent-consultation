"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bell, CalendarClock, CheckCheck, Settings2 } from "lucide-react";
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

const ROUTE_CARDS = [
  {
    href: "/teacher/settings",
    title: "상담 설정",
    summary: "시간 간격 / 시작 / 종료",
    icon: Settings2,
  },
  {
    href: "/teacher/availability",
    title: "날짜 조정",
    summary: "불가 날짜 / 다시 열기",
    icon: CalendarClock,
  },
] as const;

function SummaryTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.35rem] bg-white/12 px-4 py-4 text-white">
      <p className="text-sm text-white/72">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{value}</p>
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
      <Card className="overflow-hidden border border-[color:var(--primary)]/20 bg-gradient-to-br from-[color:var(--primary)] via-[color:var(--primary)] to-[color:var(--primary-dim)] p-6 text-white shadow-[0_18px_48px_rgba(30,57,75,0.14)] sm:p-7">
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold text-white/74">운영 요약</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">오늘 확인할 항목</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile label="새 알림" value={`${data.unreadCount}건`} />
            <SummaryTile label="예약" value={`${totals.booked}건`} />
            <SummaryTile label="열림" value={`${totals.open}개`} />
          </div>
        </div>
      </Card>

      <section className="grid gap-3 md:grid-cols-2">
        {ROUTE_CARDS.map((route) => {
          const Icon = route.icon;

          return (
            <Link
              key={route.href}
              href={route.href}
              className="rounded-[1.5rem] bg-gradient-to-br from-[color:var(--primary)] to-[color:var(--primary-dim)] p-6 text-white shadow-[0_18px_42px_rgba(30,57,75,0.14)] transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white/74">바로 이동</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{route.title}</h3>
                  <p className="mt-2 text-sm text-white/78">{route.summary}</p>
                </div>
                <div className="rounded-full bg-white/12 p-3">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      <Card className="border border-black/5 bg-white p-6 shadow-[0_18px_48px_rgba(30,57,75,0.06)] sm:p-7">
        <div className="flex flex-col gap-4 border-b border-[color:var(--surface-container-high)] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">최근 알림</h2>
            <p className="mt-2 text-sm text-[color:var(--text-soft)]">최근 3건</p>
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
                      {formatFullDate(new Date(notification.createdAt))}
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
    </div>
  );
}
