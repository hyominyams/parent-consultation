import bcrypt from "bcryptjs";

import { buildTeacherPassword, getConfiguredTeacherName } from "@/lib/config/teachers";
import { prisma } from "@/lib/db/prisma";

type SyncTeacherAccountInput = {
  grade: number;
  classroom: number;
};

type SyncTeacherAccountOptions = {
  syncPassword?: boolean;
};

export async function syncTeacherAccount(
  input: SyncTeacherAccountInput,
  options: SyncTeacherAccountOptions = {},
) {
  const teacherName = getConfiguredTeacherName(input.grade, input.classroom);
  const expectedPassword = buildTeacherPassword(input);

  const existingTeacher = await prisma.teacherUser.findUnique({
    where: {
      grade_classroom: {
        grade: input.grade,
        classroom: input.classroom,
      },
    },
  });

  if (!existingTeacher) {
    return prisma.teacherUser.create({
      data: {
        grade: input.grade,
        classroom: input.classroom,
        teacherName,
        passwordHash: await bcrypt.hash(expectedPassword, 10),
      },
    });
  }

  const shouldSyncPassword =
    options.syncPassword &&
    !(await bcrypt.compare(expectedPassword, existingTeacher.passwordHash));
  const shouldSyncName = existingTeacher.teacherName !== teacherName;

  if (!shouldSyncName && !shouldSyncPassword) {
    return existingTeacher;
  }

  return prisma.teacherUser.update({
    where: {
      id: existingTeacher.id,
    },
    data: {
      teacherName,
      ...(shouldSyncPassword
        ? { passwordHash: await bcrypt.hash(expectedPassword, 10) }
        : undefined),
    },
  });
}
