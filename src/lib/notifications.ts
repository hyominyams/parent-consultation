import { createId } from "@/lib/db/helpers";
import { supabaseAdmin } from "@/lib/db/supabase";

export async function createTeacherNotification(input: {
  teacherUserId: string;
  title: string;
  message: string;
  reservationId?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("TeacherNotification")
    .insert({
      id: createId(),
      teacherUserId: input.teacherUserId,
      reservationId: input.reservationId ?? null,
      title: input.title,
      message: input.message,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create teacher notification. ${error.message}`);
  }

  return data;
}
