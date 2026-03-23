import { redirect } from "next/navigation";

import { ParentDashboardClient } from "@/components/dashboard/parent-dashboard-client";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { requireParentSession } from "@/lib/auth/guards";
import { getParentDashboardData } from "@/lib/data/portal";

export default async function DashboardPage() {
  const session = await requireParentSession();
  const data = await getParentDashboardData(session.userId);

  if (!data) {
    redirect("/auth");
  }

  return (
    <main className="min-h-screen">
      <SiteHeader currentPath="/dashboard" />
      <section className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8">
        <ParentDashboardClient data={data} />
      </section>
      <SiteFooter />
    </main>
  );
}
