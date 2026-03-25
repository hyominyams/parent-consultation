"use client";

import { useState, useTransition } from "react";
import {
  CalendarClock,
  CalendarDays,
  Check,
  Lock,
  Unlock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  blockTeacherSlotsAction,
  toggleTeacherDateAvailabilityAction,
  toggleTeacherSlotAction,
} from "@/lib/actions/teacher-actions";
import type { TeacherAvailabilityData } from "@/lib/data/portal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TeacherAvailabilityClientProps = {
  data: TeacherAvailabilityData;
};

type DayItem = TeacherAvailabilityData["weeks"][number]["days"][number];
type SlotItem = DayItem["slots"][number];
type ExpandedBookedSlot = {
  dateKey: string;
  slotId: string;
} | null;

const RESERVATION_CREATED_AT_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function getDayStats(day: DayItem) {
  const openSlots = day.slots.filter((slot) => slot.status === "OPEN");
  const blockedSlots = day.slots.filter((slot) => slot.status === "BLOCKED");
  const bookedSlots = day.slots.filter((slot) => slot.status === "BOOKED");

  return {
    openCount: openSlots.length,
    blockedCount: blockedSlots.length,
    bookedCount: bookedSlots.length,
    modifiableCount: openSlots.length + blockedSlots.length,
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
    if (slot.reservedConsultationType === "PHONE") {
      return {
        label: "예약됨",
        className:
          "border border-emerald-200 bg-emerald-50/90 text-emerald-950 shadow-[0_10px_24px_rgba(5,150,105,0.10)]",
        badgeClassName: "bg-white/90 text-emerald-800 ring-1 ring-emerald-200/70",
        timeClassName: "text-emerald-950",
        subTimeClassName: "text-emerald-700/85",
        hintClassName: "text-emerald-700/90",
      };
    }

    if (slot.reservedConsultationType === "IN_PERSON") {
      return {
        label: "예약됨",
        className:
          "border border-amber-200 bg-amber-50/90 text-amber-950 shadow-[0_10px_24px_rgba(217,119,6,0.10)]",
        badgeClassName: "bg-white/90 text-amber-800 ring-1 ring-amber-200/70",
        timeClassName: "text-amber-950",
        subTimeClassName: "text-amber-700/85",
        hintClassName: "text-amber-700/90",
      };
    }

    return {
      label: "예약됨",
      className:
        "border border-primary/15 bg-primary-container/80 text-primary-dim shadow-[0_10px_24px_rgba(26,95,122,0.08)]",
      badgeClassName: "bg-white/90 text-primary-dim ring-1 ring-primary/10",
      timeClassName: "text-primary-dim",
      subTimeClassName: "text-primary/80",
      hintClassName: "text-primary/80",
    };
  }

  if (slot.status === "BLOCKED") {
    return {
      label: "닫힘",
      className:
        "border border-[color:var(--surface-container-high)] bg-[color:var(--surface-container)] text-[color:var(--text-strong)]",
      badgeClassName: "bg-white/70 text-[color:var(--text-muted)]",
      timeClassName: "text-[color:var(--text-strong)]",
      subTimeClassName: "text-[color:var(--text-muted)]",
    };
  }

  return {
    label: "열림",
    className:
      "border border-[color:var(--surface-container-high)] bg-[color:var(--surface-container-lowest)] text-[color:var(--text-strong)] hover:border-[color:var(--primary)]/25 hover:shadow-[0_12px_30px_rgba(30,57,75,0.08)]",
    badgeClassName: "bg-white/70 text-[color:var(--primary)]",
    timeClassName: "text-[color:var(--text-strong)]",
    subTimeClassName: "text-[color:var(--text-muted)]",
  };
}

function SlotTimeLabel({
  startLabel,
  endLabel,
  timeClassName,
  subTimeClassName,
}: {
  startLabel: string;
  endLabel: string;
  timeClassName?: string;
  subTimeClassName?: string;
}) {
  return (
    <span className="flex min-w-0 flex-col leading-tight">
      <span
        className={cn(
          "truncate whitespace-nowrap text-[0.98rem] font-semibold text-[color:var(--text-strong)]",
          timeClassName,
        )}
      >
        {startLabel}
      </span>
      <span
        className={cn(
          "mt-0.5 truncate whitespace-nowrap text-[12px] font-medium text-[color:var(--text-muted)]",
          subTimeClassName,
        )}
      >
        종료 {endLabel}
      </span>
    </span>
  );
}

function SelectionCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
        checked
          ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-white"
          : "border-[color:var(--surface-container-highest)] bg-white text-transparent",
      )}
    >
      <Check className="h-3.5 w-3.5" />
    </span>
  );
}

function formatReservationCreatedAt(value?: string) {
  if (!value) {
    return "-";
  }

  return `${RESERVATION_CREATED_AT_FORMATTER.format(new Date(value))} 신청`;
}

function BookedSlotDetails({
  day,
  slot,
}: {
  day: DayItem;
  slot: SlotItem;
}) {
  const consultationLabel =
    slot.reservedConsultationType === "PHONE"
      ? "전화 상담"
      : slot.reservedConsultationType === "IN_PERSON"
        ? "대면 상담"
        : "-";

  return (
    <div className="mt-3 rounded-[1.35rem] border border-[color:var(--surface-container-high)] bg-white/90 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--text-strong)]">
        <CalendarDays className="h-4 w-4 text-[color:var(--primary)]" />
        신청자 정보
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[color:var(--surface-container-low)] px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
            학생
          </p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--text-strong)]">
            {slot.reservedStudentName ?? "-"}
          </p>
        </div>
        <div className="rounded-xl bg-[color:var(--surface-container-low)] px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
            학부모
          </p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--text-strong)]">
            {slot.reservedParentName ?? "-"}
          </p>
        </div>
        <div className="rounded-xl bg-[color:var(--surface-container-low)] px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
            연락처
          </p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--text-strong)]">
            {slot.reservedPhone ?? "-"}
          </p>
        </div>
        <div className="rounded-xl bg-[color:var(--surface-container-low)] px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
            상담 방식
          </p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--text-strong)]">
            {consultationLabel}
          </p>
        </div>
        <div className="rounded-xl bg-[color:var(--surface-container-low)] px-4 py-3 sm:col-span-2">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
            상담 일시 / 신청 시각
          </p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--text-strong)]">
            {day.fullLabel} {slot.startLabel} - {slot.endLabel}
          </p>
          <p className="mt-1 text-sm text-[color:var(--text-soft)]">
            {formatReservationCreatedAt(slot.reservationCreatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TeacherAvailabilityClient({ data }: TeacherAvailabilityClientProps) {
  const router = useRouter();
  const [selectedWeekKey, setSelectedWeekKey] = useState(data.weeks[0]?.weekKey ?? "");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [selectedOpenSlotsByDate, setSelectedOpenSlotsByDate] = useState<Record<string, string[]>>({});
  const [expandedBookedSlot, setExpandedBookedSlot] = useState<ExpandedBookedSlot>(null);
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

  function handleOpenSlotSelect(dateKey: string, slotId: string) {
    setSelectedOpenSlotsByDate((current) => {
      const currentIds = current[dateKey] ?? [];
      const nextIds = currentIds.includes(slotId)
        ? currentIds.filter((id) => id !== slotId)
        : [...currentIds, slotId];

      if (nextIds.length === 0) {
        const next = { ...current };
        delete next[dateKey];
        return next;
      }

      return {
        ...current,
        [dateKey]: nextIds,
      };
    });
  }

  function handleBookedSlotClick(dateKey: string, slotId: string) {
    setExpandedBookedSlot((current) =>
      current?.dateKey === dateKey && current.slotId === slotId ? null : { dateKey, slotId },
    );
  }

  function clearSelectedOpenSlots(dateKey: string) {
    setSelectedOpenSlotsByDate((current) => {
      const next = { ...current };
      delete next[dateKey];
      return next;
    });
  }

  function handleBatchBlock(dateKey: string, slotIds: string[]) {
    setPendingKey(`batch:${dateKey}`);

    startTransition(async () => {
      try {
        const result = await blockTeacherSlotsAction(slotIds);
        announce(result.message, result.status === "error");

        if (result.status !== "error") {
          clearSelectedOpenSlots(dateKey);
        }

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
                Schedule
              </Badge>
              <h2 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                날짜별 일정 관리/확인
              </h2>
              <p className="mt-3 text-sm leading-6 text-[color:var(--text-soft)]">
                열린 시간은 체크해서 여러 개를 한 번에 닫을 수 있고, 닫힌 시간은 다시 열 수 있습니다.
                예약된 시간은 클릭하면 신청자 정보를 바로 확인할 수 있습니다.
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
                    ? "bg-[color:var(--primary)] !text-white"
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
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))]">
          {selectedDays.map((day) => {
            const stats = getDayStats(day);
            const canToggle = stats.modifiableCount > 0;
            const shouldOpen = stats.openCount === 0 && stats.blockedCount > 0;
            const statusBadge = getDayStatus(stats);
            const selectedOpenSlotIds = (selectedOpenSlotsByDate[day.dateKey] ?? []).filter((slotId) =>
              day.slots.some((slot) => slot.id === slotId && slot.status === "OPEN")
            );
            const selectedOpenCount = selectedOpenSlotIds.length;
            const DayActionIcon = shouldOpen ? Unlock : Lock;

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

                <div className="mt-4 space-y-2">
                  {day.slots.map((slot) => {
                    const slotTone = getSlotTone(slot);
                    const isBooked = slot.status === "BOOKED";
                    const isSelectedOpen = selectedOpenSlotIds.includes(slot.id);
                    const isExpandedBooked =
                      expandedBookedSlot?.dateKey === day.dateKey && expandedBookedSlot.slotId === slot.id;

                    if (isBooked) {
                      return (
                        <div key={slot.id}>
                          <button
                            type="button"
                            onClick={() => handleBookedSlotClick(day.dateKey, slot.id)}
                            className={cn(
                              "w-full rounded-xl px-4 py-3 text-left transition-all",
                              slotTone.className,
                              isExpandedBooked && "ring-2 ring-[color:var(--primary)]/15",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <SlotTimeLabel
                                startLabel={slot.startLabel}
                                endLabel={slot.endLabel}
                                timeClassName={slotTone.timeClassName}
                                subTimeClassName={slotTone.subTimeClassName}
                              />
                              <div className="flex min-w-0 flex-col items-end gap-2">
                                <span
                                  className={cn(
                                    "max-w-full shrink-0 truncate rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                    slotTone.badgeClassName,
                                  )}
                                >
                                  {slot.reservedStudentName ?? slotTone.label}
                                </span>
                              </div>
                            </div>
                            <p
                              className={cn(
                                "mt-3 text-[12px] font-medium",
                                slotTone.hintClassName ?? "text-primary/80",
                              )}
                            >
                              {isExpandedBooked ? "신청자 정보 접기" : "클릭해 신청자 정보 확인"}
                            </p>
                          </button>
                          {isExpandedBooked ? <BookedSlotDetails day={day} slot={slot} /> : null}
                        </div>
                      );
                    }

                    if (slot.status === "BLOCKED") {
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => handleToggleSlot(slot.id)}
                          disabled={pending}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-all disabled:opacity-60",
                            slotTone.className,
                          )}
                        >
                          <SlotTimeLabel
                            startLabel={slot.startLabel}
                            endLabel={slot.endLabel}
                            timeClassName={slotTone.timeClassName}
                            subTimeClassName={slotTone.subTimeClassName}
                          />
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              slotTone.badgeClassName,
                            )}
                          >
                            {pendingKey === `slot:${slot.id}` ? "처리 중..." : "다시 열기"}
                          </span>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => handleOpenSlotSelect(day.dateKey, slot.id)}
                        disabled={pending}
                        className={cn(
                          "grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all disabled:opacity-60",
                          slotTone.className,
                          isSelectedOpen && "border-[color:var(--primary)]/30 bg-[color:var(--primary-container)]/30",
                        )}
                      >
                        <SelectionCheckbox checked={isSelectedOpen} />
                        <SlotTimeLabel
                          startLabel={slot.startLabel}
                          endLabel={slot.endLabel}
                          timeClassName={slotTone.timeClassName}
                          subTimeClassName={slotTone.subTimeClassName}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 border-t border-[color:var(--surface-container-high)] pt-4">
                  {selectedOpenCount > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => handleBatchBlock(day.dateKey, selectedOpenSlotIds)}
                      disabled={pending}
                      className="h-auto min-h-10 w-full rounded-xl px-4 py-2 whitespace-normal"
                    >
                      <span className="grid w-full grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-2">
                        <Lock aria-hidden="true" className="pointer-events-none h-4 w-4 shrink-0" />
                        <span className="text-center leading-tight break-keep">
                          {pendingKey === `batch:${day.dateKey}` ? "닫는 중..." : "체크한 시간대 닫기"}
                        </span>
                        <span className="text-xs font-semibold">{selectedOpenCount}개</span>
                      </span>
                    </Button>
                  ) : canToggle && shouldOpen ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => handleToggleDate(day.dateKey)}
                      disabled={pending}
                      className="h-auto min-h-10 w-full rounded-xl px-4 py-2 whitespace-normal"
                    >
                      <span className="grid w-full grid-cols-[1rem_minmax(0,1fr)_1rem] items-center gap-2">
                        <DayActionIcon aria-hidden="true" className="pointer-events-none h-4 w-4 shrink-0" />
                        <span className="text-center leading-tight break-keep">
                          {pendingKey === `date:${day.dateKey}` ? "처리 중..." : "이 날짜 다시 열기"}
                        </span>
                        <span aria-hidden="true" className="h-4 w-4 shrink-0" />
                      </span>
                    </Button>
                  ) : canToggle ? (
                    <div className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--surface-container-low)] px-3 py-3 text-sm text-[color:var(--text-soft)]">
                      <CalendarClock className="h-4 w-4" />
                      열린 시간을 체크해 한 번에 닫을 수 있습니다.
                    </div>
                  ) : (
                    <div className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--surface-container-low)] px-3 py-3 text-sm text-[color:var(--text-soft)]">
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
