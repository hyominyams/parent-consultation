import { addMinutes, format, isAfter, parse } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { CONSULTATION_WEEKS } from "@/lib/config/schedule";

const CONSULTATION_TIME_ZONE = "Asia/Seoul";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const KST_DATE_KEY_FORMATTER = new Intl.DateTimeFormat("sv-SE", {
  timeZone: CONSULTATION_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const UTC_WEEKDAY_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "UTC",
  weekday: "short",
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function formatUtcDateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function toClassroomValue(classroom?: number | null) {
  return classroom ?? 0;
}

export function buildParentLoginId(input: {
  grade: number;
  classroom?: number | null;
  studentNumber: number;
}) {
  const classroom = toClassroomValue(input.classroom);
  return `${input.grade}${classroom}${String(input.studentNumber).padStart(2, "0")}`;
}

export function maskStudentName(name: string) {
  if (!name) {
    return "익명";
  }

  if (name.length === 1) {
    return `${name}○`;
  }

  return `${name[0]}${"○".repeat(name.length - 1)}`;
}

export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");

  if (digits.startsWith("82")) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}

export function isValidKoreanPhone(phone: string) {
  return /^01[016789]\d{7,8}$/.test(normalizePhone(phone));
}

export function formatPhoneNumber(raw: string) {
  const digits = normalizePhone(raw);

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return raw;
}

export function formatGradeClassroom(grade: number, classroom?: number | null) {
  const normalized = toClassroomValue(classroom);
  return normalized === 0 ? `${grade}학년 반 미지정` : `${grade}학년 ${normalized}반`;
}

export function parseTimeLabel(timeLabel: string) {
  const [startLabel, endLabel] = timeLabel.split("-");
  return { startLabel, endLabel };
}

export function generateTimeBlocks(input: {
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
}) {
  const baseDate = "2026-01-01";
  const start = parse(`${baseDate} ${input.startTime}`, "yyyy-MM-dd HH:mm", new Date());
  const end = parse(`${baseDate} ${input.endTime}`, "yyyy-MM-dd HH:mm", new Date());
  const slots: Array<{
    startLabel: string;
    endLabel: string;
    timeLabel: string;
  }> = [];

  let current = start;

  while (!isAfter(addMinutes(current, input.slotIntervalMinutes), end)) {
    const next = addMinutes(current, input.slotIntervalMinutes);
    const startLabel = format(current, "HH:mm");
    const endLabel = format(next, "HH:mm");

    slots.push({
      startLabel,
      endLabel,
      timeLabel: `${startLabel}-${endLabel}`,
    });

    current = next;
  }

  return slots;
}

export function combineKstDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00+09:00`);
}

export function shiftDateKey(dateKey: string, days: number) {
  return formatUtcDateKey(new Date(parseDateKey(dateKey).getTime() + days * ONE_DAY_MS));
}

export function buildDateKeysInRange(startDate: string, endDate: string) {
  const dateKeys: string[] = [];

  for (let current = startDate; current <= endDate; current = shiftDateKey(current, 1)) {
    dateKeys.push(current);
  }

  return dateKeys;
}

export function isWeekdayDateKey(dateKey: string) {
  const weekday = parseDateKey(dateKey).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

export function buildWeekdayDateKeys(startDate: string, endDate: string) {
  return buildDateKeysInRange(startDate, endDate).filter(isWeekdayDateKey);
}

export function toKstDateKey(value: Date | string) {
  return KST_DATE_KEY_FORMATTER.format(value instanceof Date ? value : new Date(value));
}

export function formatDateKeyWeekday(dateKey: string) {
  return UTC_WEEKDAY_FORMATTER.format(parseDateKey(dateKey));
}

export function formatDateKeyMonthDay(dateKey: string) {
  const parsed = parseDateKey(dateKey);
  return `${parsed.getUTCMonth() + 1}월 ${parsed.getUTCDate()}일`;
}

export function formatDateKeyFull(dateKey: string) {
  return `${formatDateKeyMonthDay(dateKey)} (${formatDateKeyWeekday(dateKey)})`;
}

export function formatDateKeyMonthSlashDay(dateKey: string) {
  const parsed = parseDateKey(dateKey);
  return `${parsed.getUTCMonth() + 1}/${parsed.getUTCDate()}`;
}

export function getDateKeyDayNumber(dateKey: string) {
  return String(parseDateKey(dateKey).getUTCDate()).padStart(2, "0");
}

export function getDateKeyMonthLabel(dateKey: string) {
  return `${parseDateKey(dateKey).getUTCMonth() + 1}월`;
}

export function weekKeyToRange(weekKey: string) {
  return CONSULTATION_WEEKS.find((week) => week.weekKey === weekKey) ?? null;
}

export function formatFullDate(date: Date | string) {
  const dateKey = toKstDateKey(date);
  const [year] = dateKey.split("-");
  return `${year}년 ${formatDateKeyFull(dateKey)}`;
}

export function formatShortDate(date: Date | string) {
  return formatDateKeyMonthDay(toKstDateKey(date));
}

export function formatWeekday(date: Date | string) {
  return formatDateKeyWeekday(toKstDateKey(date));
}

export function formatMonthDay(date: Date | string) {
  return formatDateKeyMonthSlashDay(toKstDateKey(date));
}

export function buildFieldErrors(
  issues: Array<{ path: PropertyKey[]; message: string }>,
) {
  return issues.reduce<Record<string, string[]>>((acc, issue) => {
    const key = String(issue.path[0] ?? "root");

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(issue.message);
    return acc;
  }, {});
}
