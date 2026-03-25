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
      title="일정 관리/확인"
      description="시간대 상태를 조정하고, 예약된 신청자 정보도 같은 화면에서 바로 확인합니다."
      teacherName={data.teacher.name}
      classLabel={data.teacher.classLabel}
      unreadCount={data.unreadCount}
    >
      <TeacherAvailabilityClient data={data} />
    </TeacherPageShell>
  );
}
