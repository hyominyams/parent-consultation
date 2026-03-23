import { SlotStatus } from "@prisma/client";
import { eachDayOfInterval, format } from "date-fns";
import { ko } from "date-fns/locale";

import { CONSULTATION_WEEKS } from "@/lib/config/schedule";
import { prisma } from "@/lib/db/prisma";
import { ensureClassSchedule } from "@/lib/schedule";
import { formatGradeClassroom, formatPhoneNumber, maskStudentName, parseTimeLabel, toClassroomValue } from "@/lib/utils";

type SlotWithReservation = Awaited<ReturnType<typeof getRawSlots>>[number];

async function getRawSlots(grade: number, classroom: number) {
  return prisma.reservationSlot.findMany({
    where: {
      grade,
      classroom,
    },
    include: {
      reservation: {
        include: {
          parentUser: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { startDateTime: "asc" }],
  });
}

function buildDayRange(week: (typeof CONSULTATION_WEEKS)[number]) {
  return eachDayOfInterval({
    start: new Date(`${week.startDate}T00:00:00+09:00`),
    end: new Date(`${week.endDate}T00:00:00+09:00`),
  });
}

function buildWeekCalendar(slots: SlotWithReservation[], mode: "parent" | "teacher") {
  return CONSULTATION_WEEKS.map((week) => {
    const weekSlots = slots.filter((slot) => slot.weekKey === week.weekKey);
    const days = buildDayRange(week).map((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      const daySlots = weekSlots
        .filter((slot) => format(slot.date, "yyyy-MM-dd") === dateKey)
        .map((slot) => {
          const { startLabel, endLabel } = parseTimeLabel(slot.timeLabel);
          const reservation = slot.reservation;

          return {
            id: slot.id,
            status: slot.status,
            startLabel,
            endLabel,
            timeLabel: slot.timeLabel,
            dateKey,
            reservedStudentName:
              reservation && mode === "teacher"
                ? reservation.parentUser.studentName
                : reservation
                  ? maskStudentName(reservation.parentUser.studentName)
                  : undefined,
            reservedParentName: reservation?.parentUser.parentName,
            reservedPhone:
              mode === "teacher" && reservation
                ? formatPhoneNumber(reservation.parentUser.phone)
                : undefined,
            reservedConsultationType: reservation?.consultationType,
            reservationCreatedAt: reservation?.createdAt,
          };
        });

      return {
        dateKey,
        dayNumber: format(day, "dd"),
        monthLabel: format(day, "M월", { locale: ko }),
        weekdayLabel: format(day, "EEE", { locale: ko }),
        fullLabel: format(day, "M월 d일 (EEE)", { locale: ko }),
        slots: daySlots,
      };
    });

    return {
      weekKey: week.weekKey,
      label: week.label,
      description: week.description,
      days,
    };
  });
}

function buildDailySummary(slots: SlotWithReservation[]) {
  const summary = new Map<
    string,
    {
      label: string;
      total: number;
      booked: number;
      blocked: number;
      open: number;
    }
  >();

  for (const slot of slots) {
    const dateKey = format(slot.date, "yyyy-MM-dd");

    if (!summary.has(dateKey)) {
      summary.set(dateKey, {
        label: format(slot.date, "M/d (EEE)", { locale: ko }),
        total: 0,
        booked: 0,
        blocked: 0,
        open: 0,
      });
    }

    const item = summary.get(dateKey)!;
    item.total += 1;

    if (slot.status === SlotStatus.BOOKED) {
      item.booked += 1;
    } else if (slot.status === SlotStatus.BLOCKED) {
      item.blocked += 1;
    } else {
      item.open += 1;
    }
  }

  return Array.from(summary.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, item]) => ({
      dateKey,
      ...item,
    }));
}

export async function getParentCalendarData(parentUserId: string) {
  const parent = await prisma.parentUser.findUnique({
    where: { id: parentUserId },
    include: {
      reservation: {
        include: {
          slot: true,
        },
      },
    },
  });

  if (!parent) {
    return null;
  }

  const classroom = toClassroomValue(parent.classroom);
  await ensureClassSchedule(parent.grade, classroom);

  const [teacher, slots] = await Promise.all([
    prisma.teacherUser.findUnique({
      where: {
        grade_classroom: {
          grade: parent.grade,
          classroom,
        },
      },
    }),
    getRawSlots(parent.grade, classroom),
  ]);

  return {
    parent: {
      id: parent.id,
      loginId: parent.loginId,
      grade: parent.grade,
      classroom,
      studentName: parent.studentName,
      parentName: parent.parentName,
      classLabel: formatGradeClassroom(parent.grade, classroom),
    },
    teacher: teacher
      ? {
          name: teacher.teacherName,
        }
      : null,
    hasReservation: Boolean(parent.reservation),
    reservation: parent.reservation
      ? {
          id: parent.reservation.id,
          date: parent.reservation.slot.date,
          timeLabel: parent.reservation.slot.timeLabel,
        }
      : null,
    weeks: buildWeekCalendar(slots, "parent"),
  };
}

export async function getParentDashboardData(parentUserId: string) {
  const parent = await prisma.parentUser.findUnique({
    where: { id: parentUserId },
    include: {
      reservation: {
        include: {
          slot: true,
        },
      },
    },
  });

  if (!parent) {
    return null;
  }

  const classroom = toClassroomValue(parent.classroom);

  const teacher = await prisma.teacherUser.findUnique({
    where: {
      grade_classroom: {
        grade: parent.grade,
        classroom,
      },
    },
  });

  return {
    parent: {
      loginId: parent.loginId,
      studentName: parent.studentName,
      parentName: parent.parentName,
      phone: formatPhoneNumber(parent.phone),
      classLabel: formatGradeClassroom(parent.grade, classroom),
    },
    teacher: teacher?.teacherName ?? "배정 예정",
    reservation: parent.reservation
      ? {
          id: parent.reservation.id,
          date: parent.reservation.slot.date,
          timeLabel: parent.reservation.slot.timeLabel,
          weekKey: parent.reservation.slot.weekKey,
          consultationType: parent.reservation.consultationType,
        }
      : null,
  };
}

export async function getTeacherDashboardData(teacherUserId: string) {
  const teacher = await prisma.teacherUser.findUnique({
    where: { id: teacherUserId },
  });

  if (!teacher) {
    return null;
  }

  await ensureClassSchedule(teacher.grade, teacher.classroom);

  const [slots, configs, notifications] = await Promise.all([
    getRawSlots(teacher.grade, teacher.classroom),
    prisma.classScheduleConfig.findMany({
      where: {
        grade: teacher.grade,
        classroom: teacher.classroom,
      },
      orderBy: {
        weekKey: "asc",
      },
    }),
    prisma.teacherNotification.findMany({
      where: {
        teacherUserId: teacher.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
    }),
  ]);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return {
    teacher: {
      id: teacher.id,
      name: teacher.teacherName,
      grade: teacher.grade,
      classroom: teacher.classroom,
      classLabel: formatGradeClassroom(teacher.grade, teacher.classroom),
    },
    weeks: buildWeekCalendar(slots, "teacher"),
    summary: buildDailySummary(slots),
    configs: configs.map((config) => ({
      id: config.id,
      weekKey: config.weekKey,
      slotIntervalMinutes: config.slotIntervalMinutes,
      startTime: config.startTime,
      endTime: config.endTime,
      weekLabel: CONSULTATION_WEEKS.find((week) => week.weekKey === config.weekKey)?.label ?? config.weekKey,
    })),
    notifications: notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    })),
    unreadCount,
  };
}

export type ParentCalendarData = NonNullable<Awaited<ReturnType<typeof getParentCalendarData>>>;
export type ParentDashboardData = NonNullable<Awaited<ReturnType<typeof getParentDashboardData>>>;
export type TeacherDashboardData = NonNullable<Awaited<ReturnType<typeof getTeacherDashboardData>>>;
