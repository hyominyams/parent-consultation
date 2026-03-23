"use client";

import { useState, useTransition } from "react";
import { Lock, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateTeacherWeekConfigAction } from "@/lib/actions/teacher-actions";
import { SUPPORTED_INTERVALS } from "@/lib/config/schedule";
import type { TeacherDashboardData } from "@/lib/data/portal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TeacherSettingsClientProps = {
  data: TeacherDashboardData;
};

export function TeacherSettingsClient({ data }: TeacherSettingsClientProps) {
  const router = useRouter();
  const [pendingWeekKey, setPendingWeekKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function announce(message?: string, isError?: boolean) {
    if (!message) {
      return;
    }

    if (isError) {
      toast.error(message);
      return;
    }

    toast.success(message);
  }

  function handleConfigSave(formData: FormData, weekKey: string) {
    setPendingWeekKey(weekKey);

    startTransition(async () => {
      try {
        const result = await updateTeacherWeekConfigAction({
          weekKey: String(formData.get("weekKey")),
          slotIntervalMinutes: Number(formData.get("slotIntervalMinutes")),
          startTime: String(formData.get("startTime")),
          endTime: String(formData.get("endTime")),
        });
        announce(result.message, result.status === "error");
        router.refresh();
      } finally {
        setPendingWeekKey(null);
      }
    });
  }

  return (
    <div className="grid gap-4">
      <Card className="border border-black/5 bg-white p-6 shadow-[0_18px_48px_rgba(30,57,75,0.06)] sm:p-7">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">운영 시간 설정</h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
          각 주차의 시간 간격과 시작, 종료 시각을 조정합니다. 이미 예약이 들어간 주차는 슬롯을 다시
          만들 수 없으므로 입력창이 잠깁니다.
        </p>
      </Card>

      {data.configs.map((config) => {
        const week = data.weeks.find((item) => item.weekKey === config.weekKey);
        const bookedCount =
          week?.days.reduce(
            (acc, day) => acc + day.slots.filter((slot) => slot.status === "BOOKED").length,
            0,
          ) ?? 0;
        const totalCount = week?.days.reduce((acc, day) => acc + day.slots.length, 0) ?? 0;
        const locked = bookedCount > 0;

        return (
          <Card
            key={config.id}
            className="border border-black/5 bg-white p-6 shadow-[0_18px_48px_rgba(30,57,75,0.06)] sm:p-7"
          >
            <form
              className="grid gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                handleConfigSave(new FormData(event.currentTarget), config.weekKey);
              }}
            >
              <input type="hidden" name="weekKey" value={config.weekKey} />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-[color:var(--text-strong)]">
                      {config.weekLabel}
                    </h3>
                    {locked ? (
                      <Badge variant="blocked">예약 존재로 잠금</Badge>
                    ) : (
                      <Badge variant="muted">수정 가능</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
                    {week?.description ?? "해당 주차의 운영 시간과 슬롯 간격을 설정합니다."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-[color:var(--surface-container-low)] px-3 py-2 text-[color:var(--text-soft)]">
                    예약 {bookedCount}건
                  </span>
                  <span className="rounded-full bg-[color:var(--surface-container-low)] px-3 py-2 text-[color:var(--text-soft)]">
                    총 슬롯 {totalCount}개
                  </span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2">
                  <Label className="tracking-[0.04em]">시간 간격</Label>
                  <select
                    name="slotIntervalMinutes"
                    defaultValue={String(config.slotIntervalMinutes)}
                    disabled={locked}
                    className="h-12 rounded-2xl border border-[color:var(--surface-container-high)] bg-white px-4 text-[0.98rem] text-[color:var(--text-strong)] outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-[color:var(--surface-container-low)] disabled:text-[color:var(--text-muted)]"
                  >
                    {SUPPORTED_INTERVALS.map((value) => (
                      <option key={value} value={value}>
                        {value}분
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <Label className="tracking-[0.04em]">시작 시간</Label>
                  <Input name="startTime" type="time" defaultValue={config.startTime} disabled={locked} />
                </label>

                <label className="grid gap-2">
                  <Label className="tracking-[0.04em]">종료 시간</Label>
                  <Input name="endTime" type="time" defaultValue={config.endTime} disabled={locked} />
                </label>
              </div>

              <div className="flex flex-col gap-3 border-t border-[color:var(--surface-container-high)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-[color:var(--text-soft)]">
                  {locked
                    ? "이 주차에는 이미 예약이 있어 시간 설정을 다시 만들 수 없습니다."
                    : "저장하면 선택한 주차의 슬롯 구성이 새 운영 시간 기준으로 다시 생성됩니다."}
                </p>

                <Button
                  type="submit"
                  size="sm"
                  disabled={locked || (pending && pendingWeekKey === config.weekKey)}
                  className="rounded-full"
                >
                  {locked ? <Lock className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {locked ? "수정 잠김" : "설정 저장"}
                </Button>
              </div>
            </form>
          </Card>
        );
      })}
    </div>
  );
}
