"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarCheck2, CheckCircle2, X, Info, PlusCircle } from "lucide-react";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  const [pending, startTransition] = useTransition();

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
        setDialogOpen(false);
        router.refresh();
        return;
      }

      setSuccessMessage(`${selectedSlot.fullLabel} ${selectedSlot.startLabel}`);
      setDialogOpen(false);
      setSuccessModalOpen(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="font-display font-extrabold tracking-tight text-text-strong text-4xl sm:text-5xl mb-4">
            {data.parent.studentName} 상담 예약
          </h1>
          <p className="font-body text-lg leading-relaxed text-text-soft">
            상담 시간을 선택해주세요. 학급당 1회 예약만 가능하며,
            <br />
            이미 완료된 자리는 마스킹 처리됩니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <span className="font-bold text-primary px-3 py-1 bg-primary/5 rounded-full text-sm border border-primary/10">
              담당 교사: {data.teacher?.name ?? "정보 확인 중"} ({data.parent.classLabel})
            </span>
            <span className="text-sm text-text-muted flex items-center gap-1">
              <Info className="w-4 h-4" />
              공정성을 위해 신청자 정보는 보호됩니다
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-2xl overflow-x-auto w-full md:w-auto shrink-0 shadow-inner border border-surface-container-high">
          {data.weeks.map((week) => (
            <button
              key={week.weekKey}
              type="button"
              onClick={() => setSelectedWeekKey(week.weekKey)}
              className={cn(
                "whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-bold transition-all",
                selectedWeekKey === week.weekKey
                  ? "bg-white text-text-strong shadow-sm ring-1 ring-surface-container-highest"
                  : "text-text-soft hover:text-text-strong hover:bg-surface-container",
              )}
            >
              {week.label}
              <span className="ml-2 opacity-60 font-medium">{week.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface-container-low rounded-[2rem] overflow-hidden shadow-sm border border-surface-container-high pb-4 md:pb-0">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-px bg-surface-variant/30">
          {selectedWeek?.days.map((day) => (
            <div key={day.dateKey} className="flex flex-col min-h-[500px] bg-white">
              <div className="p-6 bg-surface-container-lowest text-center border-b border-surface-variant/30">
                <p className="col-span-1 text-xs font-bold text-text-muted uppercase tracking-widest mb-1">
                  {day.weekdayLabel}
                </p>
                <p className="font-display text-4xl font-extrabold text-text-strong">
                  {day.dayNumber}
                </p>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] mt-1">
                  {day.monthLabel}
                </p>
              </div>
              <div className="flex-1 p-4 space-y-4 bg-surface-container-low/5">
                {day.slots.map((slot) => {
                  const selectable = slot.status === "OPEN" && !slot.reservedStudentName;
                  const isBlocked = slot.status === "BLOCKED";

                  if (!selectable) {
                    return (
                      <div
                        key={slot.id}
                        className={cn(
                          "group relative h-22 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300",
                          isBlocked
                            ? "bg-surface-container/40 text-text-muted/30 border border-transparent"
                            : "bg-surface-dim/40 border border-outline-variant/20 opacity-60"
                        )}
                      >
                        <span className="text-[11px] font-bold text-text-muted/60 tracking-wider">
                          {slot.startLabel} - {slot.endLabel}
                        </span>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-text-strong/50 italic">
                            {isBlocked ? "잠심/정비" : "신청 완료"}
                          </p>
                          <span className="text-[9px] font-black text-text-muted/40 uppercase tracking-widest px-2 py-0.5 bg-black/5 rounded-full">
                            {isBlocked ? "CLOSED" : "DONE"}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => {
                        setSelectedSlotId(slot.id);
                        setDialogOpen(true);
                      }}
                      className="group relative w-full h-22 bg-white rounded-2xl p-4 flex flex-col justify-between 
                        hover:bg-primary hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20 
                        transition-all duration-500 ease-out text-left shadow-sm border border-surface-container-high 
                        focus:outline-none focus:ring-4 focus:ring-primary/20"
                    >
                      <span className="text-[11px] font-bold text-primary group-hover:text-white/80 tracking-wider transition-colors duration-300">
                        {slot.startLabel} - {slot.endLabel}
                      </span>
                      <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                          <p className="text-sm font-black text-text-strong group-hover:text-white transition-colors duration-300">
                            상담 신청
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-white/20 transition-all duration-300">
                          <PlusCircle className="w-5 h-5 text-primary group-hover:text-white transition-all transform group-hover:rotate-90 duration-500" />
                        </div>
                      </div>
                      
                      {/* Subtle Glow Effect */}
                      <div className="absolute inset-0 rounded-2xl bg-primary/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 -z-10" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {dialogOpen && selectedSlot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-text-strong/40 backdrop-blur-sm" onClick={() => !pending && setDialogOpen(false)}></div>
          <div className="relative bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-200 border border-surface-container-high">
            <button 
              className="absolute top-4 right-4 p-2 text-text-muted hover:bg-surface-container rounded-full transition-colors"
              onClick={() => !pending && setDialogOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mb-4">
               <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                 <CalendarCheck2 className="w-8 h-8" />
               </div>
            </div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">상담 예약 확인</p>
            <h3 className="font-display text-2xl font-extrabold text-text-strong">
              {selectedSlot.fullLabel}<br />
              {selectedSlot.startLabel}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-text-soft">
              <strong className="text-text-strong">{data.parent.studentName}</strong> 학생의 상담을 예약하시겠습니까?<br/>신청 이후에는 취소 및 변경이 제한됩니다.
            </p>
            
            <div className="mt-6 flex flex-col gap-3 items-center w-full px-2">
              <p className="text-sm font-bold text-text-strong">상담 방법 선택</p>
              <div className="flex w-full overflow-hidden rounded-xl bg-surface-container-low p-1 border border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setConsultationType("IN_PERSON")}
                  className={cn(
                    "flex-1 rounded-lg py-2.5 text-sm font-bold transition-all",
                    consultationType === "IN_PERSON" 
                      ? "bg-white text-primary shadow-sm ring-1 ring-black/5" 
                      : "text-text-soft hover:text-text-strong"
                  )}
                >
                  대면 상담
                </button>
                <button
                  type="button"
                  onClick={() => setConsultationType("PHONE")}
                  className={cn(
                    "flex-1 rounded-lg py-2.5 text-sm font-bold transition-all",
                    consultationType === "PHONE" 
                      ? "bg-white text-primary shadow-sm ring-1 ring-black/5" 
                      : "text-text-soft hover:text-text-strong"
                  )}
                >
                  전화 상담
                </button>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button size="lg" variant="ghost" className="flex-1 rounded-full text-text-soft hover:bg-surface-container hover:text-text-strong" onClick={() => setDialogOpen(false)} disabled={pending}>
                취소
              </Button>
              <Button size="lg" className="flex-1 rounded-full bg-primary text-[#FFFFFF] hover:bg-primary-dim shadow-md" onClick={handleBook} disabled={pending} style={{ color: '#ffffff' }}>
                {pending ? "처리 중..." : "확인 및 신청"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {successModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-text-strong/60 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 xl:p-10 text-center transform transition-all animate-in fade-in zoom-in duration-300">
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <h2 className="font-display text-3xl font-extrabold text-text-strong mb-4">예약 완료!</h2>
            <p className="text-text-soft font-medium leading-relaxed mb-8">
              {successMessage} 상담 예약이 성공적으로 완료되었습니다.
            </p>
            <Button 
              size="lg" 
              style={{ color: '#ffffff' }}
              className="w-full rounded-full bg-primary text-[#FFFFFF] hover:bg-primary-dim py-6 text-base shadow-xl shadow-primary/20 active:scale-95 transition-all"
              onClick={() => {
                setSuccessModalOpen(false);
                router.push("/dashboard");
              }}
            >
              확인
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
