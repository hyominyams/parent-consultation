import { PageLoadingShell } from "@/components/ui/page-loading-shell";

export default function Loading() {
  return (
    <PageLoadingShell
      badge="Teacher Portal"
      title="교사 포털을 준비하고 있습니다"
      description="예약 요약과 일정 관리 정보를 최신 상태로 불러오는 중입니다."
    />
  );
}
