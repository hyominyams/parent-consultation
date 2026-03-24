import { PageLoadingShell } from "@/components/ui/page-loading-shell";

export default function Loading() {
  return (
    <PageLoadingShell
      badge="Authentication"
      title="로그인 화면을 준비하고 있습니다"
      description="학생 또는 교사 정보를 확인할 수 있도록 로그인 화면과 동의 항목을 불러오는 중입니다."
    />
  );
}
