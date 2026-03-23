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
      description="주차별 시간 간격과 운영 시간 설정"
      teacherName={data.teacher.name}
      classLabel={data.teacher.classLabel}
      unreadCount={data.unreadCount}
    >
      <TeacherSettingsClient data={data} />
    </TeacherPageShell>
  );
}
