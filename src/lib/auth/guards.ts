import { redirect } from "next/navigation";

import { requireMaybeSingle } from "@/lib/db/helpers";
import { supabaseAdmin } from "@/lib/db/supabase";
import { getSession } from "@/lib/auth/session";

export async function redirectAuthenticatedUser() {
  const session = await getSession();

  if (!session) {
    return;
  }

  if (session.userType === "TEACHER") {
    const teacher = requireMaybeSingle(
      await supabaseAdmin
        .from("TeacherUser")
        .select("id")
        .eq("id", session.userId)
        .maybeSingle(),
      "Failed to verify teacher session.",
    );

    if (!teacher) {
      return;
    }

    redirect("/teacher/dashboard");
  }

  const parent = requireMaybeSingle(
    await supabaseAdmin
      .from("ParentUser")
      .select("id")
      .eq("id", session.userId)
      .maybeSingle(),
    "Failed to verify parent session.",
  );

  if (!parent) {
    return;
  }

  const { count, error } = await supabaseAdmin
    .from("Reservation")
    .select("id", { count: "exact", head: true })
    .eq("parentUserId", session.userId);

  if (error) {
    throw new Error(`Failed to load reservation redirect state. ${error.message}`);
  }

  redirect(count ? "/dashboard" : "/reserve");
}

export async function requireParentSession() {
  const session = await getSession();

  if (!session) {
    redirect("/auth");
  }

  if (session.userType === "TEACHER") {
    redirect("/teacher/dashboard");
  }

  return session;
}

export async function requireTeacherSession() {
  const session = await getSession();

  if (!session) {
    redirect("/auth?role=teacher");
  }

  if (session.userType === "PARENT") {
    redirect("/dashboard");
  }

  return session;
}
