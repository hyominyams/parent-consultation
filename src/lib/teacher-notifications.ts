import {
  getParentUsersByIds,
  getReservationsByIds,
  getReservationSlotsByIds,
  getTeacherNotifications,
} from "@/lib/db/queries";
import type { TeacherNotificationRow } from "@/lib/db/types";

export type TeacherNotificationFeedItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  scheduleLabel: string | null;
};

function formatMonthDayFromDateTime(dateTime: string) {
  const [datePart] = dateTime.split("T");
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return `${month}월 ${day}일`;
}

function buildScheduleLabel(startDateTime: string, timeLabel: string) {
  const monthDay = formatMonthDayFromDateTime(startDateTime);

  return monthDay ? `상담 일정 · ${monthDay} ${timeLabel}` : `상담 일정 · ${timeLabel}`;
}

export async function enrichTeacherNotifications(notifications: TeacherNotificationRow[]) {
  const reservationIds = Array.from(
    new Set(
      notifications
        .map((notification) => notification.reservationId)
        .filter((reservationId): reservationId is string => Boolean(reservationId)),
    ),
  );

  const reservations = await getReservationsByIds(reservationIds);
  const slotIds = Array.from(new Set(reservations.map((reservation) => reservation.slotId)));
  const parentIds = Array.from(new Set(reservations.map((reservation) => reservation.parentUserId)));
  const [slots, parents] = await Promise.all([
    getReservationSlotsByIds(slotIds),
    getParentUsersByIds(parentIds),
  ]);

  const reservationById = new Map(reservations.map((reservation) => [reservation.id, reservation]));
  const slotById = new Map(slots.map((slot) => [slot.id, slot]));
  const parentById = new Map(parents.map((parent) => [parent.id, parent]));

  return notifications.map((notification) => {
    const reservation = notification.reservationId
      ? reservationById.get(notification.reservationId) ?? null
      : null;
    const slot = reservation ? slotById.get(reservation.slotId) ?? null : null;
    const parent = reservation ? parentById.get(reservation.parentUserId) ?? null : null;

    const scheduleLabel = slot ? buildScheduleLabel(slot.startDateTime, slot.timeLabel) : null;
    const message =
      notification.title === "새 상담 신청"
        ? parent
          ? `${parent.studentName} 학생이 상담을 신청했습니다.`
          : "새 상담 신청이 접수되었습니다."
        : notification.message;

    return {
      id: notification.id,
      title: notification.title,
      message,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      scheduleLabel,
    } satisfies TeacherNotificationFeedItem;
  });
}

export async function getTeacherNotificationFeed(teacherUserId: string, limit = 12) {
  const notifications = await getTeacherNotifications(teacherUserId, limit);
  return enrichTeacherNotifications(notifications);
}
