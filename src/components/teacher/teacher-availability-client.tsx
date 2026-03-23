"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Lock, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  toggleTeacherDateAvailabilityAction,
  toggleTeacherSlotAction,
} from "@/lib/actions/teacher-actions";
import type { TeacherDashboardData } from "@/lib/data/portal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TeacherAvailabilityClientProps = {
  data: TeacherDashboardData;
};

type DayItem = TeacherDashboardData["weeks"][number]["days"][number];
type SlotItem = DayItem["slots"][number];

function getDayStats(day: DayItem) {
  const openSlots = day.slots.filter((slot) => slot.status === "OPEN");
  const blockedSlots = day.slots.filter((slot) => slot.status === "BLOCKED");
  const bookedSlots = day.slots.filter((slot) => slot.status === "BOOKED");

  return {
    openCount: openSlots.length,
    blockedCount: blockedSlots.length,
    bookedCount: bookedSlots.length,
    modifiableCount: openSlots.length + blockedSlots.length,
    bookedTimes: bookedSlots.map((slot) => `${slot.startLabel}-${slot.endLabel}`),
    totalCount: day.slots.length,
  };
}

function getDayStatus(stats: ReturnType<typeof getDayStats>) {
  if (stats.openCount === 0 && stats.blockedCount > 0 && stats.bookedCount === 0) {
    return { label: "완전히 닫힘", variant: "blocked" as const };
  }

  if (stats.openCount === 0 && stats.bookedCount > 0 && stats.blockedCount === 0) {
    return { label: "예약만 남음", variant: "booked" as const };
  }

  if (stats.blockedCount > 0) {
    return { label: "일부 닫힘", variant: "blocked" as const };
  }

  return { label: "신청 가능", variant: "muted" as const };
}

function getSlotTone(slot: SlotItem) {
  if (slot.status === "BOOKED") {
    return {
      label: "예약됨",
      className:
        "border border-primary/10 bg-[color:var(--primary-container)]/55 text-[color:var(--text-strong)] opacity-85",
    };
  }

  if (slot.status === "BLOCKED") {
    return {
      label: "닫힘",
      className:
        "border border-[color:var(--surface-container-high)] bg-[color:var(--surface-container)] text-[color:var(--text-strong)]",
    };
  }

  return {
    label: "열림",
    className:
      "border border-[color:var(--surface-container-high)] bg-[color:var(--surface-container-lowest)] text-[color:var(--text-strong)] hover:border-[color:var(--primary)]/25 hover:shadow-[0_12px_30px_rgba(30,57,75,0.08)]",
  };
}

export function TeacherAvailabilityClient({ data }: TeacherAvailabilityClientProps) {
  const router = useRouter();
  const [selectedWeekKey, setSelectedWeekKey] = useState(data.weeks[0]?.weekKey ?? "");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
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
    setPendingKey(`date:${dateKey}`);

    startTransition(async () => {
      try {
        const result = await toggleTeacherDateAvailabilityAction(dateKey);
        announce(result.message, result.status === "error");
        router.refresh();
      } finally {
        setPendingKey(null);
      }
    });
  }

  function handleToggleSlot(slotId: string) {
    setPendingKey(`slot:${slotId}`);

    startTransition(async () => {
      try {
        const result = await toggleTeacherSlotAction(slotId);
        announce(result.message, result.status === "error");
        router.refresh();
      } finally {
        setPendingKey(null);
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
                Availability
              </Badge>
              <h2 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                날짜별, 시간대별 일정 관리
              </h2>
              <p className="mt-3 text-sm leading-6 text-[color:var(--text-soft)]">
                날짜 전체를 닫거나 다시 열 수 있고, 개별 시간도 직접 열고 닫을 수 있습니다. 이미
                예약된 시간은 변경되지 않습니다.
              </p>
            </div>

            {selectedWeek ? (
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[color:var(--surface-container-low)] px-4 py-2 text-sm font-semibold text-[color:var(--text-soft)]">
                  기간 {selectedWeek.description}
                </span>
                <span className="rounded-full bg-[color:var(--surface-container-low)] px-4 py-2 text-sm font-semibold text-[color:var(--text-soft)]">
                  전체 날짜 {selectedDays.length}일
                </span>
                <span className="rounded-full bg-[color:var(--surface-container-low)] px-4 py-2 text-sm font-semibold text-[color:var(--text-soft)]">
                  완전히 닫힘 {fullyBlockedDates}일
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {data.weeks.map((week) => (
              <button
                key={week.weekKey}
                type="button"
                onClick={() => setSelectedWeekKey(week.weekKey)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  selectedWeekKey === week.weekKey
                    ? "bg-[color:var(--primary)] text-white"
                    : "bg-[color:var(--surface-container-low)] text-[color:var(--text-soft)] hover:text-[color:var(--text-strong)]",
                )}
              >
                {week.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {selectedDays.length === 0 ? (
        <Card className="border border-black/5 bg-white p-6 shadow-[0_20px_60px_rgba(30,57,75,0.06)] sm:p-7">
          <p className="text-sm leading-6 text-[color:var(--text-soft)]">조정할 날짜 정보가 없습니다.</p>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-5">
          {selectedDays.map((day) => {
            const stats = getDayStats(day);
            const canToggle = stats.modifiableCount > 0;
            const shouldOpen = stats.openCount === 0 && stats.blockedCount > 0;
            const statusBadge = getDayStatus(stats);

            return (
              <Card
                key={day.dateKey}
                className="border border-black/5 bg-white p-5 shadow-[0_20px_60px_rgba(30,57,75,0.06)]"
              >
                <div className="border-b border-[color:var(--surface-container-high)] pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
                        {day.weekdayLabel}
                      </p>
                      <p className="mt-2 font-display text-4xl font-extrabold text-[color:var(--text-strong)]">
                        {day.dayNumber}
                      </p>
                    </div>
                    <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-[color:var(--text-soft)]">{day.fullLabel}</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {day.slots.map((slot) => {
                    const slotTone = getSlotTone(slot);
                    const isBooked = slot.status === "BOOKED";

                    return isBooked ? (
                      <div
                        key={slot.id}
                        className={cn(
                          "rounded-[1.15rem] px-3 py-3 text-left",
                          slotTone.className,
                        )}
                      >
                        <p className="text-sm font-semibold">{slot.startLabel}</p>
                        <p className="mt-1 text-[11px] text-[color:var(--text-soft)]">{slot.endLabel} 종료</p>
                        <p className="mt-2 text-[11px] font-semibold text-[color:var(--primary)]">
                          {slot.reservedStudentName ?? slotTone.label}
                        </p>
                      </div>
                    ) : (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => handleToggleSlot(slot.id)}
                        disabled={pending}
                        className={cn(
                          "rounded-[1.15rem] px-3 py-3 text-left transition-all disabled:opacity-60",
                          slotTone.className,
                        )}
                      >
                        <p className="text-sm font-semibold">{slot.startLabel}</p>
                        <p className="mt-1 text-[11px] text-[color:var(--text-soft)]">{slot.endLabel} 종료</p>
                        <p className="mt-2 text-[11px] font-semibold text-[color:var(--primary)]">
                          {pendingKey === `slot:${slot.id}` ? "처리 중..." : slotTone.label}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
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

                <div className="mt-4 border-t border-[color:var(--surface-container-high)] pt-4">
                  <p className="text-sm leading-6 text-[color:var(--text-soft)]">
                    {stats.bookedTimes.length > 0
                      ? `예약된 시간: ${stats.bookedTimes.join(", ")}`
                      : "예약된 시간이 없습니다."}
                  </p>

                  {canToggle ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={shouldOpen ? "primary" : "danger"}
                      onClick={() => handleToggleDate(day.dateKey)}
                      disabled={pending}
                      className="mt-3 w-full rounded-xl"
                    >
                      {shouldOpen ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      {pendingKey === `date:${day.dateKey}`
                        ? "처리 중..."
                        : shouldOpen
                          ? "이 날짜 다시 열기"
                          : "남은 시간 전체 닫기"}
                    </Button>
                  ) : (
                    <div className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--surface-container-low)] px-3 py-3 text-sm text-[color:var(--text-soft)]">
                      <CalendarClock className="h-4 w-4" />
                      변경 가능한 시간이 없습니다.
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
