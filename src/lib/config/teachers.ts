const TEACHER_NAMES_BY_CLASSROOM: Record<string, string> = {
  // 나중에 담임 성함만 빈 문자열 대신 입력하면 됩니다.
  "1-1": "",
  "1-2": "",
  "1-3": "",
  "1-4": "",
  "1-5": "",
  "2-1": "",
  "2-2": "",
  "2-3": "",
  "2-4": "",
  "2-5": "",
  "3-1": "",
  "3-2": "",
  "3-3": "",
  "3-4": "",
  "3-5": "",
  "4-1": "",
  "4-2": "",
  "4-3": "",
  "4-4": "",
  "4-5": "",
  "5-1": "",
  "5-2": "",
  "5-3": "",
  "5-4": "",
  "5-5": "",
  "6-1": "",
  "6-2": "",
  "6-3": "",
  "6-4": "",
  "6-5": "",
  "6-13": "예시",
};

export type TeacherAccountConfig = {
  grade: number;
  classroom: number;
  teacherName: string;
};

export function buildTeacherPassword(input: { grade: number; classroom: number }) {
  return `2026yssw${input.grade}${input.classroom}`;
}

export function getConfiguredTeacherName(grade: number, classroom: number) {
  return TEACHER_NAMES_BY_CLASSROOM[`${grade}-${classroom}`]?.trim() ?? "";
}

export function getTeacherDisplayName(teacherName: string | null | undefined) {
  const normalizedTeacherName = teacherName?.trim();
  return normalizedTeacherName ? normalizedTeacherName : "배정 예정";
}

export function listTeacherAccountConfigs(): TeacherAccountConfig[] {
  return Object.entries(TEACHER_NAMES_BY_CLASSROOM).map(([key, teacherName]) => {
    const [grade, classroom] = key.split("-").map(Number);

    return {
      grade,
      classroom,
      teacherName: teacherName.trim(),
    };
  });
}
