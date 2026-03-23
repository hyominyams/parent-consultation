"use client";

import { useState, useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";
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

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-[color:var(--surface-container-high)] bg-white p-5">
      <p className="text-sm font-medium text-[color:var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">{description}</p>
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
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="읽지 않은 알림"
          value={`${data.unreadCount}건`}
          description="새 신청이나 변경 요청을 우선 확인할 수 있습니다."
        />
        <MetricCard
          label="확정 예약"
          value={`${totals.booked}건`}
          description="현재까지 예약된 상담 수입니다."
        />
        <MetricCard
          label="신청 가능 슬롯"
          value={`${totals.open}개`}
          description="학부모가 지금 선택할 수 있는 시간입니다."
        />
        <MetricCard
          label="닫아 둔 슬롯"
          value={`${totals.blocked}개`}
          description="교사 화면에서 직접 막아 둔 시간입니다."
        />
      </section>

      <Card className="border border-black/5 bg-white p-6 shadow-[0_18px_48px_rgba(30,57,75,0.06)] sm:p-7">
        <div className="flex flex-col gap-4 border-b border-[color:var(--surface-container-high)] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">알림 내역</h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
              최근 예약과 변경 알림만 먼저 모아 보여줍니다.
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

        {data.notifications.length === 0 ? (
          <div className="py-8 text-sm leading-6 text-[color:var(--text-soft)]">
            확인할 새 알림이 없습니다.
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {data.notifications.map((notification) => (
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
                      읽음 처리
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="border border-black/5 bg-white p-6 shadow-[0_18px_48px_rgba(30,57,75,0.06)] sm:p-7">
        <div className="flex items-start gap-3 border-b border-[color:var(--surface-container-high)] pb-5">
          <div className="mt-0.5 rounded-full bg-[color:var(--surface-container-low)] p-2 text-[color:var(--primary)]">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">날짜별 현황</h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
              날짜마다 예약, 신청 가능, 닫힘 상태를 한 줄씩 확인할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="mt-3 divide-y divide-[color:var(--surface-container-high)]">
          {data.summary.map((item) => {
            const statusBadge =
              item.open === 0 && item.blocked > 0
                ? { label: "닫힘 중심", variant: "blocked" as const }
                : item.booked > 0
                  ? { label: "예약 있음", variant: "booked" as const }
                  : { label: "신청 가능", variant: "muted" as const };

            return (
              <div key={item.dateKey} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-[color:var(--text-strong)]">{item.label}</p>
                    <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--text-soft)]">총 {item.total}개 슬롯</p>
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-[color:var(--surface-container-low)] px-3 py-2 text-[color:var(--text-soft)]">
                    예약 {item.booked}
                  </span>
                  <span className="rounded-full bg-[color:var(--surface-container-low)] px-3 py-2 text-[color:var(--text-soft)]">
                    가능 {item.open}
                  </span>
                  <span className="rounded-full bg-[color:var(--surface-container-low)] px-3 py-2 text-[color:var(--text-soft)]">
                    불가 {item.blocked}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
