import { requireData, requireMaybeSingle } from "@/lib/db/helpers";
import { supabaseAdmin } from "@/lib/db/supabase";
import type {
  ClassScheduleConfigRow,
  ParentUserRow,
  ReservationRow,
  ReservationSlotRow,
  TeacherNotificationRow,
  TeacherUserRow,
} from "@/lib/db/types";

export async function getParentUserById(parentUserId: string) {
  return requireMaybeSingle<ParentUserRow>(
    await supabaseAdmin.from("ParentUser").select("*").eq("id", parentUserId).maybeSingle(),
    "Failed to load parent user.",
  );
}

export async function getParentUserByLoginId(loginId: string) {
  return requireMaybeSingle<ParentUserRow>(
    await supabaseAdmin.from("ParentUser").select("*").eq("loginId", loginId).maybeSingle(),
    "Failed to load parent user by login ID.",
  );
}

export async function getParentUsersByIds(parentUserIds: string[]) {
  if (parentUserIds.length === 0) {
    return [] satisfies ParentUserRow[];
  }

  return (requireData(
    await supabaseAdmin.from("ParentUser").select("*").in("id", parentUserIds),
    "Failed to load parent users by IDs.",
  ) ?? []) as ParentUserRow[];
}

export async function getTeacherUserById(teacherUserId: string) {
  return requireMaybeSingle<TeacherUserRow>(
    await supabaseAdmin.from("TeacherUser").select("*").eq("id", teacherUserId).maybeSingle(),
    "Failed to load teacher user.",
  );
}

export async function getTeacherUserByClassroom(grade: number, classroom: number) {
  return requireMaybeSingle<TeacherUserRow>(
    await supabaseAdmin
      .from("TeacherUser")
      .select("*")
      .eq("grade", grade)
      .eq("classroom", classroom)
      .maybeSingle(),
    "Failed to load teacher user by classroom.",
  );
}

export async function getReservationByParentUserId(parentUserId: string) {
  return requireMaybeSingle<ReservationRow>(
    await supabaseAdmin
      .from("Reservation")
      .select("*")
      .eq("parentUserId", parentUserId)
      .maybeSingle(),
    "Failed to load reservation by parent user.",
  );
}

export async function getReservationsBySlotIds(slotIds: string[]) {
  if (slotIds.length === 0) {
    return [] satisfies ReservationRow[];
  }

  return (requireData(
    await supabaseAdmin.from("Reservation").select("*").in("slotId", slotIds),
    "Failed to load reservations by slot IDs.",
  ) ?? []) as ReservationRow[];
}

export async function getReservationSlotById(slotId: string) {
  return requireMaybeSingle<ReservationSlotRow>(
    await supabaseAdmin.from("ReservationSlot").select("*").eq("id", slotId).maybeSingle(),
    "Failed to load reservation slot.",
  );
}

export async function getReservationSlotsByClassroom(grade: number, classroom: number) {
  return (requireData(
    await supabaseAdmin
      .from("ReservationSlot")
      .select("*")
      .eq("grade", grade)
      .eq("classroom", classroom)
      .order("date", { ascending: true })
      .order("startDateTime", { ascending: true }),
    "Failed to load reservation slots.",
  ) ?? []) as ReservationSlotRow[];
}

export async function getReservationSlotsByWeek(grade: number, classroom: number, weekKey: string) {
  return (requireData(
    await supabaseAdmin
      .from("ReservationSlot")
      .select("*")
      .eq("grade", grade)
      .eq("classroom", classroom)
      .eq("weekKey", weekKey)
      .order("date", { ascending: true })
      .order("startDateTime", { ascending: true }),
    "Failed to load reservation slots for week.",
  ) ?? []) as ReservationSlotRow[];
}

export async function getReservationSlotsByDate(grade: number, classroom: number, isoDate: string) {
  return (requireData(
    await supabaseAdmin
      .from("ReservationSlot")
      .select("*")
      .eq("grade", grade)
      .eq("classroom", classroom)
      .eq("date", isoDate)
      .order("startDateTime", { ascending: true }),
    "Failed to load reservation slots for date.",
  ) ?? []) as ReservationSlotRow[];
}

export async function getClassScheduleConfigs(grade: number, classroom: number) {
  return (requireData(
    await supabaseAdmin
      .from("ClassScheduleConfig")
      .select("*")
      .eq("grade", grade)
      .eq("classroom", classroom)
      .order("weekKey", { ascending: true }),
    "Failed to load class schedule configs.",
  ) ?? []) as ClassScheduleConfigRow[];
}

export async function getTeacherNotifications(teacherUserId: string, limit = 12) {
  return (requireData(
    await supabaseAdmin
      .from("TeacherNotification")
      .select("*")
      .eq("teacherUserId", teacherUserId)
      .order("createdAt", { ascending: false })
      .limit(limit),
    "Failed to load teacher notifications.",
  ) ?? []) as TeacherNotificationRow[];
}

export async function countTeacherUnreadNotifications(teacherUserId: string) {
  const { count, error } = await supabaseAdmin
    .from("TeacherNotification")
    .select("id", { count: "exact", head: true })
    .eq("teacherUserId", teacherUserId)
    .eq("isRead", false);

  if (error) {
    throw new Error(`Failed to count unread teacher notifications. ${error.message}`);
  }

  return count ?? 0;
}
