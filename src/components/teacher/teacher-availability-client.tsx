"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Lock, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { toggleTeacherDateAvailabilityAction } from "@/lib/actions/teacher-actions";
import type { TeacherDashboardData } from "@/lib/data/portal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TeacherAvailabilityClientProps = {
  data: TeacherDashboardData;
};

type DayItem = TeacherDashboardData["weeks"][number]["days"][number];

function getDayStats(day: DayItem) {
  const openSlots = day.slots.filter((slot) => slot.status === "OPEN");
  const blockedSlots = day.slots.filter((slot) => slot.status === "BLOCKED");
  const bookedSlots = day.slots.filter((slot) => slot.status === "BOOKED");

  return {
    openCount: openSlots.length,
    blockedCount: blockedSlots.length,
    bookedCount: bookedSlots.length,
    bookedTimes: bookedSlots.map((slot) => `${slot.startLabel}-${slot.endLabel}`),
    totalCount: day.slots.length,
  };
}

export function TeacherAvailabilityClient({ data }: TeacherAvailabilityClientProps) {
  const router = useRouter();
  const [selectedWeekKey, setSelectedWeekKey] = useState(data.weeks[0]?.weekKey ?? "");
  const [pendingDateKey, setPendingDateKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedWeek = data.weeks.find((week) => week.weekKey === selectedWeekKey) ?? data.weeks[0] ?? null;
  const selectedDays = selectedWeek?.days ?? [];
  const fullyBlockedDates = selectedDays.filter((day) => {
    const stats = getDayStats(day);
    return stats.openCount === 0 && stats.blockedCount > 0 && stats.bookedCount === 0;
  }).length;

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

  function handleToggleDate(dateKey: string) {
    setPendingDateKey(dateKey);

    startTransition(async () => {
      try {
        const result = await toggleTeacherDateAvailabilityAction(dateKey);
        announce(result.message, result.status === "error");
        router.refresh();
      } finally {
        setPendingDateKey(null);
      }
    });
  }

  return (
    <div className="grid gap-4">
      <Card className="border border-[color:var(--primary)]/20 bg-gradient-to-br from-[color:var(--primary)] via-[color:var(--primary)] to-[color:var(--primary-dim)] p-6 text-white shadow-[0_18px_48px_rgba(30,57,75,0.14)] sm:p-7">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">날짜별 상태 조정</h2>
            <p className="mt-2 text-sm leading-6 text-white/78">불가 날짜 지정 / 다시 열기</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {data.weeks.map((week) => (
              <button
                key={week.weekKey}
                type="button"
                onClick={() => setSelectedWeekKey(week.weekKey)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  selectedWeekKey === week.weekKey
                    ? "bg-white text-[color:var(--primary)]"
                    : "bg-white/10 text-white hover:bg-white/18",
                )}
              >
                {week.label}
              </button>
            ))}
          </div>

          {selectedWeek ? (
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-white/12 px-3 py-2 text-white">
                기간 {selectedWeek.description}
              </span>
              <span className="rounded-full bg-white/12 px-3 py-2 text-white">
                전체 날짜 {selectedDays.length}일
              </span>
              <span className="rounded-full bg-white/12 px-3 py-2 text-white">
                완전히 닫힘 {fullyBlockedDates}일
              </span>
            </div>
          ) : null}
        </div>
      </Card>

      {selectedDays.length === 0 ? (
        <Card className="border border-black/5 bg-white p-6 shadow-[0_18px_48px_rgba(30,57,75,0.06)] sm:p-7">
          <p className="text-sm leading-6 text-[color:var(--text-soft)]">조정할 날짜 정보가 없습니다.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {selectedDays.map((day) => {
            const stats = getDayStats(day);
            const onlyBooked = stats.openCount === 0 && stats.blockedCount === 0 && stats.bookedCount > 0;
            const canToggle = stats.openCount + stats.blockedCount > 0;
            const shouldOpen = stats.openCount === 0 && stats.blockedCount > 0;
            const actionLabel = shouldOpen
              ? "다시 열기"
              : stats.bookedCount > 0
                ? "남은 시간 닫기"
                : "이 날짜 닫기";
            const statusBadge =
              stats.openCount === 0 && stats.blockedCount > 0 && stats.bookedCount === 0
                ? { label: "완전히 닫힘", variant: "blocked" as const }
                : stats.openCount === 0 && stats.bookedCount > 0
                  ? { label: "예약만 남음", variant: "booked" as const }
                  : stats.blockedCount > 0
                    ? { label: "일부 닫힘", variant: "blocked" as const }
                    : { label: "신청 가능", variant: "muted" as const };

            return (
              <Card
                key={day.dateKey}
                className="border border-black/5 bg-white p-6 shadow-[0_18px_48px_rgba(30,57,75,0.06)] sm:p-7"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-[color:var(--text-strong)]">{day.fullLabel}</h3>
                      <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <span className="rounded-full bg-[color:var(--surface-container-low)] px-3 py-2 text-[color:var(--text-soft)]">
                        총 슬롯 {stats.totalCount}개
                      </span>
                      <span className="rounded-full bg-[color:var(--surface-container-low)] px-3 py-2 text-[color:var(--text-soft)]">
                        예약 {stats.bookedCount}
                      </span>
                      <span className="rounded-full bg-[color:var(--surface-container-low)] px-3 py-2 text-[color:var(--text-soft)]">
                        가능 {stats.openCount}
                      </span>
                      <span className="rounded-full bg-[color:var(--surface-container-low)] px-3 py-2 text-[color:var(--text-soft)]">
                        불가 {stats.blockedCount}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-[color:var(--text-soft)]">
                      {stats.bookedTimes.length > 0
                        ? `예약된 시간: ${stats.bookedTimes.join(", ")}`
                        : "예약 없음"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--text-soft)]">
                      {onlyBooked
                        ? "예약만 남아 변경 불가"
                        : shouldOpen
                          ? "닫힌 시간 다시 열기"
                          : "남은 시간 전체 닫기"}
                    </p>
                  </div>

                  {canToggle ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={shouldOpen ? "primary" : "danger"}
                      onClick={() => handleToggleDate(day.dateKey)}
                      disabled={pending && pendingDateKey === day.dateKey}
                      className="rounded-full"
                    >
                      {shouldOpen ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      {actionLabel}
                    </Button>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--surface-container-low)] px-3 py-2 text-sm text-[color:var(--text-soft)]">
                      <CalendarClock className="h-4 w-4" />
                      변경 불가
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
