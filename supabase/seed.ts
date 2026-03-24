import bcrypt from "bcryptjs";

import { CONSULTATION_WEEKS, DEFAULT_SCHEDULE_CONFIG } from "../src/lib/config/schedule";
import { buildTeacherPassword, listTeacherAccountConfigs } from "../src/lib/config/teachers";
import { CONSENT_VERSION } from "../src/lib/config/consent";
import { createId, nowIsoString } from "../src/lib/db/helpers";
import { supabaseAdmin } from "../src/lib/db/supabase";
import { buildSlotPayload } from "../src/lib/schedule";

async function seedTeachersAndSchedules() {
  for (const teacherSeed of listTeacherAccountConfigs()) {
    await supabaseAdmin.from("TeacherUser").insert({
      id: createId(),
      grade: teacherSeed.grade,
      classroom: teacherSeed.classroom,
      teacherName: teacherSeed.teacherName,
      passwordHash: await bcrypt.hash(
        buildTeacherPassword({
          grade: teacherSeed.grade,
          classroom: teacherSeed.classroom,
        }),
        10,
      ),
      updatedAt: nowIsoString(),
    });

    for (const week of CONSULTATION_WEEKS) {
      await supabaseAdmin.from("ClassScheduleConfig").insert({
        id: createId(),
        grade: teacherSeed.grade,
        classroom: teacherSeed.classroom,
        weekKey: week.weekKey,
        ...DEFAULT_SCHEDULE_CONFIG,
        updatedAt: nowIsoString(),
      });

      await supabaseAdmin.from("ReservationSlot").insert(
        buildSlotPayload({
          grade: teacherSeed.grade,
          classroom: teacherSeed.classroom,
          weekKey: week.weekKey,
          startDate: week.startDate,
          endDate: week.endDate,
          slotIntervalMinutes: DEFAULT_SCHEDULE_CONFIG.slotIntervalMinutes,
          startTime: DEFAULT_SCHEDULE_CONFIG.startTime,
          endTime: DEFAULT_SCHEDULE_CONFIG.endTime,
        }),
      );
    }
  }
}

async function seedSampleReservations() {
  const parentRows = [
    {
      id: createId(),
      loginId: "6107",
      grade: 6,
      classroom: 1,
      studentNumber: 7,
      studentName: "김민수",
      parentName: "김지은",
      phone: "01012341234",
      pinHash: await bcrypt.hash("1234", 10),
      updatedAt: nowIsoString(),
    },
    {
      id: createId(),
      loginId: "6112",
      grade: 6,
      classroom: 1,
      studentNumber: 12,
      studentName: "박서연",
      parentName: "박현정",
      phone: "01056785678",
      pinHash: await bcrypt.hash("5678", 10),
      updatedAt: nowIsoString(),
    },
  ];

  await supabaseAdmin.from("ParentUser").insert(parentRows);

  await supabaseAdmin.from("ConsentRecord").insert(
    parentRows.map((parent) => ({
      id: createId(),
      userType: "PARENT" as const,
      parentUserId: parent.id,
      teacherUserId: null,
      privacyConsent: true,
      thirdPartyConsent: true,
      consentVersion: CONSENT_VERSION,
    })),
  );

  const { data: targetSlots } = await supabaseAdmin
    .from("ReservationSlot")
    .select("*")
    .eq("grade", 6)
    .eq("classroom", 1)
    .eq("weekKey", "2026-03-30")
    .order("date", { ascending: true })
    .order("startDateTime", { ascending: true })
    .limit(2);

  const { data: homeroomTeacher } = await supabaseAdmin
    .from("TeacherUser")
    .select("*")
    .eq("grade", 6)
    .eq("classroom", 1)
    .maybeSingle();

  for (const [index, slot] of (targetSlots ?? []).entries()) {
    const parent = parentRows[index];
    const reservationId = createId();

    await supabaseAdmin.from("Reservation").insert({
      id: reservationId,
      parentUserId: parent.id,
      slotId: slot.id,
      consultationType: "IN_PERSON" as const,
      updatedAt: nowIsoString(),
    });

    await supabaseAdmin
      .from("ReservationSlot")
      .update({
        status: "BOOKED" as const,
        updatedAt: nowIsoString(),
      })
      .eq("id", slot.id);

    if (homeroomTeacher) {
      await supabaseAdmin.from("TeacherNotification").insert({
        id: createId(),
        teacherUserId: homeroomTeacher.id,
        reservationId,
        title: "새 상담 신청",
        message: `${parent.studentName} 학생이 상담을 신청했습니다.`,
        isRead: index === 0,
      });
    }
  }
}

async function main() {
  await supabaseAdmin.from("TeacherNotification").delete().not("id", "is", null);
  await supabaseAdmin.from("Reservation").delete().not("id", "is", null);
  await supabaseAdmin.from("ReservationSlot").delete().not("id", "is", null);
  await supabaseAdmin.from("ClassScheduleConfig").delete().not("id", "is", null);
  await supabaseAdmin.from("ConsentRecord").delete().not("id", "is", null);
  await supabaseAdmin.from("ParentUser").delete().not("id", "is", null);
  await supabaseAdmin.from("TeacherUser").delete().not("id", "is", null);

  await seedTeachersAndSchedules();
  await seedSampleReservations();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
