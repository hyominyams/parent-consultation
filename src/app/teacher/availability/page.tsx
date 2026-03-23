import { redirect } from "next/navigation";

import { TeacherAvailabilityClient } from "@/components/teacher/teacher-availability-client";
import { TeacherPageShell } from "@/components/teacher/teacher-page-shell";
import { requireTeacherSession } from "@/lib/auth/guards";
import { getTeacherDashboardData } from "@/lib/data/portal";

export default async function TeacherAvailabilityPage() {
  const session = await requireTeacherSession();
  const data = await getTeacherDashboardData(session.userId);

  if (!data) {
    redirect("/auth?role=teacher");
  }

  return (
    <TeacherPageShell
      currentPath="/teacher/availability"
      title="날짜 조정"
      description="불가능 날짜를 날짜 단위로 빠르게 닫고 다시 열 수 있게 정리했습니다. 이미 예약된 시간은 보존한 채 남은 시간만 함께 조정됩니다."
      teacherName={data.teacher.name}
      classLabel={data.teacher.classLabel}
      unreadCount={data.unreadCount}
    >
      <TeacherAvailabilityClient data={data} />
    </TeacherPageShell>
  );
}
