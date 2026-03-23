"use client";

import { useTransition } from "react";
import { CalendarRange, Clock3, RefreshCcw, Trash2, Phone, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteReservationAction } from "@/lib/actions/reservation-actions";
import type { ParentDashboardData } from "@/lib/data/portal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatFullDate, parseTimeLabel } from "@/lib/utils";

type ParentDashboardClientProps = {
  data: ParentDashboardData;
};

export function ParentDashboardClient({ data }: ParentDashboardClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function runReservationAction(intent: "delete" | "reschedule") {
    const confirmed = window.confirm(
      intent === "delete"
        ? "현재 신청 내역을 삭제하시겠습니까?"
        : "현재 예약을 취소하고 새 시간을 선택하시겠습니까?",
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteReservationAction(intent);

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);

      if (result.redirectTo && result.redirectTo !== "/dashboard") {
        router.push(result.redirectTo);
      } else {
        router.refresh();
      }
    });
  }

  if (!data.reservation) {
    return (
      <EmptyState
        title="아직 신청한 상담이 없습니다."
        description="학생 정보 인증을 마친 뒤 상담 가능 시간표에서 원하는 시간을 선택해보세요."
        href="/reserve"
        cta="상담 신청하러 가기"
      />
    );
  }

  const { startLabel, endLabel } = parseTimeLabel(data.reservation.timeLabel);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-0">
      <div className="mt-8 flex flex-col items-center space-y-5 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[color:var(--primary-subtle)]/30 text-[color:var(--primary)] shadow-sm">
          <CalendarRange className="h-10 w-10" strokeWidth={1.5} />
        </div>
        <h1 className="font-display text-3xl font-medium tracking-tight text-[color:var(--text-strong)] sm:text-4xl">
          {data.parent.studentName} 학생 예약 내역
        </h1>
        <p className="max-w-md text-balance text-[1.05rem] leading-relaxed text-[color:var(--text-soft)]">
          상담 예약이 성공적으로 완료되었습니다. 아래의 예약 일정을 확인해 주세요.
        </p>
      </div>

      <div className="mt-12 overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-xl shadow-black/[0.03]">
        <div className="px-8 py-10 sm:px-12 sm:py-12">
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold tracking-wide text-[color:var(--text-muted)]">
                예약 일자
              </p>
              <p className="text-xl font-medium text-[color:var(--text-strong)]">
                {formatFullDate(data.reservation.date)}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold tracking-wide text-[color:var(--text-muted)]">
                예약 시간
              </p>
              <div className="flex items-center gap-3 text-[color:var(--text-soft)]">
                <Clock3 className="h-5 w-5" />
                <span>
                  {startLabel} - {endLabel}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[color:var(--primary)] font-bold">
                {data.reservation.consultationType === "PHONE" ? (
                  <>
                    <Phone className="h-5 w-5" />
                    <span>전화 상담</span>
                  </>
                ) : (
                  <>
                    <Users className="h-5 w-5" />
                    <span>대면 상담</span>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold tracking-wide text-[color:var(--text-muted)]">
                학급 정보
              </p>
              <p className="text-lg font-medium text-[color:var(--text-strong)]">
                {data.parent.classLabel}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold tracking-wide text-[color:var(--text-muted)]">
                담당 교사
              </p>
              <p className="text-lg font-medium text-[color:var(--text-strong)]">
                {data.teacher} 선생님
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col border-t border-black/5 bg-slate-50/50 p-6 sm:flex-row sm:items-center sm:justify-between sm:px-12">
          <p className="mb-5 text-sm leading-relaxed text-[color:var(--text-soft)] sm:mb-0 sm:max-w-[220px]">
            일정 변경이나 취소가 필요하신 경우 버튼을 이용해 주세요.
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="soft"
              size="lg"
              disabled={pending}
              onClick={() => runReservationAction("reschedule")}
              className="h-12 flex-1 rounded-xl bg-white sm:flex-none sm:px-6 shadow-sm ring-1 ring-inset ring-[color:var(--border)]"
            >
              <RefreshCcw className="mr-2 h-[18px] w-[18px]" />
              예약 변경
            </Button>
            <Button
              variant="danger"
              size="lg"
              disabled={pending}
              onClick={() => runReservationAction("delete")}
              className="h-12 flex-1 rounded-xl sm:flex-none sm:px-6 shadow-sm"
            >
              <Trash2 className="mr-2 h-[18px] w-[18px]" />
              예약 삭제
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
