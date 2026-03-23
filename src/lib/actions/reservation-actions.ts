"use server";

import { ConsultationType, Prisma, SlotStatus } from "@prisma/client";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { revalidatePath } from "next/cache";

import { requireParentSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { BLOCKED_SLOT_MESSAGE, TAKEN_SLOT_MESSAGE, getReservationBlockReason } from "@/lib/reservations";
import { reservationActionSchema } from "@/lib/validators";
import { toClassroomValue } from "@/lib/utils";
import type { ActionState } from "@/types/action-state";

function reservationErrorState(code: string): ActionState {
  switch (code) {
    case "ALREADY_RESERVED":
      return {
        status: "error",
        message: "이미 상담을 신청하셨습니다. 대시보드에서 수정 또는 삭제해주세요.",
      };
    case "BLOCKED":
      return {
        status: "error",
        message: BLOCKED_SLOT_MESSAGE,
      };
    case "TAKEN":
    case "DUPLICATE_DATE":
      return {
        status: "error",
        message: TAKEN_SLOT_MESSAGE,
      };
    default:
      return {
        status: "error",
        message: "예약 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      };
  }
}

function getReservationPersistenceErrorCode(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  if (error.code === "P2034") {
    return "TAKEN";
  }

  if (error.code !== "P2002") {
    return null;
  }

  const target = Array.isArray(error.meta?.target)
    ? error.meta.target
    : typeof error.meta?.target === "string"
      ? [error.meta.target]
      : [];

  if (target.includes("parentUserId")) {
    return "ALREADY_RESERVED";
  }

  if (target.includes("slotId")) {
    return "DUPLICATE_DATE";
  }

  return "TAKEN";
}

export async function bookReservationAction(
  slotId: string,
  consultationType: "PHONE" | "IN_PERSON"
): Promise<ActionState> {
  const session = await requireParentSession();
  const parsed = reservationActionSchema.safeParse({ slotId, consultationType });

  if (!parsed.success) {
    return {
      status: "error",
      message: "잘못된 슬롯 요청입니다.",
    };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const parent = await tx.parentUser.findUnique({
          where: {
            id: session.userId,
          },
          include: {
            reservation: true,
          },
        });

        if (!parent) {
          throw new Error("NOT_FOUND");
        }

        const classroom = toClassroomValue(parent.classroom);
        const slot = await tx.reservationSlot.findUnique({
          where: {
            id: parsed.data.slotId,
          },
          include: {
            reservation: true,
          },
        });

        if (!slot || slot.grade !== parent.grade || slot.classroom !== classroom) {
          throw new Error("NOT_ALLOWED");
        }

        const blockReason = getReservationBlockReason({
          hasExistingReservation: Boolean(parent.reservation),
          slotStatus: slot.status,
          hasSlotReservation: Boolean(slot.reservation),
        });

        if (blockReason) {
          throw new Error(blockReason);
        }

        const overlappingReservation = await tx.reservation.findFirst({
          where: {
            slot: {
              grade: slot.grade,
              classroom: slot.classroom,
              startDateTime: slot.startDateTime,
            },
          },
          select: {
            id: true,
          },
        });

        if (overlappingReservation) {
          throw new Error("DUPLICATE_DATE");
        }

        const reservation = await tx.reservation.create({
          data: {
            parentUserId: parent.id,
            slotId: slot.id,
            consultationType: parsed.data.consultationType as ConsultationType,
          },
        });

        await tx.reservationSlot.update({
          where: {
            id: slot.id,
          },
          data: {
            status: SlotStatus.BOOKED,
          },
        });

        const teacher = await tx.teacherUser.findUnique({
          where: {
            grade_classroom: {
              grade: slot.grade,
              classroom: slot.classroom,
            },
          },
        });

        if (teacher) {
          await tx.teacherNotification.create({
            data: {
              teacherUserId: teacher.id,
              reservationId: reservation.id,
              title: "새 상담 신청",
              message: `${parent.studentName} 학생이 ${format(slot.startDateTime, "M월 d일 HH:mm", {
                locale: ko,
              })} 상담을 신청했습니다.`,
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    const persistenceErrorCode = getReservationPersistenceErrorCode(error);

    if (persistenceErrorCode) {
      return reservationErrorState(persistenceErrorCode);
    }

    if (error instanceof Error) {
      return reservationErrorState(error.message);
    }

    return reservationErrorState("UNKNOWN");
  }

  revalidatePath("/reserve");
  revalidatePath("/dashboard");
  revalidatePath("/teacher/dashboard");
  revalidatePath("/teacher/settings");
  revalidatePath("/teacher/availability");

  return {
    status: "success",
    message: "상담 신청이 완료되었습니다.",
    redirectTo: "/dashboard",
  };
}

export async function deleteReservationAction(
  intent: "delete" | "reschedule" = "delete",
): Promise<ActionState> {
  const session = await requireParentSession();

  const parent = await prisma.parentUser.findUnique({
    where: {
      id: session.userId,
    },
    include: {
      reservation: {
        include: {
          slot: true,
        },
      },
    },
  });

  if (!parent?.reservation) {
    return {
      status: "error",
      message: "삭제할 예약이 없습니다.",
    };
  }

  const reservation = parent.reservation;

  await prisma.$transaction(async (tx) => {
    await tx.reservation.delete({
      where: {
        id: reservation.id,
      },
    });

    await tx.reservationSlot.update({
      where: {
        id: reservation.slotId,
      },
      data: {
        status: SlotStatus.OPEN,
      },
    });

    const teacher = await tx.teacherUser.findUnique({
      where: {
        grade_classroom: {
          grade: reservation.slot.grade,
          classroom: reservation.slot.classroom,
        },
      },
    });

    if (teacher) {
      await tx.teacherNotification.create({
        data: {
          teacherUserId: teacher.id,
          title: intent === "reschedule" ? "예약 변경 요청" : "예약 취소",
          message:
            intent === "reschedule"
              ? `${parent.studentName} 학생이 기존 예약을 취소하고 새 시간을 선택하려고 합니다.`
              : `${parent.studentName} 학생의 상담 예약이 취소되었습니다.`,
        },
      });
    }
  });

  revalidatePath("/reserve");
  revalidatePath("/dashboard");
  revalidatePath("/teacher/dashboard");
  revalidatePath("/teacher/settings");
  revalidatePath("/teacher/availability");

  return {
    status: "success",
    message:
      intent === "reschedule"
        ? "기존 예약이 취소되었습니다. 새 시간을 선택해주세요."
        : "신청 내역이 삭제되었습니다.",
    redirectTo: intent === "reschedule" ? "/reserve" : "/dashboard",
  };
}
