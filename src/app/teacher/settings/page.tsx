import { redirect } from "next/navigation";

import { TeacherPageShell } from "@/components/teacher/teacher-page-shell";
import { TeacherSettingsClient } from "@/components/teacher/teacher-settings-client";
import { requireTeacherSession } from "@/lib/auth/guards";
import { getTeacherDashboardData } from "@/lib/data/portal";

export default async function TeacherSettingsPage() {
  const session = await requireTeacherSession();
  const data = await getTeacherDashboardData(session.userId);

  if (!data) {
    redirect("/auth?role=teacher");
  }

  return (
    <TeacherPageShell
      currentPath="/teacher/settings"
      title="상담 설정"
      description="주차별 운영 시간을 차분하게 조정할 수 있게 입력 흐름을 단순화했습니다. 예약이 이미 들어간 주차는 혼선을 막기 위해 잠금 상태로 표시합니다."
      teacherName={data.teacher.name}
      classLabel={data.teacher.classLabel}
      unreadCount={data.unreadCount}
    >
      <TeacherSettingsClient data={data} />
    </TeacherPageShell>
  );
}
