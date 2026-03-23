"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { bookReservationAction } from "@/lib/actions/reservation-actions";
import type { ParentCalendarData } from "@/lib/data/portal";
import { BLOCKED_SLOT_MESSAGE, TAKEN_SLOT_MESSAGE } from "@/lib/reservations";
import { cn } from "@/lib/utils";

type ReservationBookingClientProps = {
  data: ParentCalendarData;
};

type ReservationWeek = ParentCalendarData["weeks"][number];
type ReservationDay = ReservationWeek["days"][number];
type ReservationSlot = ReservationDay["slots"][number];
type SelectedReservationSlot = ReservationSlot & { fullLabel: string };
type ConsultationType = "PHONE" | "IN_PERSON";

const CTA_WHEEL_MAX_OFFSET = 36;
const CTA_WHEEL_MAX_VELOCITY = 6;
const CTA_WHEEL_ACCELERATION = 0.012;
const CTA_WHEEL_DAMPING = 0.84;
const CTA_WHEEL_RECENTERING = 0.92;
const SLOT_SYNC_INTERVAL_MS = 2000;
const SUCCESS_REDIRECT_DELAY_MS = 5000;
const SUCCESS_COUNTDOWN_STEPS = [5, 4, 3, 2, 1] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isUnavailableSlot(slot: ReservationSlot) {
  return slot.status === "BOOKED" || slot.status === "BLOCKED" || Boolean(slot.reservedStudentName);
}

function getOpenCount(day: ReservationDay) {
  return day.slots.filter((slot) => !isUnavailableSlot(slot)).length;
}

function useWheelReactiveCtaMotion(enabled: boolean) {
  const [offset, setOffset] = useState(0);
  const frameRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const desktopViewport = window.matchMedia("(min-width: 1024px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    lastScrollYRef.current = window.scrollY;

    const reset = () => {
      offsetRef.current = 0;
      velocityRef.current = 0;
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      setOffset(0);
    };

    const animate = () => {
      velocityRef.current *= CTA_WHEEL_DAMPING;
      offsetRef.current = clamp(
        (offsetRef.current + velocityRef.current) * CTA_WHEEL_RECENTERING,
        -CTA_WHEEL_MAX_OFFSET,
        CTA_WHEEL_MAX_OFFSET,
      );

      if (Math.abs(offsetRef.current) < 0.1 && Math.abs(velocityRef.current) < 0.1) {
        reset();
        return;
      }

      setOffset(offsetRef.current);
      frameRef.current = window.requestAnimationFrame(animate);
    };

    const applyDelta = (deltaY: number) => {
      if (!desktopViewport.matches || reducedMotion.matches) {
        reset();
        return;
      }

      if (deltaY === 0) {
        return;
      }

      velocityRef.current = clamp(
        velocityRef.current + deltaY * CTA_WHEEL_ACCELERATION,
        -CTA_WHEEL_MAX_VELOCITY,
        CTA_WHEEL_MAX_VELOCITY,
      );

      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(animate);
      }
    };

    const handleScroll = () => {
      const nextScrollY = window.scrollY;
      const deltaY = nextScrollY - lastScrollYRef.current;
      lastScrollYRef.current = nextScrollY;
      applyDelta(deltaY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      reset();
    };
  }, [enabled]);

  return enabled ? offset : 0;
}

export function ReservationBookingClient({ data }: ReservationBookingClientProps) {
  const router = useRouter();
  const desktopCtaOffset = useWheelReactiveCtaMotion(true);
  const unavailableSelectionToastRef = useRef<string | null>(null);
  const successRedirectPendingRef = useRef(false);
  const [selectedWeekKey, setSelectedWeekKey] = useState(data.weeks[0]?.weekKey ?? "");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [consultationType, setConsultationType] = useState<ConsultationType>("IN_PERSON");
  const [expandedDayKey, setExpandedDayKey] = useState("");
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [successRedirectTo, setSuccessRedirectTo] = useState("/dashboard");
  const [successCountdown, setSuccessCountdown] = useState<number>(SUCCESS_COUNTDOWN_STEPS[0]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!data.hasReservation || successModalOpen || successRedirectPendingRef.current) {
      return;
    }

    router.replace("/dashboard");
  }, [data.hasReservation, router, successModalOpen]);

  useEffect(() => {
    if (!successModalOpen) {
      return;
    }

    const openedAt = window.performance.now();
    const countdownTimer = window.setInterval(() => {
      const elapsed = window.performance.now() - openedAt;
      const remainingSeconds = Math.max(
        1,
        Math.ceil((SUCCESS_REDIRECT_DELAY_MS - elapsed) / 1000),
      );

      setSuccessCountdown(remainingSeconds);
    }, 200);

    const redirectTimer = window.setTimeout(() => {
      successRedirectPendingRef.current = false;
      setSuccessModalOpen(false);
      router.push(successRedirectTo);
    }, SUCCESS_REDIRECT_DELAY_MS);

    return () => {
      window.clearInterval(countdownTimer);
      window.clearTimeout(redirectTimer);
    };
  }, [router, successModalOpen, successRedirectTo]);

  const selectedWeekIndex = Math.max(
    data.weeks.findIndex((week) => week.weekKey === selectedWeekKey),
    0,
  );

  const selectedWeek = useMemo(
    () => data.weeks.find((week) => week.weekKey === selectedWeekKey) ?? data.weeks[0],
    [data.weeks, selectedWeekKey],
  );

  const selectedSlot = useMemo<SelectedReservationSlot | null>(() => {
    const flattened = selectedWeek?.days.flatMap((day) =>
      day.slots.map((slot) => ({
        ...slot,
        fullLabel: day.fullLabel,
      })),
    );

    return flattened?.find((slot) => slot.id === selectedSlotId) ?? null;
  }, [selectedSlotId, selectedWeek]);
  const selectedSlotUnavailable = selectedSlot ? isUnavailableSlot(selectedSlot) : false;
  const activeSelectedSlot = selectedSlotUnavailable ? null : selectedSlot;

  const fallbackDayKey =
    selectedWeek?.days.find((day) => getOpenCount(day) > 0)?.dateKey ?? selectedWeek?.days[0]?.dateKey ?? "";

  const effectiveExpandedDayKey =
    selectedSlot?.dateKey ??
    (expandedDayKey && selectedWeek?.days.some((day) => day.dateKey === expandedDayKey)
      ? expandedDayKey
      : fallbackDayKey);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const refreshSlots = () => {
      if (pending || successModalOpen || successRedirectPendingRef.current || document.visibilityState !== "visible") {
        return;
      }

      router.refresh();
    };

    const intervalId = window.setInterval(refreshSlots, SLOT_SYNC_INTERVAL_MS);
    const handleFocus = () => refreshSlots();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshSlots();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pending, router, successModalOpen]);

  useEffect(() => {
    if (!selectedSlot || successModalOpen || !selectedSlotUnavailable) {
      unavailableSelectionToastRef.current = null;
      return;
    }

    if (unavailableSelectionToastRef.current === selectedSlot.id) {
      return;
    }

    unavailableSelectionToastRef.current = selectedSlot.id;
    toast.error(selectedSlot.status === "BLOCKED" ? BLOCKED_SLOT_MESSAGE : TAKEN_SLOT_MESSAGE);
  }, [selectedSlot, selectedSlotUnavailable, successModalOpen]);

  async function handleBook() {
    if (!selectedSlot || selectedSlotUnavailable) {
      return;
    }

    startTransition(async () => {
      const result = await bookReservationAction(selectedSlot.id, consultationType);

      if (result.status === "error") {
        successRedirectPendingRef.current = false;
        toast.error(result.message);
        router.refresh();
        return;
      }

      successRedirectPendingRef.current = true;
      setSuccessMessage(`${selectedSlot.fullLabel} | ${selectedSlot.startLabel} - ${selectedSlot.endLabel}`);
      setSuccessRedirectTo(result.redirectTo ?? "/dashboard");
      setSuccessCountdown(SUCCESS_COUNTDOWN_STEPS[0]);
      setSuccessModalOpen(true);
    });
  }

  function handleSuccessRedirect() {
    successRedirectPendingRef.current = false;
    setSuccessModalOpen(false);
    router.push(successRedirectTo);
  }

  function clearSelection() {
    setSelectedSlotId(null);
  }

  function changeWeek(direction: "next" | "prev") {
    if (direction === "next" && selectedWeekIndex < data.weeks.length - 1) {
      setSelectedWeekKey(data.weeks[selectedWeekIndex + 1].weekKey);
      setSelectedSlotId(null);
    } else if (direction === "prev" && selectedWeekIndex > 0) {
      setSelectedWeekKey(data.weeks[selectedWeekIndex - 1].weekKey);
      setSelectedSlotId(null);
    }
  }

  function handleSlotSelect(slotId: string) {
    const slotDayKey = selectedWeek?.days.find((day) => day.slots.some((slot) => slot.id === slotId))?.dateKey;

    setSelectedSlotId(slotId);

    if (slotDayKey) {
      setExpandedDayKey(slotDayKey);
    }
  }

  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
      <div className={cn("space-y-10 lg:col-span-9 lg:pb-0", activeSelectedSlot ? "pb-48" : "pb-10")}>
        <div className="border-l-4 border-primary pl-6">
          <h1 className="mb-2 text-readable text-4xl font-extrabold tracking-tight text-text-strong">
            상담 예약 현황
          </h1>
          <p className="max-w-2xl text-readable text-lg leading-relaxed text-text-soft">
            {data.parent.studentName} 학생의 상담을 위해 원하시는 20분 상담 시간을 선택해 주세요. 이미
            예약된 시간은 회색으로 표시됩니다.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-surface-container-high bg-surface-container-low p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-center gap-3 sm:justify-start">
            <button
              onClick={() => changeWeek("prev")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-colors hover:bg-primary-container disabled:opacity-30 disabled:hover:bg-white"
              disabled={selectedWeekIndex === 0}
            >
              <ChevronLeft className="h-5 w-5 text-text-strong" />
            </button>
            <span className="min-w-[150px] px-2 text-center text-base font-bold text-text-strong sm:min-w-[180px] sm:text-lg">
              {selectedWeek?.label}
            </span>
            <button
              onClick={() => changeWeek("next")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-colors hover:bg-primary-container disabled:opacity-30 disabled:hover:bg-white"
              disabled={selectedWeekIndex === data.weeks.length - 1}
            >
              <ChevronRight className="h-5 w-5 text-text-strong" />
            </button>
          </div>

          <div className="flex justify-center overflow-x-auto">
            <div className="flex min-w-max rounded-xl border border-surface-container-highest/30 bg-white/50 p-1">
              {data.weeks.map((week) => (
                <button
                  key={week.weekKey}
                  onClick={() => {
                    setSelectedWeekKey(week.weekKey);
                    setSelectedSlotId(null);
                  }}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-xs font-bold transition-all",
                    selectedWeekKey === week.weekKey
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "text-text-soft hover:bg-surface-container",
                  )}
                >
                  {week.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden gap-6 md:grid-cols-5 lg:grid">
          {selectedWeek?.days.map((day) => (
            <div key={day.dateKey} className="space-y-4">
              <div className="pb-2 text-center">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                  {day.weekdayLabel}
                </p>
                <p className="text-3xl font-black text-text-strong">{day.dayNumber}</p>
                <p className="text-[10px] font-bold uppercase tracking-tighter text-text-muted">
                  {day.monthLabel}
                </p>
              </div>

              <div className="space-y-3">
                {day.slots.map((slot) => {
                  const isReserved = slot.status === "BOOKED" || Boolean(slot.reservedStudentName);
                  const isBlocked = slot.status === "BLOCKED";
                  const isSelected = selectedSlotId === slot.id;

                  if (isReserved || isBlocked) {
                    return (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between rounded-xl border border-surface-container-highest/50 bg-surface-container/40 px-4 py-3 opacity-60"
                      >
                        <span className="text-xs font-bold text-text-muted">{slot.startLabel}</span>
                        <span className="shrink-0 rounded bg-text-muted/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-text-muted">
                          {isBlocked ? "마감" : "예약됨"}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={slot.id}
                      onClick={() => handleSlotSelect(slot.id)}
                      className={cn(
                        "group flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                        isSelected
                          ? "scale-[1.02] border-primary bg-primary text-white shadow-lg shadow-primary/30"
                          : "border-surface-container-highest bg-white shadow-sm hover:border-primary/30 hover:shadow-md",
                      )}
                    >
                      <span className={cn("text-xs font-bold", isSelected ? "text-white" : "text-text-strong")}>
                        {slot.startLabel} - {slot.endLabel}
                      </span>
                      <Plus
                        className={cn(
                          "h-4 w-4 transition-transform group-hover:rotate-90",
                          isSelected ? "text-white" : "text-primary",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 lg:hidden">
          <div className="rounded-[1.8rem] border border-surface-container-high bg-white p-5 shadow-[0_18px_42px_-30px_rgba(35,58,67,0.35)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">모바일 예약</p>
            <h2 className="mt-3 text-readable text-2xl font-extrabold text-text-strong">날짜를 펼쳐 시간을 선택하세요</h2>
            <p className="mt-2 text-readable text-sm leading-relaxed text-text-soft">
              날짜별 가능한 시간을 확인한 뒤 원하는 시간을 누르면, 하단 확정 바에서 상담 방법을 선택하고
              바로 신청할 수 있습니다.
            </p>
          </div>

          <MobileAccordionSchedule
            days={selectedWeek?.days ?? []}
            expandedDayKey={effectiveExpandedDayKey}
            selectedSlotId={selectedSlotId}
            onToggle={(dateKey) => setExpandedDayKey((current) => (current === dateKey ? "" : dateKey))}
            onSelect={handleSlotSelect}
          />
        </div>
      </div>

      <aside className="hidden lg:col-span-3 lg:block">
        <div
          className="sticky top-28 space-y-8 rounded-[2rem] border border-surface-container-high bg-white p-8 shadow-xl shadow-primary/5"
          style={{
            transform: `translate3d(0, ${desktopCtaOffset.toFixed(2)}px, 0)`,
            willChange: "transform",
          }}
        >
          <h2 className="text-readable text-2xl font-extrabold text-text-strong">예약 확인</h2>
          <ReservationSummaryContent
            classLabel={data.parent.classLabel}
            consultationType={consultationType}
            studentName={data.parent.studentName}
            selectedSlot={activeSelectedSlot}
            teacherName={data.teacher?.name ?? "정보 없음"}
            onConsultationTypeChange={setConsultationType}
          />

          <div className="pt-4">
            <ReservationActionButton
              disabled={!selectedSlotId || pending || selectedSlotUnavailable}
              pending={pending}
              onClick={handleBook}
            />
            <p className="mt-4 text-center text-readable text-[10px] leading-relaxed text-text-muted">
              확정 후 안내 메시지가 발송됩니다.
            </p>
          </div>
        </div>
      </aside>

      {activeSelectedSlot ? (
        <MobileFloatingConfirmBar
          classLabel={data.parent.classLabel}
          consultationType={consultationType}
          pending={pending}
          selectedSlot={activeSelectedSlot}
          teacherName={data.teacher?.name ?? "정보 없음"}
          onClose={clearSelection}
          onConsultationTypeChange={setConsultationType}
          onConfirm={handleBook}
        />
      ) : null}

      {successModalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-text-strong/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-[2rem] bg-white p-10 text-center shadow-2xl animate-in fade-in zoom-in duration-300 sm:p-12">
            <div className="mb-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <p className="mx-auto mb-4 inline-flex max-w-full rounded-full bg-primary-container px-4 py-2 text-readable text-sm font-semibold text-primary">
              {successMessage}
            </p>
            <h2 className="mb-4 text-readable text-3xl font-extrabold text-text-strong">예약이 완료되었습니다</h2>
            <p className="mb-8 text-readable font-medium leading-relaxed text-text-soft">
              상담 예약이 정상적으로 접수되었습니다. 내 예약 화면에서 예약 일정을 다시 확인하실 수
              있습니다.
            </p>
            <div className="mb-3 flex items-center justify-center gap-3">
              {SUCCESS_COUNTDOWN_STEPS.map((second) => (
                <span
                  key={second}
                  className={cn(
                    "text-lg font-black text-primary transition-all",
                    second === successCountdown ? "scale-110 opacity-100" : "opacity-35",
                  )}
                >
                  {second}
                </span>
              ))}
            </div>
            <p className="mb-6 text-readable text-sm font-semibold text-primary">
              {successCountdown}초 뒤에 예약 완료 페이지로 이동합니다.
            </p>
            <Button
              size="lg"
              className="w-full rounded-full bg-primary py-6 text-base text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary-dim active:scale-95"
              onClick={handleSuccessRedirect}
            >
              지금 이동하기
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MobileAccordionSchedule({
  days,
  expandedDayKey,
  selectedSlotId,
  onToggle,
  onSelect,
}: {
  days: ReservationDay[];
  expandedDayKey: string;
  selectedSlotId: string | null;
  onToggle: (dateKey: string) => void;
  onSelect: (slotId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {days.map((day) => {
        const openCount = getOpenCount(day);
        const isExpanded = expandedDayKey === day.dateKey;

        return (
          <section
            key={day.dateKey}
            className={cn(
              "overflow-hidden rounded-[1.7rem] border transition-all",
              isExpanded
                ? "border-primary/20 bg-white shadow-[0_20px_48px_-30px_rgba(26,95,122,0.45)]"
                : "border-surface-container-high bg-white shadow-sm",
            )}
          >
            <button
              onClick={() => onToggle(day.dateKey)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[1.25rem]",
                    isExpanded ? "bg-primary text-white" : "bg-surface-container-low text-text-strong",
                  )}
                >
                  <p className={cn("text-[10px] font-bold uppercase tracking-[0.22em]", isExpanded ? "text-white/75" : "text-primary")}>
                    {day.weekdayLabel}
                  </p>
                  <p className="mt-1 text-2xl font-black">{day.dayNumber}</p>
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-strong">{day.fullLabel}</h3>
                  <p className="mt-1 text-readable text-[12px] leading-relaxed text-text-soft">
                    {openCount > 0 ? `선택 가능한 시간 ${openCount}개` : "선택 가능한 시간이 없습니다."}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-bold text-text-soft">가능 {openCount}개</p>
                <p className="mt-1 text-[11px] font-medium text-text-muted">{isExpanded ? "접기" : "펼치기"}</p>
              </div>
            </button>

            {isExpanded ? (
              <div className="border-t border-surface-container-high/70 px-5 pb-5 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  {day.slots.map((slot) => (
                    <MobileSlotButton
                      key={slot.id}
                      isSelected={selectedSlotId === slot.id}
                      slot={slot}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function MobileSlotButton({
  isSelected,
  slot,
  onSelect,
}: {
  isSelected: boolean;
  slot: ReservationSlot;
  onSelect: (slotId: string) => void;
}) {
  const isReserved = slot.status === "BOOKED" || Boolean(slot.reservedStudentName);
  const isBlocked = slot.status === "BLOCKED";

  if (isReserved || isBlocked) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-surface-container-high bg-surface-container-low px-3 py-3 opacity-70">
        <span className="text-[12px] font-bold text-text-muted">
          {slot.startLabel} - {slot.endLabel}
        </span>
        <span className="rounded-full bg-text-muted/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
          {isBlocked ? "마감" : "예약됨"}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(slot.id)}
      className={cn(
        "group flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-all",
        isSelected
          ? "border-primary bg-primary text-white shadow-lg shadow-primary/25"
          : "border-surface-container-high bg-white hover:border-primary/25 hover:shadow-md",
      )}
    >
      <div>
        <p className={cn("text-sm font-black", isSelected ? "text-white" : "text-text-strong")}>
          {slot.startLabel}
        </p>
        <p className={cn("mt-0.5 text-[11px]", isSelected ? "text-white/75" : "text-text-muted")}>
          {slot.endLabel} 종료
        </p>
      </div>
      <Plus
        className={cn(
          "h-4 w-4 transition-transform group-hover:rotate-90",
          isSelected ? "text-white" : "text-primary",
        )}
      />
    </button>
  );
}

function ReservationSummaryContent({
  classLabel,
  consultationType,
  studentName,
  selectedSlot,
  teacherName,
  onConsultationTypeChange,
}: {
  classLabel: string;
  consultationType: ConsultationType;
  studentName: string;
  selectedSlot: SelectedReservationSlot | null;
  teacherName: string;
  onConsultationTypeChange: (value: ConsultationType) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-2xl border border-surface-container-high/50 bg-surface-container-low p-4">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-black text-text-strong">{teacherName}</p>
          <p className="text-[10px] font-medium text-text-soft">{classLabel}</p>
          <p className="mt-0.5 text-[9px] font-bold tracking-wider text-primary">담당 교사</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5">
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">일시</p>
            <p className="text-readable text-sm font-bold leading-relaxed text-text-strong">
              {selectedSlot ? selectedSlot.fullLabel : "시간을 먼저 선택하세요"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">상담 시간</p>
            <p className="text-sm font-bold text-text-strong">
              {selectedSlot ? `${selectedSlot.startLabel} - ${selectedSlot.endLabel}` : "-"}
            </p>
            {selectedSlot ? <p className="text-[10px] font-medium text-primary">20분간 진행</p> : null}
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">학생명</p>
            <p className="text-sm font-bold text-text-strong">{studentName}</p>
          </div>
        </div>

        <ConsultationTypeSelector
          consultationType={consultationType}
          onConsultationTypeChange={onConsultationTypeChange}
        />
      </div>
    </div>
  );
}

function ConsultationTypeSelector({
  consultationType,
  onConsultationTypeChange,
}: {
  consultationType: ConsultationType;
  onConsultationTypeChange: (value: ConsultationType) => void;
}) {
  return (
    <div className="space-y-3 pt-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">상담 방법</p>
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-surface-container-high/50 bg-surface-container-low p-1">
        <button
          onClick={() => onConsultationTypeChange("IN_PERSON")}
          className={cn(
            "rounded-lg py-2 text-xs font-bold transition-all",
            consultationType === "IN_PERSON"
              ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
              : "text-text-soft hover:text-text-strong",
          )}
        >
          대면
        </button>
        <button
          onClick={() => onConsultationTypeChange("PHONE")}
          className={cn(
            "rounded-lg py-2 text-xs font-bold transition-all",
            consultationType === "PHONE"
              ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
              : "text-text-soft hover:text-text-strong",
          )}
        >
          전화
        </button>
      </div>
    </div>
  );
}

function ReservationActionButton({
  disabled,
  pending,
  onClick,
}: {
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="lg"
      disabled={disabled || pending}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-center gap-2 rounded-full py-6 font-bold shadow-lg transition-all active:scale-95",
        disabled
          ? "cursor-not-allowed bg-surface-container text-text-muted"
          : "bg-primary text-white shadow-primary/20 hover:bg-primary-dim",
      )}
    >
      <span>{pending ? "예약 처리 중..." : "예약 확정하기"}</span>
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </Button>
  );
}

function MobileFloatingConfirmBar({
  classLabel,
  consultationType,
  pending,
  selectedSlot,
  teacherName,
  onClose,
  onConsultationTypeChange,
  onConfirm,
}: {
  classLabel: string;
  consultationType: ConsultationType;
  pending: boolean;
  selectedSlot: SelectedReservationSlot;
  teacherName: string;
  onClose: () => void;
  onConsultationTypeChange: (value: ConsultationType) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-x-4 bottom-4 z-[80] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[2rem] border border-surface-container-high bg-white p-5 shadow-[0_28px_60px_-26px_rgba(16,35,46,0.45)] lg:hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">선택한 시간</p>
          <h3 className="mt-2 text-readable text-lg font-black text-text-strong">{selectedSlot.fullLabel}</h3>
          <p className="mt-1 text-sm font-semibold text-text-soft">
            {selectedSlot.startLabel} - {selectedSlot.endLabel}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-low text-text-soft transition-colors hover:bg-surface-container"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-surface-container-low p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">담당 교사</p>
          <p className="mt-1 text-sm font-black text-text-strong">{teacherName}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">학급</p>
          <p className="mt-1 text-sm font-black text-text-strong">{classLabel}</p>
        </div>
      </div>

      <div className="mt-4">
        <ConsultationTypeSelector
          consultationType={consultationType}
          onConsultationTypeChange={onConsultationTypeChange}
        />
      </div>

      <div className="mt-5 grid gap-2">
        <ReservationActionButton disabled={false} pending={pending} onClick={onConfirm} />
        <button
          onClick={onClose}
          className="rounded-full border border-surface-container-high px-4 py-3 text-sm font-bold text-text-soft transition-colors hover:bg-surface-container-low"
        >
          다른 시간 다시 보기
        </button>
        <p className="text-center text-readable text-[10px] leading-relaxed text-text-muted">
          확정 후 안내 메시지가 발송됩니다.
        </p>
      </div>
    </div>
  );
}
