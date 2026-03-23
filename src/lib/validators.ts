import { z } from "zod";

import { isValidKoreanPhone, normalizePhone } from "@/lib/utils";

const checkboxSchema = z.preprocess((value) => value === "on" || value === true, z.boolean());

const classroomSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return Number(value);
}, z.number().int().min(1, "반은 1 이상이어야 합니다.").max(20, "반 번호를 확인해주세요.").optional());

export const parentAccessSchema = z.object({
  grade: z.coerce.number().int().min(1, "학년을 선택해주세요.").max(6, "학년은 1학년부터 6학년까지입니다."),
  classroom: classroomSchema,
  studentNumber: z.coerce.number().int().min(1, "번호를 입력해주세요.").max(99, "번호는 두 자리 이내로 입력해주세요."),
  studentName: z.string().trim().min(2, "학생 이름은 2자 이상 입력해주세요."),
  parentName: z.string().trim().min(2, "학부모 성함은 2자 이상 입력해주세요."),
  phone: z
    .string()
    .trim()
    .transform((value) => normalizePhone(value))
    .refine((value) => isValidKoreanPhone(value), "연락처는 한국 휴대폰 형식으로 입력해주세요."),
  pin: z.string().trim().regex(/^\d{4}$/, "PIN은 숫자 4자리여야 합니다."),
  privacyConsent: checkboxSchema.optional(),
  thirdPartyConsent: checkboxSchema.optional(),
});

export const teacherLoginSchema = z.object({
  grade: z.coerce.number().int().min(1, "학년을 선택해주세요.").max(6, "학년을 다시 확인해주세요."),
  classroom: z.coerce.number().int().min(1, "반을 입력해주세요.").max(20, "반 번호를 다시 확인해주세요."),
  teacherName: z.string().trim().min(2, "교사 이름은 2자 이상 입력해주세요."),
  password: z.string().trim().min(4, "암호를 입력해주세요."),
  privacyConsent: checkboxSchema.optional(),
  thirdPartyConsent: checkboxSchema.optional(),
});

export const reservationActionSchema = z.object({
  slotId: z.string().cuid("잘못된 슬롯 요청입니다."),
  consultationType: z.enum(["PHONE", "IN_PERSON"]),
});

export const teacherSlotToggleSchema = z.object({
  slotId: z.string().cuid("잘못된 슬롯 요청입니다."),
});

export const teacherWeekConfigSchema = z.object({
  weekKey: z.string().min(1, "주차를 선택해주세요."),
  slotIntervalMinutes: z.coerce
    .number()
    .int()
    .refine((value) => [10, 20, 30].includes(value), "시간 간격은 10분, 20분, 30분 중 하나여야 합니다."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "시작 시간을 확인해주세요."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "종료 시간을 확인해주세요."),
});

export const teacherNotificationSchema = z.object({
  notificationId: z.string().cuid("잘못된 알림 요청입니다."),
});
