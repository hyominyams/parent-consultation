import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ReservationBookingClient } from "@/components/calendar/reservation-booking-client";
import { requireParentSession } from "@/lib/auth/guards";
import { getParentCalendarData } from "@/lib/data/portal";

export default async function ReservePage() {
  const session = await requireParentSession();
  const data = await getParentCalendarData(session.userId);

  if (!data) {
    redirect("/auth");
  }

  if (data.hasReservation) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen">
      <SiteHeader currentPath="/reserve" />
      <section className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8">
        <ReservationBookingClient data={data} />
      </section>
      <SiteFooter />
    </main>
  );
}
