export const CONSULTATION_WEEKS = [
  {
    weekKey: "2026-03-30",
    label: "3월 마지막 주",
    description: "3월 30일 - 4월 3일",
    startDate: "2026-03-30",
    endDate: "2026-04-03",
  },
  {
    weekKey: "2026-04-27",
    label: "4월 마지막 주",
    description: "4월 27일 - 5월 1일",
    startDate: "2026-04-27",
    endDate: "2026-05-01",
  },
] as const;

export const CONSULTATION_WEEK_KEYS = CONSULTATION_WEEKS.map((week) => week.weekKey);

export const DEFAULT_SCHEDULE_CONFIG = {
  slotIntervalMinutes: 20,
  startTime: "13:20",
  endTime: "16:40",
} as const;

export const SUPPORTED_INTERVALS = [10, 20, 30] as const;

export const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

export const CLASSROOM_OPTIONS = [1, 2, 3, 4, 5] as const;
