import { CONSULTATION_WEEKS } from "@/lib/config/schedule";
import { getTeacherDisplayName } from "@/lib/config/teachers";
import {
  countTeacherUnreadNotifications,
  getClassScheduleConfigs,
  getParentUserById,
  getParentUsersByIds,
  getReservationByParentUserId,
  getReservationsBySlotIds,
  getReservationSlotById,
  getReservationSlotsByClassroom,
  getTeacherNotifications,
  getTeacherUserById,
} from "@/lib/db/queries";
import type { ParentUserRow, ReservationRow, ReservationSlotRow } from "@/lib/db/types";
import { ensureClassScheduleReady } from "@/lib/schedule";
import { syncTeacherAccount } from "@/lib/teacher-accounts";
import {
  buildWeekdayDateKeys,
  formatDateKeyFull,
  formatDateKeyMonthSlashDay,
  formatDateKeyWeekday,
  formatGradeClassroom,
  getDateKeyDayNumber,
  getDateKeyMonthLabel,
  formatPhoneNumber,
  isWeekdayDateKey,
  maskStudentName,
  parseTimeLabel,
  toKstDateKey,
  toClassroomValue,
} from "@/lib/utils";

type ReservationWithParent = ReservationRow & {
  parentUser: ParentUserRow | null;
};

type SlotWithReservation = ReservationSlotRow & {
  reservation: ReservationWithParent | null;
};

async function getRawSlots(grade: number, classroom: number) {
  const slots = await getReservationSlotsByClassroom(grade, classroom);
  const reservations = await getReservationsBySlotIds(slots.map((slot) => slot.id));

  const parentIds = Array.from(new Set(reservations.map((reservation) => reservation.parentUserId)));
  const parents = await getParentUsersByIds(parentIds);
  const parentById = new Map(parents.map((parent) => [parent.id, parent]));
  const reservationBySlotId = new Map(
    reservations.map((reservation) => [
      reservation.slotId,
      {
        ...reservation,
        parentUser: parentById.get(reservation.parentUserId) ?? null,
      },
    ]),
  );

  return slots.map((slot) => ({
    ...slot,
    reservation: reservationBySlotId.get(slot.id) ?? null,
  })) satisfies SlotWithReservation[];
}

type SlotSummaryRow = Pick<ReservationSlotRow, "startDateTime" | "status" | "weekKey">;

type TeacherPortalBaseData = {
  teacher: {
    id: string;
    name: string;
    grade: number;
    classroom: number;
    classLabel: string;
  };
  unreadCount: number;
};

type TeacherPortalContext = {
  grade: number;
  classroom: number;
  teacherUserId: string;
  base: TeacherPortalBaseData;
};

function buildTeacherPortalBaseData(
  teacher: {
    id: string;
    teacherName: string;
    grade: number;
    classroom: number;
  },
  unreadCount: number,
): TeacherPortalBaseData {
  return {
    teacher: {
      id: teacher.id,
      name: getTeacherDisplayName(teacher.teacherName),
      grade: teacher.grade,
      classroom: teacher.classroom,
      classLabel: formatGradeClassroom(teacher.grade, teacher.classroom),
    },
    unreadCount,
  };
}

async function getTeacherPortalContext(teacherUserId: string): Promise<TeacherPortalContext | null> {
  const teacher = await getTeacherUserById(teacherUserId);

  if (!teacher) {
    return null;
  }

  const [syncedTeacher, unreadCount] = await Promise.all([
    syncTeacherAccount({
      grade: teacher.grade,
      classroom: teacher.classroom,
    }),
    countTeacherUnreadNotifications(teacher.id),
  ]);

  const resolvedTeacher = syncedTeacher ?? teacher;

  return {
    grade: teacher.grade,
    classroom: teacher.classroom,
    teacherUserId: teacher.id,
    base: buildTeacherPortalBaseData(resolvedTeacher, unreadCount),
  };
}

function buildWeekCalendar(slots: SlotWithReservation[], mode: "parent" | "teacher") {
  return CONSULTATION_WEEKS.map((week) => {
    const weekSlots = slots.filter((slot) => slot.weekKey === week.weekKey);
    const days = buildWeekdayDateKeys(week.startDate, week.endDate).map((dateKey) => {
      const daySlots = weekSlots
        .filter((slot) => toKstDateKey(slot.startDateTime) === dateKey)
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
              reservation?.parentUser && mode === "teacher"
                ? reservation.parentUser.studentName
                : reservation?.parentUser
                  ? maskStudentName(reservation.parentUser.studentName)
                  : undefined,
            reservedParentName: reservation?.parentUser?.parentName,
            reservedPhone:
              mode === "teacher" && reservation?.parentUser
                ? formatPhoneNumber(reservation.parentUser.phone)
                : undefined,
            reservedConsultationType: reservation?.consultationType,
            reservationCreatedAt: reservation?.createdAt,
          };
        });

      return {
        dateKey,
        dayNumber: getDateKeyDayNumber(dateKey),
        monthLabel: getDateKeyMonthLabel(dateKey),
        weekdayLabel: formatDateKeyWeekday(dateKey),
        fullLabel: formatDateKeyFull(dateKey),
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

function buildDailySummary(slots: SlotSummaryRow[]) {
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
    const dateKey = toKstDateKey(slot.startDateTime);

    if (!isWeekdayDateKey(dateKey)) {
      continue;
    }

    if (!summary.has(dateKey)) {
      summary.set(dateKey, {
        label: `${formatDateKeyMonthSlashDay(dateKey)} (${formatDateKeyWeekday(dateKey)})`,
        total: 0,
        booked: 0,
        blocked: 0,
        open: 0,
      });
    }

    const item = summary.get(dateKey)!;
    item.total += 1;

    if (slot.status === "BOOKED") {
      item.booked += 1;
    } else if (slot.status === "BLOCKED") {
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

function buildWeekSlotSummary(slots: SlotSummaryRow[]) {
  const summary = new Map<
    string,
    {
      totalCount: number;
      bookedCount: number;
    }
  >();

  for (const week of CONSULTATION_WEEKS) {
    summary.set(week.weekKey, {
      totalCount: 0,
      bookedCount: 0,
    });
  }

  for (const slot of slots) {
    if (!isWeekdayDateKey(toKstDateKey(slot.startDateTime))) {
      continue;
    }

    const item = summary.get(slot.weekKey);

    if (!item) {
      continue;
    }

    item.totalCount += 1;

    if (slot.status === "BOOKED") {
      item.bookedCount += 1;
    }
  }

  return summary;
}

export async function getParentCalendarData(parentUserId: string) {
  const parent = await getParentUserById(parentUserId);

  if (!parent) {
    return null;
  }

  const classroom = toClassroomValue(parent.classroom);
  await ensureClassScheduleReady(parent.grade, classroom);
  const reservation = await getReservationByParentUserId(parent.id);
  const reservationSlot = reservation ? await getReservationSlotById(reservation.slotId) : null;

  const [teacher, slots] = await Promise.all([
    syncTeacherAccount({
      grade: parent.grade,
      classroom,
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
          name: getTeacherDisplayName(teacher.teacherName),
        }
      : null,
    hasReservation: Boolean(reservation),
    reservation: reservation && reservationSlot
      ? {
          id: reservation.id,
          date: new Date(reservationSlot.startDateTime),
          timeLabel: reservationSlot.timeLabel,
        }
      : null,
    weeks: buildWeekCalendar(slots, "parent"),
  };
}

export async function getParentDashboardData(parentUserId: string) {
  const parent = await getParentUserById(parentUserId);

  if (!parent) {
    return null;
  }

  const classroom = toClassroomValue(parent.classroom);
  await ensureClassScheduleReady(parent.grade, classroom);
  const reservation = await getReservationByParentUserId(parent.id);
  const reservationSlot = reservation ? await getReservationSlotById(reservation.slotId) : null;
  const teacher = await syncTeacherAccount({
    grade: parent.grade,
    classroom,
  });

  return {
    parent: {
      loginId: parent.loginId,
      studentName: parent.studentName,
      parentName: parent.parentName,
      phone: formatPhoneNumber(parent.phone),
      classLabel: formatGradeClassroom(parent.grade, classroom),
    },
    teacher: getTeacherDisplayName(teacher?.teacherName),
    reservation: reservation && reservationSlot
      ? {
          id: reservation.id,
          date: new Date(reservationSlot.startDateTime),
          timeLabel: reservationSlot.timeLabel,
          weekKey: reservationSlot.weekKey,
          consultationType: reservation.consultationType,
        }
      : null,
  };
}

export async function getTeacherDashboardData(teacherUserId: string) {
  const context = await getTeacherPortalContext(teacherUserId);

  if (!context) {
    return null;
  }

  await ensureClassScheduleReady(context.grade, context.classroom);
  const [slots, notifications] = await Promise.all([
    getReservationSlotsByClassroom(context.grade, context.classroom),
    getTeacherNotifications(context.teacherUserId, 12),
  ]);

  return {
    ...context.base,
    summary: buildDailySummary(slots),
    notifications: notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    })),
  };
}

export async function getTeacherSettingsData(teacherUserId: string) {
  const context = await getTeacherPortalContext(teacherUserId);

  if (!context) {
    return null;
  }

  await ensureClassScheduleReady(context.grade, context.classroom);

  const [configs, slots] = await Promise.all([
    getClassScheduleConfigs(context.grade, context.classroom),
    getReservationSlotsByClassroom(context.grade, context.classroom),
  ]);

  const weekSummary = buildWeekSlotSummary(slots);

  return {
    ...context.base,
    configs: configs.map((config) => {
      const week = CONSULTATION_WEEKS.find((item) => item.weekKey === config.weekKey);
      const stats = weekSummary.get(config.weekKey) ?? {
        totalCount: 0,
        bookedCount: 0,
      };

      return {
        id: config.id,
        weekKey: config.weekKey,
        slotIntervalMinutes: config.slotIntervalMinutes,
        startTime: config.startTime,
        endTime: config.endTime,
        weekLabel: week?.label ?? config.weekKey,
        weekDescription: week?.description ?? "-",
        totalCount: stats.totalCount,
        bookedCount: stats.bookedCount,
      };
    }),
  };
}

export async function getTeacherAvailabilityData(teacherUserId: string) {
  const context = await getTeacherPortalContext(teacherUserId);

  if (!context) {
    return null;
  }

  await ensureClassScheduleReady(context.grade, context.classroom);
  const slots = await getRawSlots(context.grade, context.classroom);

  return {
    ...context.base,
    weeks: buildWeekCalendar(slots, "teacher"),
  };
}

export type ParentCalendarData = NonNullable<Awaited<ReturnType<typeof getParentCalendarData>>>;
export type ParentDashboardData = NonNullable<Awaited<ReturnType<typeof getParentDashboardData>>>;
export type TeacherDashboardData = NonNullable<Awaited<ReturnType<typeof getTeacherDashboardData>>>;
export type TeacherSettingsData = NonNullable<Awaited<ReturnType<typeof getTeacherSettingsData>>>;
export type TeacherAvailabilityData = NonNullable<Awaited<ReturnType<typeof getTeacherAvailabilityData>>>;
