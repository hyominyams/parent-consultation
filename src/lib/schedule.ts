import { eachDayOfInterval, format } from "date-fns";

import { DEFAULT_SCHEDULE_CONFIG, CONSULTATION_WEEKS } from "@/lib/config/schedule";
import { createId, nowIsoString, requireMaybeSingle } from "@/lib/db/helpers";
import { supabaseAdmin } from "@/lib/db/supabase";
import type { ClassScheduleConfigRow } from "@/lib/db/types";
import { combineKstDateTime, generateTimeBlocks } from "@/lib/utils";

export function buildSlotPayload(input: {
  grade: number;
  classroom: number;
  weekKey: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
}) {
  const timeBlocks = generateTimeBlocks({
    startTime: input.startTime,
    endTime: input.endTime,
    slotIntervalMinutes: input.slotIntervalMinutes,
  });

  const days = eachDayOfInterval({
    start: combineKstDateTime(input.startDate, "00:00"),
    end: combineKstDateTime(input.endDate, "00:00"),
  });

  return days.flatMap((day) => {
    const isoDate = format(day, "yyyy-MM-dd");

    return timeBlocks.map((block) => ({
      id: createId(),
      grade: input.grade,
      classroom: input.classroom,
      weekKey: input.weekKey,
      date: combineKstDateTime(isoDate, "00:00").toISOString(),
      timeLabel: block.timeLabel,
      startDateTime: combineKstDateTime(isoDate, block.startLabel).toISOString(),
      endDateTime: combineKstDateTime(isoDate, block.endLabel).toISOString(),
      status: "OPEN" as const,
      updatedAt: nowIsoString(),
    }));
  });
}

async function ensureWeekSchedule(input: {
  grade: number;
  classroom: number;
  weekKey: string;
  startDate: string;
  endDate: string;
}) {
  let config = requireMaybeSingle<ClassScheduleConfigRow>(
    await supabaseAdmin
      .from("ClassScheduleConfig")
      .select("*")
      .eq("grade", input.grade)
      .eq("classroom", input.classroom)
      .eq("weekKey", input.weekKey)
      .maybeSingle(),
    "Failed to load class schedule config.",
  );

  if (!config) {
    const { data, error } = await supabaseAdmin
      .from("ClassScheduleConfig")
      .insert({
        id: createId(),
        grade: input.grade,
        classroom: input.classroom,
        weekKey: input.weekKey,
        ...DEFAULT_SCHEDULE_CONFIG,
        updatedAt: nowIsoString(),
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to create class schedule config. ${error.message}`);
    }

    config = data as ClassScheduleConfigRow;
  }

  const slotPayload = buildSlotPayload({
    grade: input.grade,
    classroom: input.classroom,
    weekKey: input.weekKey,
    startDate: input.startDate,
    endDate: input.endDate,
    startTime: config.startTime,
    endTime: config.endTime,
    slotIntervalMinutes: config.slotIntervalMinutes,
  });

  const { error } = await supabaseAdmin
    .from("ReservationSlot")
    .upsert(slotPayload, {
      onConflict: "grade,classroom,startDateTime",
      ignoreDuplicates: true,
    });

  if (error) {
    throw new Error(`Failed to ensure reservation slots. ${error.message}`);
  }
}

export async function ensureClassSchedule(grade: number, classroom: number) {
  for (const week of CONSULTATION_WEEKS) {
    await ensureWeekSchedule({
      grade,
      classroom,
      weekKey: week.weekKey,
      startDate: week.startDate,
      endDate: week.endDate,
    });
  }
}

export async function rebuildWeekSlots(input: {
  grade: number;
  classroom: number;
  weekKey: string;
  slotIntervalMinutes: number;
  startTime: string;
  endTime: string;
}) {
  const week = CONSULTATION_WEEKS.find((item) => item.weekKey === input.weekKey);

  if (!week) {
    throw new Error("존재하지 않는 주차 설정입니다.");
  }

  const existingSlotIds =
    (
      await supabaseAdmin
        .from("ReservationSlot")
        .select("id")
        .eq("grade", input.grade)
        .eq("classroom", input.classroom)
        .eq("weekKey", input.weekKey)
    ).data?.map((slot) => slot.id) ?? [];

  const reservationCountResult =
    existingSlotIds.length > 0
      ? await supabaseAdmin
          .from("Reservation")
          .select("id", { count: "exact", head: true })
          .in("slotId", existingSlotIds)
      : { count: 0, error: null };

  if (reservationCountResult.error) {
    throw new Error(`예약 상태 확인 중 문제가 발생했습니다. ${reservationCountResult.error.message}`);
  }

  if ((reservationCountResult.count ?? 0) > 0) {
    throw new Error("이미 예약이 존재하는 주차는 시간 설정을 바꿀 수 없습니다.");
  }

  const updatedAt = nowIsoString();

  const { data: config, error: configError } = await supabaseAdmin
    .from("ClassScheduleConfig")
    .upsert(
      {
        id: createId(),
        grade: input.grade,
        classroom: input.classroom,
        weekKey: input.weekKey,
        slotIntervalMinutes: input.slotIntervalMinutes,
        startTime: input.startTime,
        endTime: input.endTime,
        updatedAt,
      },
      {
        onConflict: "grade,classroom,weekKey",
      },
    )
    .select("*")
    .single();

  if (configError || !config) {
    throw new Error(`설정 저장 중 문제가 발생했습니다. ${configError?.message ?? ""}`.trim());
  }

  const { error: deleteError } = await supabaseAdmin
    .from("ReservationSlot")
    .delete()
    .eq("grade", input.grade)
    .eq("classroom", input.classroom)
    .eq("weekKey", input.weekKey);

  if (deleteError) {
    throw new Error(`기존 시간표 삭제 중 문제가 발생했습니다. ${deleteError.message}`);
  }

  const slotPayload = buildSlotPayload({
    grade: input.grade,
    classroom: input.classroom,
    weekKey: input.weekKey,
    startDate: week.startDate,
    endDate: week.endDate,
    startTime: input.startTime,
    endTime: input.endTime,
    slotIntervalMinutes: input.slotIntervalMinutes,
  });

  const { error: insertError } = await supabaseAdmin.from("ReservationSlot").insert(slotPayload);

  if (insertError) {
    throw new Error(`새 시간표 생성 중 문제가 발생했습니다. ${insertError.message}`);
  }
}
