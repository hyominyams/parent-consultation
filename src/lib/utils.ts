import { addMinutes, format, isAfter, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { CONSULTATION_WEEKS } from "@/lib/config/schedule";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

export function weekKeyToRange(weekKey: string) {
  return CONSULTATION_WEEKS.find((week) => week.weekKey === weekKey) ?? null;
}

export function formatFullDate(date: Date) {
  return format(date, "yyyy년 M월 d일 (EEE)", { locale: ko });
}

export function formatShortDate(date: Date) {
  return format(date, "M월 d일", { locale: ko });
}

export function formatWeekday(date: Date) {
  return format(date, "EEE", { locale: ko });
}

export function formatMonthDay(date: Date) {
  return format(date, "M/d", { locale: ko });
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
