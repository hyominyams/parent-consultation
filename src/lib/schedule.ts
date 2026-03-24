import { CONSULTATION_WEEK_KEYS, DEFAULT_SCHEDULE_CONFIG, CONSULTATION_WEEKS } from "@/lib/config/schedule";
import { createId, nowIsoString, requireData, requireMaybeSingle } from "@/lib/db/helpers";
import { supabaseAdmin } from "@/lib/db/supabase";
import type { ClassScheduleConfigRow } from "@/lib/db/types";
import { buildWeekdayDateKeys, combineKstDateTime, generateTimeBlocks, shiftDateKey } from "@/lib/utils";

const SCHEDULE_READY_TTL_MS = 5 * 60 * 1000;

declare global {
  var scheduleReadyTimestamps: Map<string, number> | undefined;
  var scheduleReadyInFlight: Map<string, Promise<void>> | undefined;
}

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

  return buildWeekdayDateKeys(input.startDate, input.endDate).flatMap((dateKey) =>
    timeBlocks.map((block) => ({
      id: createId(),
      grade: input.grade,
      classroom: input.classroom,
      weekKey: input.weekKey,
      date: combineKstDateTime(dateKey, "00:00").toISOString(),
      timeLabel: block.timeLabel,
      startDateTime: combineKstDateTime(dateKey, block.startLabel).toISOString(),
      endDateTime: combineKstDateTime(dateKey, block.endLabel).toISOString(),
      status: "OPEN" as const,
      updatedAt: nowIsoString(),
    })),
  );
}

function getScheduleCacheKey(grade: number, classroom: number) {
  return `${grade}:${classroom}`;
}

function isUniqueViolation(error: { code?: string } | null | undefined) {
  return error?.code === "23505";
}

function getScheduleReadyTimestamps() {
  if (!global.scheduleReadyTimestamps) {
    global.scheduleReadyTimestamps = new Map<string, number>();
  }

  return global.scheduleReadyTimestamps;
}

function getScheduleReadyInFlight() {
  if (!global.scheduleReadyInFlight) {
    global.scheduleReadyInFlight = new Map<string, Promise<void>>();
  }

  return global.scheduleReadyInFlight;
}

async function hasExpectedWeekSlots(input: {
  grade: number;
  classroom: number;
  weekKey: string;
  slotPayload: ReturnType<typeof buildSlotPayload>;
}) {
  const existingSlotsResult = await supabaseAdmin
    .from("ReservationSlot")
    .select("date, timeLabel, startDateTime, endDateTime")
    .eq("grade", input.grade)
    .eq("classroom", input.classroom)
    .eq("weekKey", input.weekKey)
    .order("startDateTime", { ascending: true });

  if (existingSlotsResult.error) {
    throw new Error(`Failed to verify reservation slots. ${existingSlotsResult.error.message}`);
  }

  const existingSlots = existingSlotsResult.data ?? [];
  const slotPayloadByTime = [...input.slotPayload].sort((a, b) =>
    a.startDateTime.localeCompare(b.startDateTime),
  );

  return (
    existingSlots.length === slotPayloadByTime.length &&
    existingSlots.every((slot, index) => {
      const targetSlot = slotPayloadByTime[index];

      return (
        slot.date === targetSlot.date &&
        slot.timeLabel === targetSlot.timeLabel &&
        slot.startDateTime === targetSlot.startDateTime &&
        slot.endDateTime === targetSlot.endDateTime
      );
    })
  );
}

async function isClassScheduleReady(grade: number, classroom: number) {
  const configs =
    (requireData(
      await supabaseAdmin
        .from("ClassScheduleConfig")
        .select("weekKey, slotIntervalMinutes, startTime, endTime")
        .eq("grade", grade)
        .eq("classroom", classroom),
      "Failed to load class schedule readiness.",
    ) ?? []) as Array<
      Pick<ClassScheduleConfigRow, "weekKey" | "slotIntervalMinutes" | "startTime" | "endTime">
    >;

  if (configs.length !== CONSULTATION_WEEK_KEYS.length) {
    return false;
  }

  const configByWeekKey = new Map(configs.map((config) => [config.weekKey, config]));

  if (CONSULTATION_WEEK_KEYS.some((weekKey) => !configByWeekKey.has(weekKey))) {
    return false;
  }

  const expectedSlotCount = CONSULTATION_WEEKS.reduce((total, week) => {
    const config = configByWeekKey.get(week.weekKey);

    if (!config) {
      return total;
    }

    return (
      total +
      buildWeekdayDateKeys(week.startDate, week.endDate).length *
        generateTimeBlocks({
          startTime: config.startTime,
          endTime: config.endTime,
          slotIntervalMinutes: config.slotIntervalMinutes,
        }).length
    );
  }, 0);

  const { count, error } = await supabaseAdmin
    .from("ReservationSlot")
    .select("id", { count: "exact", head: true })
    .eq("grade", grade)
    .eq("classroom", classroom);

  if (error) {
    throw new Error(`Failed to count reservation slots. ${error.message}`);
  }

  return (count ?? 0) === expectedSlotCount;
}

async function updateSlotTiming(
  slotId: string,
  input: {
    date: string;
    timeLabel: string;
    startDateTime: string;
    endDateTime: string;
  },
) {
  const { error } = await supabaseAdmin
    .from("ReservationSlot")
    .update({
      date: input.date,
      timeLabel: input.timeLabel,
      startDateTime: input.startDateTime,
      endDateTime: input.endDateTime,
      updatedAt: nowIsoString(),
    })
    .eq("id", slotId);

  if (error) {
    throw new Error(`Failed to update reservation slot timing. ${error.message}`);
  }
}

function buildTemporarySlotWindow(index: number) {
  const dateKey = shiftDateKey("2099-01-01", index);
  return {
    date: combineKstDateTime(dateKey, "00:00").toISOString(),
    timeLabel: `TMP-${index + 1}`,
    startDateTime: combineKstDateTime(dateKey, "00:00").toISOString(),
    endDateTime: combineKstDateTime(dateKey, "00:01").toISOString(),
  };
}

async function alignExistingWeekSlots(input: {
  existingSlots: Array<{
    id: string;
    startDateTime: string;
  }>;
  slotPayload: ReturnType<typeof buildSlotPayload>;
}) {
  const matchedCount = Math.min(input.existingSlots.length, input.slotPayload.length);

  for (let index = 0; index < matchedCount; index += 1) {
    await updateSlotTiming(input.existingSlots[index].id, buildTemporarySlotWindow(index));
  }

  for (let index = 0; index < matchedCount; index += 1) {
    const slot = input.slotPayload[index];
    await updateSlotTiming(input.existingSlots[index].id, slot);
  }
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
      if (isUniqueViolation(error)) {
        config = requireMaybeSingle<ClassScheduleConfigRow>(
          await supabaseAdmin
            .from("ClassScheduleConfig")
            .select("*")
            .eq("grade", input.grade)
            .eq("classroom", input.classroom)
            .eq("weekKey", input.weekKey)
            .maybeSingle(),
          "Failed to reload class schedule config.",
        );
      } else {
        throw new Error(`Failed to create class schedule config. ${error.message}`);
      }
    }

    if (!config && data) {
      config = data as ClassScheduleConfigRow;
    }
  }

  if (!config) {
    throw new Error("Failed to resolve class schedule config.");
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

  const existingSlotsResult = await supabaseAdmin
    .from("ReservationSlot")
    .select("id, date, timeLabel, startDateTime, endDateTime")
    .eq("grade", input.grade)
    .eq("classroom", input.classroom)
    .eq("weekKey", input.weekKey)
    .order("startDateTime", { ascending: true });

  if (existingSlotsResult.error) {
    throw new Error(`Failed to load reservation slots. ${existingSlotsResult.error.message}`);
  }

  const existingSlots = existingSlotsResult.data ?? [];
  const slotPayloadByTime = [...slotPayload].sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));
  const scheduleMatches =
    existingSlots.length === slotPayloadByTime.length &&
    existingSlots.every((slot, index) => {
      const targetSlot = slotPayloadByTime[index];
      return (
        slot.date === targetSlot.date &&
        slot.timeLabel === targetSlot.timeLabel &&
        slot.startDateTime === targetSlot.startDateTime &&
        slot.endDateTime === targetSlot.endDateTime
      );
    });

  if (scheduleMatches) {
    return;
  }

  const existingSlotIds = existingSlots.map((slot) => slot.id);
  const reservationsResult =
    existingSlotIds.length > 0
      ? await supabaseAdmin.from("Reservation").select("slotId").in("slotId", existingSlotIds)
      : { data: [], error: null };

  if (reservationsResult.error) {
    throw new Error(`Failed to load existing reservations. ${reservationsResult.error.message}`);
  }

  const reservedSlotIds = new Set((reservationsResult.data ?? []).map((reservation) => reservation.slotId));

  if (reservedSlotIds.size === 0) {
    if (existingSlotIds.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("ReservationSlot")
        .delete()
        .eq("grade", input.grade)
        .eq("classroom", input.classroom)
        .eq("weekKey", input.weekKey);

      if (deleteError) {
        throw new Error(`Failed to replace reservation slots. ${deleteError.message}`);
      }
    }

    const { error: insertError } = await supabaseAdmin.from("ReservationSlot").insert(slotPayload);

    if (insertError) {
      if (isUniqueViolation(insertError)) {
        const matches = await hasExpectedWeekSlots({
          grade: input.grade,
          classroom: input.classroom,
          weekKey: input.weekKey,
          slotPayload: slotPayloadByTime,
        });

        if (matches) {
          return;
        }
      }

      throw new Error(`Failed to insert reservation slots. ${insertError.message}`);
    }

    return;
  }

  await alignExistingWeekSlots({
    existingSlots,
    slotPayload: slotPayloadByTime,
  });

  if (slotPayloadByTime.length > existingSlots.length) {
    const { error: insertError } = await supabaseAdmin
      .from("ReservationSlot")
      .insert(slotPayloadByTime.slice(existingSlots.length));

    if (insertError) {
      throw new Error(`Failed to insert missing reservation slots. ${insertError.message}`);
    }
  }

  if (existingSlots.length > slotPayloadByTime.length) {
    const removableSlotIds = existingSlots
      .slice(slotPayloadByTime.length)
      .map((slot) => slot.id)
      .filter((slotId) => !reservedSlotIds.has(slotId));

    if (removableSlotIds.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("ReservationSlot")
        .delete()
        .in("id", removableSlotIds);

      if (deleteError) {
        throw new Error(`Failed to remove obsolete reservation slots. ${deleteError.message}`);
      }
    }
  }
}

async function removeObsoleteWeekSchedules(grade: number, classroom: number) {
  const activeWeekKeys = new Set<string>(CONSULTATION_WEEK_KEYS);
  const existingConfigs =
    (requireData(
      await supabaseAdmin
        .from("ClassScheduleConfig")
        .select("weekKey")
        .eq("grade", grade)
        .eq("classroom", classroom),
      "Failed to load existing class schedule configs.",
    ) ?? []) as Array<Pick<ClassScheduleConfigRow, "weekKey">>;

  const obsoleteWeekKeys = existingConfigs
    .map((config) => config.weekKey)
    .filter((weekKey) => !activeWeekKeys.has(weekKey));

  if (obsoleteWeekKeys.length === 0) {
    return;
  }

  // Deleting obsolete configs also clears linked slots and reservations via FK cascade.
  const { error } = await supabaseAdmin
    .from("ClassScheduleConfig")
    .delete()
    .eq("grade", grade)
    .eq("classroom", classroom)
    .in("weekKey", obsoleteWeekKeys);

  if (error) {
    throw new Error(`Failed to remove obsolete class schedule configs. ${error.message}`);
  }
}

export async function ensureClassSchedule(grade: number, classroom: number) {
  await removeObsoleteWeekSchedules(grade, classroom);

  await Promise.all(
    CONSULTATION_WEEKS.map((week) =>
      ensureWeekSchedule({
        grade,
        classroom,
        weekKey: week.weekKey,
        startDate: week.startDate,
        endDate: week.endDate,
      }),
    ),
  );
}

export async function ensureClassScheduleReady(
  grade: number,
  classroom: number,
  options: {
    force?: boolean;
  } = {},
) {
  const cacheKey = getScheduleCacheKey(grade, classroom);
  const timestamps = getScheduleReadyTimestamps();
  const inFlight = getScheduleReadyInFlight();
  const now = Date.now();
  const cachedAt = timestamps.get(cacheKey);

  if (!options.force && cachedAt && now - cachedAt < SCHEDULE_READY_TTL_MS) {
    return;
  }

  const existingTask = inFlight.get(cacheKey);

  if (existingTask) {
    await existingTask;
    return;
  }

  const task = (async () => {
    if (options.force || !(await isClassScheduleReady(grade, classroom))) {
      await ensureClassSchedule(grade, classroom);
    }

    timestamps.set(cacheKey, Date.now());
  })().finally(() => {
    inFlight.delete(cacheKey);
  });

  inFlight.set(cacheKey, task);
  await task;
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
