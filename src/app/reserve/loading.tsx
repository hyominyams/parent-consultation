import { PageLoadingShell } from "@/components/ui/page-loading-shell";

export default function Loading() {
  return (
    <PageLoadingShell
      badge="Reservation"
      title="예약 가능 시간을 불러오고 있습니다"
      description="담당 교사 일정과 현재 예약 현황을 동기화하는 중입니다."
    />
  );
}
