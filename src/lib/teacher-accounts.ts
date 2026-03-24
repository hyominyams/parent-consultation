import bcrypt from "bcryptjs";

import { createId, nowIsoString, requireMaybeSingle } from "@/lib/db/helpers";
import { supabaseAdmin } from "@/lib/db/supabase";
import type { TeacherUserRow } from "@/lib/db/types";
import { buildTeacherPassword, getConfiguredTeacherName } from "@/lib/config/teachers";

type SyncTeacherAccountInput = {
  grade: number;
  classroom: number;
};

type SyncTeacherAccountOptions = {
  syncPassword?: boolean;
};

function isUniqueViolation(error: { code?: string } | null | undefined) {
  return error?.code === "23505";
}

export async function syncTeacherAccount(
  input: SyncTeacherAccountInput,
  options: SyncTeacherAccountOptions = {},
) {
  const teacherName = getConfiguredTeacherName(input.grade, input.classroom);
  const expectedPassword = buildTeacherPassword(input);

  const existingTeacher = requireMaybeSingle<TeacherUserRow>(
    await supabaseAdmin
      .from("TeacherUser")
      .select("*")
      .eq("grade", input.grade)
      .eq("classroom", input.classroom)
      .maybeSingle(),
    "Failed to load teacher account.",
  );

  if (!existingTeacher) {
    const { data, error } = await supabaseAdmin
      .from("TeacherUser")
      .insert({
        id: createId(),
        grade: input.grade,
        classroom: input.classroom,
        teacherName,
        passwordHash: await bcrypt.hash(expectedPassword, 10),
        updatedAt: nowIsoString(),
      })
      .select("*")
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        return requireMaybeSingle<TeacherUserRow>(
          await supabaseAdmin
            .from("TeacherUser")
            .select("*")
            .eq("grade", input.grade)
            .eq("classroom", input.classroom)
            .maybeSingle(),
          "Failed to reload teacher account.",
        );
      }

      throw new Error(`Failed to create teacher account. ${error.message}`);
    }

    return data as TeacherUserRow;
  }

  const shouldSyncPassword =
    options.syncPassword &&
    !(await bcrypt.compare(expectedPassword, existingTeacher.passwordHash));
  const shouldSyncName = existingTeacher.teacherName !== teacherName;

  if (!shouldSyncName && !shouldSyncPassword) {
    return existingTeacher;
  }

  const { data, error } = await supabaseAdmin
    .from("TeacherUser")
    .update({
      teacherName,
      ...(shouldSyncPassword
        ? { passwordHash: await bcrypt.hash(expectedPassword, 10) }
        : undefined),
      updatedAt: nowIsoString(),
    })
    .eq("id", existingTeacher.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update teacher account. ${error.message}`);
  }

  return data as TeacherUserRow;
}
