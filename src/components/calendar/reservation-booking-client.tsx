"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { bookReservationAction } from "@/lib/actions/reservation-actions";
import type { ParentCalendarData } from "@/lib/data/portal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReservationBookingClientProps = {
  data: ParentCalendarData;
};

export function ReservationBookingClient({ data }: ReservationBookingClientProps) {
  const router = useRouter();
  const [selectedWeekKey, setSelectedWeekKey] = useState(data.weeks[0]?.weekKey ?? "");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [consultationType, setConsultationType] = useState<"PHONE" | "IN_PERSON">("IN_PERSON");
  
  // Modals state
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [successRedirectTo, setSuccessRedirectTo] = useState("/dashboard");
  
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!successModalOpen) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      setSuccessModalOpen(false);
      router.push(successRedirectTo);
    }, 5000);

    return () => window.clearTimeout(redirectTimer);
  }, [router, successModalOpen, successRedirectTo]);

  const selectedWeek = useMemo(
    () => data.weeks.find((week) => week.weekKey === selectedWeekKey) ?? data.weeks[0],
    [data.weeks, selectedWeekKey],
  );

  const selectedSlot = useMemo(() => {
    const flattened = selectedWeek?.days.flatMap((day) =>
      day.slots.map((slot) => ({
        ...slot,
        fullLabel: day.fullLabel,
      })),
    );
    return flattened?.find((slot) => slot.id === selectedSlotId) ?? null;
  }, [selectedSlotId, selectedWeek]);

  async function handleBook() {
    if (!selectedSlot) return;

    startTransition(async () => {
      const result = await bookReservationAction(selectedSlot.id, consultationType);

      if (result.status === "error") {
        toast.error(result.message);
        router.refresh();
        return;
      }

      setSuccessMessage(`${selectedSlot.fullLabel} | ${selectedSlot.startLabel} - ${selectedSlot.endLabel}`);
      setSuccessRedirectTo(result.redirectTo ?? "/dashboard");
      setSuccessModalOpen(true);
    });
  }

  function handleSuccessRedirect() {
    setSuccessModalOpen(false);
    router.push(successRedirectTo);
  }

  const changeWeek = (direction: "next" | "prev") => {
    const currentIndex = data.weeks.findIndex((week) => week.weekKey === selectedWeekKey);
    if (direction === "next" && currentIndex < data.weeks.length - 1) {
      setSelectedWeekKey(data.weeks[currentIndex + 1].weekKey);
      setSelectedSlotId(null);
    } else if (direction === "prev" && currentIndex > 0) {
      setSelectedWeekKey(data.weeks[currentIndex - 1].weekKey);
      setSelectedSlotId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      <div className="lg:col-span-9 space-y-10">
        <div className="pl-6 border-l-4 border-primary">
          <h1 className="text-readable text-4xl font-extrabold tracking-tight text-text-strong mb-2">
            상담 예약 현황
          </h1>
          <p className="text-readable max-w-2xl text-lg leading-relaxed text-text-soft">
            {data.parent.studentName} 학생의 상담을 위해 원하시는 20분 상담 시간을 선택해 주세요. 이미
            예약된 시간은 회색으로 표시됩니다.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-low p-4 rounded-2xl shadow-sm border border-surface-container-high">
          <div className="flex items-center gap-3">
            <button
              onClick={() => changeWeek("prev")}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm hover:bg-primary-container transition-colors disabled:opacity-30 disabled:hover:bg-white"
              disabled={data.weeks.findIndex((week) => week.weekKey === selectedWeekKey) === 0}
            >
              <ChevronLeft className="w-5 h-5 text-text-strong" />
            </button>
            <span className="text-lg font-bold text-text-strong px-2 min-w-[180px] text-center">
              {selectedWeek?.label}
            </span>
            <button
              onClick={() => changeWeek("next")}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm hover:bg-primary-container transition-colors disabled:opacity-30 disabled:hover:bg-white"
              disabled={
                data.weeks.findIndex((week) => week.weekKey === selectedWeekKey) === data.weeks.length - 1
              }
            >
              <ChevronRight className="w-5 h-5 text-text-strong" />
            </button>
          </div>
          <div className="flex p-1 bg-white/50 rounded-xl border border-surface-container-highest/30">
            {data.weeks.map((week) => (
              <button
                key={week.weekKey}
                onClick={() => setSelectedWeekKey(week.weekKey)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  selectedWeekKey === week.weekKey
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-text-soft hover:bg-surface-container"
                )}
              >
                {week.label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {selectedWeek?.days.map((day) => (
            <div key={day.dateKey} className="space-y-4">
              <div className="text-center pb-2">
                <p className="text-[10px] font-bold tracking-widest text-primary uppercase mb-1">{day.weekdayLabel}</p>
                <p className="text-3xl font-black text-text-strong">{day.dayNumber}</p>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-tighter">{day.monthLabel}</p>
              </div>

              <div className="space-y-3">
                {day.slots.map((slot) => {
                  const isReserved = slot.status === "BOOKED" || !!slot.reservedStudentName;
                  const isBlocked = slot.status === "BLOCKED";
                  const isSelected = selectedSlotId === slot.id;

                  if (isReserved || isBlocked) {
                    return (
                      <div
                        key={slot.id}
                        className="py-3 px-4 bg-surface-container/40 rounded-xl border border-surface-container-highest/50 opacity-60 flex justify-between items-center"
                      >
                        <span className="text-xs font-bold text-text-muted">
                          {slot.startLabel}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-text-muted px-1.5 py-0.5 bg-text-muted/10 rounded shrink-0">
                          {isBlocked ? "마감" : "예약됨"}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={cn(
                        "w-full py-3 px-4 rounded-xl border transition-all text-left flex justify-between items-center group",
                        isSelected
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-[1.02]"
                          : "bg-white border-surface-container-highest shadow-sm hover:shadow-md hover:border-primary/30"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-bold",
                        isSelected ? "text-white" : "text-text-strong"
                      )}>
                        {slot.startLabel} - {slot.endLabel}
                      </span>
                      <Plus className={cn(
                        "w-4 h-4 transition-transform group-hover:rotate-90",
                        isSelected ? "text-white" : "text-primary"
                      )} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="lg:col-span-3">
        <div className="sticky top-28 bg-white p-8 rounded-[2rem] shadow-xl shadow-primary/5 border border-surface-container-high space-y-8">
          <h2 className="text-readable text-2xl font-extrabold text-text-strong">예약 확인</h2>

          <div className="p-4 bg-surface-container-low rounded-2xl flex items-center gap-4 border border-surface-container-high/50">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-black text-text-strong">{data.teacher?.name ?? "정보 없음"}</p>
              <p className="text-[10px] text-text-soft font-medium">{data.parent.classLabel}</p>
              <p className="mt-0.5 text-[9px] font-bold tracking-wider text-primary">담당 교사</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-0.5">일시</p>
                <p className="text-readable text-sm font-bold italic leading-relaxed text-text-strong">
                  {selectedSlot ? selectedSlot.fullLabel : "시간을 먼저 선택하세요"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-0.5">상담 시간</p>
                <p className="text-sm font-bold text-text-strong">
                  {selectedSlot ? `${selectedSlot.startLabel} - ${selectedSlot.endLabel}` : "-"}
                </p>
                {selectedSlot && <p className="text-[10px] text-primary font-medium">20분간 진행</p>}
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-0.5">학생명</p>
                <p className="text-sm font-bold text-text-strong">{data.parent.studentName}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">상담 방법</p>
              <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-low rounded-xl border border-surface-container-high/50">
                <button
                  onClick={() => setConsultationType("IN_PERSON")}
                  className={cn(
                    "py-2 text-xs font-bold rounded-lg transition-all",
                    consultationType === "IN_PERSON" 
                      ? "bg-white text-primary shadow-sm ring-1 ring-black/5" 
                      : "text-text-soft hover:text-text-strong"
                  )}
                >
                  대면
                </button>
                <button
                  onClick={() => setConsultationType("PHONE")}
                  className={cn(
                    "py-2 text-xs font-bold rounded-lg transition-all",
                    consultationType === "PHONE" 
                      ? "bg-white text-primary shadow-sm ring-1 ring-black/5" 
                      : "text-text-soft hover:text-text-strong"
                  )}
                >
                  전화
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              size="lg"
              disabled={!selectedSlotId || pending}
              onClick={handleBook}
              className={cn(
                "w-full py-6 rounded-full font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 group",
                selectedSlotId 
                  ? "bg-primary text-white hover:bg-primary-dim shadow-primary/20" 
                  : "bg-surface-container text-text-muted cursor-not-allowed"
              )}
            >
              <span>예약 확정하기</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-readable mt-4 text-center text-[10px] leading-relaxed text-text-muted">
              확정 후 안내 메시지가 발송됩니다.
            </p>
          </div>
        </div>
      </aside>

      {successModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-text-strong/60 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-lg rounded-[2rem] bg-white p-10 text-center shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300 sm:p-12">
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <p className="text-readable mx-auto mb-4 inline-flex max-w-full rounded-full bg-primary-container px-4 py-2 text-sm font-semibold text-primary">
              {successMessage}
            </p>
            <h2 className="text-readable mb-4 text-3xl font-extrabold text-text-strong">
              예약이 완료되었습니다
            </h2>
            <p className="text-readable mb-8 font-medium leading-relaxed text-text-soft">
              상담 예약이 정상적으로 접수되었습니다. 내 예약 화면에서 예약 일정을 다시 확인하실 수
              있습니다.
            </p>
            <p className="text-readable mb-6 text-sm text-text-muted">
              5초 후 내 예약 페이지로 자동 이동합니다.
            </p>
            <Button
              size="lg"
              className="w-full rounded-full bg-primary text-white hover:bg-primary-dim py-6 text-base shadow-xl shadow-primary/20 active:scale-95 transition-all"
              onClick={handleSuccessRedirect}
            >
              지금 이동하기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
