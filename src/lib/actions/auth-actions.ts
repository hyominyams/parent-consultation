"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { ensureParentConsent, ensureTeacherConsent } from "@/lib/consent";
import { setSession, clearSession } from "@/lib/auth/session";
import { getTeacherDisplayName } from "@/lib/config/teachers";
import { createId, nowIsoString } from "@/lib/db/helpers";
import { getParentUserByLoginId, getReservationByParentUserId } from "@/lib/db/queries";
import { supabaseAdmin } from "@/lib/db/supabase";
import { ensureClassScheduleReady } from "@/lib/schedule";
import { syncTeacherAccount } from "@/lib/teacher-accounts";
import {
  buildParentLoginId,
  buildFieldErrors,
  normalizePhone,
  toClassroomValue,
} from "@/lib/utils";
import { parentAccessSchema, teacherLoginSchema } from "@/lib/validators";
import type { ActionState } from "@/types/action-state";

export async function parentAccessAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parentAccessSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: "입력한 정보를 다시 확인해주세요.",
      fieldErrors: buildFieldErrors(parsed.error.issues),
    };
  }

  const values = parsed.data;
  const normalizedClassroom = toClassroomValue(values.classroom);
  const loginId = buildParentLoginId({
    grade: values.grade,
    classroom: normalizedClassroom,
    studentNumber: values.studentNumber,
  });

  const existingParent = await getParentUserByLoginId(loginId);

  if (!existingParent) {
    if (!values.privacyConsent || !values.thirdPartyConsent) {
      return {
        status: "error",
        message: "필수 동의 항목을 모두 확인해주세요.",
      };
    }

    const { data: parent, error } = await supabaseAdmin
      .from("ParentUser")
      .insert({
        id: createId(),
        loginId,
        grade: values.grade,
        classroom: normalizedClassroom === 0 ? null : normalizedClassroom,
        studentNumber: values.studentNumber,
        studentName: values.studentName,
        parentName: values.parentName,
        phone: values.phone,
        pinHash: await bcrypt.hash(values.pin, 10),
        updatedAt: nowIsoString(),
      })
      .select("*")
      .single();

    if (error || !parent) {
      return {
        status: "error",
        message: "학부모 계정 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      };
    }

    await ensureParentConsent(parent.id, values);
    await ensureClassScheduleReady(parent.grade, normalizedClassroom);
    await setSession({
      userId: parent.id,
      userType: "PARENT",
      grade: parent.grade,
      classroom: normalizedClassroom,
      displayName: parent.parentName,
      loginId: parent.loginId,
    });

    redirect("/reserve");
  }

  const normalizedExistingPhone = normalizePhone(existingParent.phone);
  const isMatch =
    existingParent.studentName === values.studentName &&
    existingParent.parentName === values.parentName &&
    normalizedExistingPhone === values.phone &&
    (await bcrypt.compare(values.pin, existingParent.pinHash));

  if (!isMatch) {
    return {
      status: "error",
      message:
        "입력한 정보가 기존 정보와 일치하지 않습니다. 학생 이름, 학부모 성함, 연락처, 비회원용 비밀번호를 다시 확인해주세요.",
    };
  }

  if (existingParent.phone !== values.phone) {
    const { error } = await supabaseAdmin
      .from("ParentUser")
      .update({
        phone: values.phone,
        updatedAt: nowIsoString(),
      })
      .eq("id", existingParent.id);

    if (error) {
      return {
        status: "error",
        message: "연락처 업데이트 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      };
    }
  }

  await ensureParentConsent(existingParent.id, values);
  await ensureClassScheduleReady(existingParent.grade, toClassroomValue(existingParent.classroom));

  const reservation = await getReservationByParentUserId(existingParent.id);

  await setSession({
    userId: existingParent.id,
    userType: "PARENT",
    grade: existingParent.grade,
    classroom: toClassroomValue(existingParent.classroom),
    displayName: existingParent.parentName,
    loginId: existingParent.loginId,
  });

  redirect(reservation ? "/dashboard" : "/reserve");
}

export async function teacherLoginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = teacherLoginSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: "교사 로그인 정보를 다시 확인해주세요.",
      fieldErrors: buildFieldErrors(parsed.error.issues),
    };
  }

  const values = parsed.data;
  const teacher = await syncTeacherAccount(
    {
      grade: values.grade,
      classroom: values.classroom,
    },
    {
      syncPassword: true,
    },
  );

  if (
    !teacher ||
    teacher.teacherName !== values.teacherName ||
    !(await bcrypt.compare(values.password, teacher.passwordHash))
  ) {
    return {
      status: "error",
      message: "교사 로그인 정보가 일치하지 않습니다. 학년, 반, 이름, 암호를 다시 확인해주세요.",
    };
  }

  await ensureTeacherConsent(teacher.id, values);
  await ensureClassScheduleReady(teacher.grade, teacher.classroom);
  await setSession({
    userId: teacher.id,
    userType: "TEACHER",
    grade: teacher.grade,
    classroom: teacher.classroom,
    displayName: getTeacherDisplayName(teacher.teacherName),
  });

  redirect("/teacher/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/auth");
}
