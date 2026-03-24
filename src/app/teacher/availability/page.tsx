import { redirect } from "next/navigation";

import { TeacherAvailabilityClient } from "@/components/teacher/teacher-availability-client";
import { TeacherPageShell } from "@/components/teacher/teacher-page-shell";
import { requireTeacherSession } from "@/lib/auth/guards";
import { getTeacherAvailabilityData } from "@/lib/data/portal";

export default async function TeacherAvailabilityPage() {
  const session = await requireTeacherSession();
  const data = await getTeacherAvailabilityData(session.userId);

  if (!data) {
    redirect("/auth?role=teacher");
  }

  return (
    <TeacherPageShell
      currentPath="/teacher/availability"
      title="날짜 조정"
      description="날짜와 시간대별 상담 가능 상태를 직접 조정합니다."
      teacherName={data.teacher.name}
      classLabel={data.teacher.classLabel}
      unreadCount={data.unreadCount}
    >
      <TeacherAvailabilityClient data={data} />
    </TeacherPageShell>
  );
}
