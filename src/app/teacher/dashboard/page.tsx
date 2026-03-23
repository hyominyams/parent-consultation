import { redirect } from "next/navigation";

import { TeacherDashboardClient } from "@/components/dashboard/teacher-dashboard-client";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { requireTeacherSession } from "@/lib/auth/guards";
import { getTeacherDashboardData } from "@/lib/data/portal";

export default async function TeacherDashboardPage() {
  const session = await requireTeacherSession();
  const data = await getTeacherDashboardData(session.userId);

  if (!data) {
    redirect("/auth?role=teacher");
  }

  return (
    <main className="min-h-screen">
      <SiteHeader currentPath="/teacher/dashboard" />
      <section className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8">
        <TeacherDashboardClient data={data} />
      </section>
      <SiteFooter />
    </main>
  );
}
