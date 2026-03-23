import { prisma } from "@/lib/db/prisma";

export async function createTeacherNotification(input: {
  teacherUserId: string;
  title: string;
  message: string;
  reservationId?: string;
}) {
  return prisma.teacherNotification.create({
    data: {
      teacherUserId: input.teacherUserId,
      reservationId: input.reservationId,
      title: input.title,
      message: input.message,
    },
  });
}
