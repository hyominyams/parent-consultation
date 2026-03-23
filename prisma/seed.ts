import { PrismaClient, SlotStatus, UserType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addMinutes, eachDayOfInterval, format, isAfter, parse } from "date-fns";

import { CONSENT_VERSION } from "../src/lib/config/consent";
import {
  CONSULTATION_WEEKS,
  DEFAULT_SCHEDULE_CONFIG,
  DEFAULT_TEACHER_SEEDS,
} from "../src/lib/config/schedule";

const prisma = new PrismaClient();

function generateTimeBlocks(input: {
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
}) {
  const baseDate = "2026-01-01";
  const start = parse(`${baseDate} ${input.startTime}`, "yyyy-MM-dd HH:mm", new Date());
  const end = parse(`${baseDate} ${input.endTime}`, "yyyy-MM-dd HH:mm", new Date());
  const items: Array<{ startLabel: string; endLabel: string; timeLabel: string }> = [];

  let current = start;

  while (!isAfter(addMinutes(current, input.slotIntervalMinutes), end)) {
    const next = addMinutes(current, input.slotIntervalMinutes);
    const startLabel = format(current, "HH:mm");
    const endLabel = format(next, "HH:mm");

    items.push({
      startLabel,
      endLabel,
      timeLabel: `${startLabel}-${endLabel}`,
    });

    current = next;
  }

  return items;
}

function combineKstDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00+09:00`);
}

function buildSlotPayload(input: {
  grade: number;
  classroom: number;
  weekKey: string;
  startDate: string;
  endDate: string;
  slotIntervalMinutes: number;
  startTime: string;
  endTime: string;
}) {
  const blocks = generateTimeBlocks(input);
  const days = eachDayOfInterval({
    start: combineKstDateTime(input.startDate, "00:00"),
    end: combineKstDateTime(input.endDate, "00:00"),
  });

  return days.flatMap((day) => {
    const dateKey = format(day, "yyyy-MM-dd");

    return blocks.map((block) => ({
      grade: input.grade,
      classroom: input.classroom,
      weekKey: input.weekKey,
      date: combineKstDateTime(dateKey, "00:00"),
      timeLabel: block.timeLabel,
      startDateTime: combineKstDateTime(dateKey, block.startLabel),
      endDateTime: combineKstDateTime(dateKey, block.endLabel),
      status: SlotStatus.OPEN,
    }));
  });
}

async function seedTeachersAndSchedules() {
  for (const teacherSeed of DEFAULT_TEACHER_SEEDS) {
    await prisma.teacherUser.create({
      data: {
        grade: teacherSeed.grade,
        classroom: teacherSeed.classroom,
        teacherName: teacherSeed.teacherName,
        passwordHash: await bcrypt.hash(teacherSeed.password, 10),
      },
    });

    for (const week of CONSULTATION_WEEKS) {
      await prisma.classScheduleConfig.create({
        data: {
          grade: teacherSeed.grade,
          classroom: teacherSeed.classroom,
          weekKey: week.weekKey,
          ...DEFAULT_SCHEDULE_CONFIG,
        },
      });

      await prisma.reservationSlot.createMany({
        data: buildSlotPayload({
          grade: teacherSeed.grade,
          classroom: teacherSeed.classroom,
          weekKey: week.weekKey,
          startDate: week.startDate,
          endDate: week.endDate,
          slotIntervalMinutes: DEFAULT_SCHEDULE_CONFIG.slotIntervalMinutes,
          startTime: DEFAULT_SCHEDULE_CONFIG.startTime,
          endTime: DEFAULT_SCHEDULE_CONFIG.endTime,
        }),
      });
    }
  }
}

async function seedSampleReservations() {
  const parents = await Promise.all([
    prisma.parentUser.create({
      data: {
        loginId: "6107",
        grade: 6,
        classroom: 1,
        studentNumber: 7,
        studentName: "김민수",
        parentName: "김지은",
        phone: "01012341234",
        pinHash: await bcrypt.hash("1234", 10),
      },
    }),
    prisma.parentUser.create({
      data: {
        loginId: "6112",
        grade: 6,
        classroom: 1,
        studentNumber: 12,
        studentName: "박서연",
        parentName: "박현정",
        phone: "01056785678",
        pinHash: await bcrypt.hash("5678", 10),
      },
    }),
  ]);

  await prisma.consentRecord.createMany({
    data: parents.map((parent) => ({
      userType: UserType.PARENT,
      parentUserId: parent.id,
      privacyConsent: true,
      thirdPartyConsent: true,
      consentVersion: CONSENT_VERSION,
    })),
  });

  const targetSlots = await prisma.reservationSlot.findMany({
    where: {
      grade: 6,
      classroom: 1,
      weekKey: "2026-03-30",
    },
    orderBy: [{ date: "asc" }, { startDateTime: "asc" }],
    take: 2,
  });

  const homeroomTeacher = await prisma.teacherUser.findUnique({
    where: {
      grade_classroom: {
        grade: 6,
        classroom: 1,
      },
    },
  });

  for (const [index, slot] of targetSlots.entries()) {
    const parent = parents[index];
    const reservation = await prisma.reservation.create({
      data: {
        parentUserId: parent.id,
        slotId: slot.id,
        consultationType: "IN_PERSON",
      },
    });

    await prisma.reservationSlot.update({
      where: {
        id: slot.id,
      },
      data: {
        status: SlotStatus.BOOKED,
      },
    });

    if (homeroomTeacher) {
      await prisma.teacherNotification.create({
        data: {
          teacherUserId: homeroomTeacher.id,
          reservationId: reservation.id,
          title: "새 상담 신청",
          message: `${parent.studentName} 학생이 ${format(slot.startDateTime, "M월 d일 HH:mm")} 상담을 신청했습니다.`,
          isRead: index === 0,
        },
      });
    }
  }
}

async function main() {
  await prisma.teacherNotification.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.reservationSlot.deleteMany();
  await prisma.classScheduleConfig.deleteMany();
  await prisma.consentRecord.deleteMany();
  await prisma.parentUser.deleteMany();
  await prisma.teacherUser.deleteMany();

  await seedTeachersAndSchedules();
  await seedSampleReservations();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
