import { PageLoadingShell } from "@/components/ui/page-loading-shell";

export default function Loading() {
  return (
    <PageLoadingShell
      badge="Dashboard"
      title="예약 내역을 불러오고 있습니다"
      description="가장 최근 상담 예약 상태와 안내 정보를 확인하는 중입니다."
    />
  );
}
