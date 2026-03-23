"use server";

import { SlotStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireTeacherSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { rebuildWeekSlots } from "@/lib/schedule";
import { combineKstDateTime } from "@/lib/utils";
import {
  teacherDateAvailabilitySchema,
  teacherNotificationSchema,
  teacherSlotToggleSchema,
  teacherWeekConfigSchema,
} from "@/lib/validators";
import type { ActionState } from "@/types/action-state";

const TEACHER_PORTAL_PATHS = ["/teacher/dashboard", "/teacher/settings", "/teacher/availability"] as const;

function revalidateTeacherPortal() {
  for (const path of TEACHER_PORTAL_PATHS) {
    revalidatePath(path);
  }
}

export async function toggleTeacherSlotAction(slotId: string): Promise<ActionState> {
  const session = await requireTeacherSession();
  const parsed = teacherSlotToggleSchema.safeParse({ slotId });

  if (!parsed.success) {
    return {
      status: "error",
      message: "슬롯 정보를 다시 확인해주세요.",
    };
  }

  const slot = await prisma.reservationSlot.findUnique({
    where: {
      id: parsed.data.slotId,
    },
    include: {
      reservation: true,
    },
  });

  if (!slot || slot.grade !== session.grade || slot.classroom !== session.classroom) {
    return {
      status: "error",
      message: "해당 슬롯에 접근할 수 없습니다.",
    };
  }

  if (slot.reservation || slot.status === SlotStatus.BOOKED) {
    return {
      status: "error",
      message: "이미 예약된 슬롯은 변경할 수 없습니다.",
    };
  }

  await prisma.reservationSlot.update({
    where: {
      id: slot.id,
    },
    data: {
      status: slot.status === SlotStatus.BLOCKED ? SlotStatus.OPEN : SlotStatus.BLOCKED,
    },
  });

  revalidateTeacherPortal();
  revalidatePath("/reserve");

  return {
    status: "success",
    message:
      slot.status === SlotStatus.BLOCKED
        ? "슬롯을 다시 신청 가능 상태로 열었습니다."
        : "슬롯을 신청 불가 상태로 변경했습니다.",
  };
}

export async function toggleTeacherDateAvailabilityAction(dateKey: string): Promise<ActionState> {
  const session = await requireTeacherSession();
  const parsed = teacherDateAvailabilitySchema.safeParse({ dateKey });

  if (!parsed.success) {
    return {
      status: "error",
      message: "날짜 정보를 다시 확인해주세요.",
    };
  }

  const slots = await prisma.reservationSlot.findMany({
    where: {
      grade: session.grade,
      classroom: session.classroom,
      date: combineKstDateTime(parsed.data.dateKey, "00:00"),
    },
    include: {
      reservation: true,
    },
    orderBy: {
      startDateTime: "asc",
    },
  });

  if (slots.length === 0) {
    return {
      status: "error",
      message: "해당 날짜의 상담 슬롯을 찾을 수 없습니다.",
    };
  }

  const modifiableSlots = slots.filter((slot) => !slot.reservation && slot.status !== SlotStatus.BOOKED);

  if (modifiableSlots.length === 0) {
    return {
      status: "error",
      message: "이미 예약된 시간만 남아 있어 날짜 상태를 바꿀 수 없습니다.",
    };
  }

  const shouldOpen = modifiableSlots.every((slot) => slot.status === SlotStatus.BLOCKED);

  await prisma.reservationSlot.updateMany({
    where: {
      id: {
        in: modifiableSlots.map((slot) => slot.id),
      },
    },
    data: {
      status: shouldOpen ? SlotStatus.OPEN : SlotStatus.BLOCKED,
    },
  });

  revalidateTeacherPortal();
  revalidatePath("/reserve");

  return {
    status: "success",
    message: shouldOpen
      ? "해당 날짜의 닫힌 시간을 다시 신청 가능 상태로 열었습니다."
      : "해당 날짜의 신청 가능 시간을 모두 닫았습니다.",
  };
}

export async function updateTeacherWeekConfigAction(input: {
  weekKey: string;
  slotIntervalMinutes: number;
  startTime: string;
  endTime: string;
}): Promise<ActionState> {
  const session = await requireTeacherSession();
  const parsed = teacherWeekConfigSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: "캘린더 설정을 다시 확인해주세요.",
    };
  }

  try {
    await rebuildWeekSlots({
      grade: session.grade,
      classroom: session.classroom,
      ...parsed.data,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "설정 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  revalidateTeacherPortal();
  revalidatePath("/reserve");

  return {
    status: "success",
    message: "교사용 캘린더 설정이 저장되었습니다.",
  };
}

export async function markTeacherNotificationReadAction(
  notificationId: string,
): Promise<ActionState> {
  const session = await requireTeacherSession();
  const parsed = teacherNotificationSchema.safeParse({ notificationId });

  if (!parsed.success) {
    return {
      status: "error",
      message: "알림 정보를 다시 확인해주세요.",
    };
  }

  await prisma.teacherNotification.updateMany({
    where: {
      id: parsed.data.notificationId,
      teacherUserId: session.userId,
    },
    data: {
      isRead: true,
    },
  });

  revalidateTeacherPortal();

  return {
    status: "success",
    message: "알림을 읽음 처리했습니다.",
  };
}

export async function markAllTeacherNotificationsReadAction(): Promise<ActionState> {
  const session = await requireTeacherSession();

  await prisma.teacherNotification.updateMany({
    where: {
      teacherUserId: session.userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  revalidateTeacherPortal();

  return {
    status: "success",
    message: "모든 알림을 읽음 처리했습니다.",
  };
}
