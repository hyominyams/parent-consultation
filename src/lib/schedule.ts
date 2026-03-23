import { Prisma, SlotStatus } from "@prisma/client";
import { eachDayOfInterval, format } from "date-fns";

import { DEFAULT_SCHEDULE_CONFIG, CONSULTATION_WEEKS } from "@/lib/config/schedule";
import { prisma } from "@/lib/db/prisma";
import { combineKstDateTime, generateTimeBlocks } from "@/lib/utils";

type ScheduleClient = typeof prisma | Prisma.TransactionClient;

export function buildSlotPayload(input: {
  grade: number;
  classroom: number;
  weekKey: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
}) {
  const timeBlocks = generateTimeBlocks({
    startTime: input.startTime,
    endTime: input.endTime,
    slotIntervalMinutes: input.slotIntervalMinutes,
  });

  const days = eachDayOfInterval({
    start: combineKstDateTime(input.startDate, "00:00"),
    end: combineKstDateTime(input.endDate, "00:00"),
  });

  return days.flatMap((day) => {
    const isoDate = format(day, "yyyy-MM-dd");

    return timeBlocks.map((block) => ({
      grade: input.grade,
      classroom: input.classroom,
      weekKey: input.weekKey,
      date: combineKstDateTime(isoDate, "00:00"),
      timeLabel: block.timeLabel,
      startDateTime: combineKstDateTime(isoDate, block.startLabel),
      endDateTime: combineKstDateTime(isoDate, block.endLabel),
      status: SlotStatus.OPEN,
    }));
  });
}

async function ensureWeekSchedule(
  client: ScheduleClient,
  input: {
    grade: number;
    classroom: number;
    weekKey: string;
    startDate: string;
    endDate: string;
  },
) {
  const config = await client.classScheduleConfig.upsert({
    where: {
      grade_classroom_weekKey: {
        grade: input.grade,
        classroom: input.classroom,
        weekKey: input.weekKey,
      },
    },
    update: {},
    create: {
      grade: input.grade,
      classroom: input.classroom,
      weekKey: input.weekKey,
      ...DEFAULT_SCHEDULE_CONFIG,
    },
  });

  const slotCount = await client.reservationSlot.count({
    where: {
      grade: input.grade,
      classroom: input.classroom,
      weekKey: input.weekKey,
    },
  });

  if (slotCount > 0) {
    return;
  }

  const slotPayload = buildSlotPayload({
    grade: input.grade,
    classroom: input.classroom,
    weekKey: input.weekKey,
    startDate: input.startDate,
    endDate: input.endDate,
    startTime: config.startTime,
    endTime: config.endTime,
    slotIntervalMinutes: config.slotIntervalMinutes,
  });

  await client.reservationSlot.createMany({
    data: slotPayload,
    skipDuplicates: true,
  });
}

export async function ensureClassSchedule(grade: number, classroom: number) {
  await prisma.$transaction(async (tx) => {
    for (const week of CONSULTATION_WEEKS) {
      await ensureWeekSchedule(tx, {
        grade,
        classroom,
        weekKey: week.weekKey,
        startDate: week.startDate,
        endDate: week.endDate,
      });
    }
  });
}

export async function rebuildWeekSlots(input: {
  grade: number;
  classroom: number;
  weekKey: string;
  slotIntervalMinutes: number;
  startTime: string;
  endTime: string;
}) {
  const week = CONSULTATION_WEEKS.find((item) => item.weekKey === input.weekKey);

  if (!week) {
    throw new Error("존재하지 않는 주차 설정입니다.");
  }

  const reservationCount = await prisma.reservation.count({
    where: {
      slot: {
        grade: input.grade,
        classroom: input.classroom,
        weekKey: input.weekKey,
      },
    },
  });

  if (reservationCount > 0) {
    throw new Error("이미 예약이 존재하는 주차는 시간 설정을 바꿀 수 없습니다.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.classScheduleConfig.upsert({
      where: {
        grade_classroom_weekKey: {
          grade: input.grade,
          classroom: input.classroom,
          weekKey: input.weekKey,
        },
      },
      update: {
        slotIntervalMinutes: input.slotIntervalMinutes,
        startTime: input.startTime,
        endTime: input.endTime,
      },
      create: {
        grade: input.grade,
        classroom: input.classroom,
        weekKey: input.weekKey,
        slotIntervalMinutes: input.slotIntervalMinutes,
        startTime: input.startTime,
        endTime: input.endTime,
      },
    });

    await tx.reservationSlot.deleteMany({
      where: {
        grade: input.grade,
        classroom: input.classroom,
        weekKey: input.weekKey,
      },
    });

    await tx.reservationSlot.createMany({
      data: buildSlotPayload({
        grade: input.grade,
        classroom: input.classroom,
        weekKey: input.weekKey,
        startDate: week.startDate,
        endDate: week.endDate,
        startTime: input.startTime,
        endTime: input.endTime,
        slotIntervalMinutes: input.slotIntervalMinutes,
      }),
      skipDuplicates: true,
    });
  });
}
