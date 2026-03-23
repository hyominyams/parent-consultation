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
      description="날짜별 상담 가능 상태 조정"
      teacherName={data.teacher.name}
      classLabel={data.teacher.classLabel}
      unreadCount={data.unreadCount}
    >
      <TeacherAvailabilityClient data={data} />
    </TeacherPageShell>
  );
}
