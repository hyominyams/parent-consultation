import { redirect } from "next/navigation";

import { TeacherDashboardClient } from "@/components/teacher/teacher-dashboard-client";
import { TeacherPageShell } from "@/components/teacher/teacher-page-shell";
import { requireTeacherSession } from "@/lib/auth/guards";
import { getTeacherDashboardData } from "@/lib/data/portal";

export default async function TeacherDashboardPage() {
  const session = await requireTeacherSession();
  const data = await getTeacherDashboardData(session.userId);

  if (!data) {
    redirect("/auth?role=teacher");
  }

  return (
    <TeacherPageShell
      currentPath="/teacher/dashboard"
      title="교사 대시보드"
      description="예약 요약을 확인하고 일정 관리와 상담 설정 화면으로 이동합니다."
      teacherName={data.teacher.name}
      classLabel={data.teacher.classLabel}
      unreadCount={data.unreadCount}
    >
      <TeacherDashboardClient data={data} />
    </TeacherPageShell>
  );
}
