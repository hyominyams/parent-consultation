"use client";

import { useState, useTransition } from "react";
import {
  Bell,
  CalendarClock,
  CalendarRange,
  CheckCheck,
  Clock3,
  GraduationCap,
  LayoutGrid,
  Lock,
  Phone,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  markAllTeacherNotificationsReadAction,
  markTeacherNotificationReadAction,
  toggleTeacherSlotAction,
  updateTeacherWeekConfigAction,
} from "@/lib/actions/teacher-actions";
import type { TeacherDashboardData } from "@/lib/data/portal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatFullDate } from "@/lib/utils";

type TeacherDashboardClientProps = {
  data: TeacherDashboardData;
};

const DASHBOARD_TABS = [
  { value: "calendar", label: "신청 캘린더", icon: CalendarRange },
  { value: "summary", label: "날짜별 현황", icon: LayoutGrid },
  { value: "settings", label: "캘린더 설정", icon: Settings2 },
  { value: "notifications", label: "알림", icon: Bell },
] as const;

type DashboardTab = (typeof DASHBOARD_TABS)[number]["value"];
type CalendarSlot =
  TeacherDashboardData["weeks"][number]["days"][number]["slots"][number] & {
    fullLabel: string;
  };

function getSlotMeta(status: CalendarSlot["status"]) {
  switch (status) {
    case "BOOKED":
      return {
        label: "예약 완료",
        badgeVariant: "booked" as const,
        cardClassName:
          "border border-primary/10 bg-[color:var(--primary-container)]/65 text-[color:var(--text-strong)]",
        statusTextClassName: "text-[color:var(--primary)]",
      };
    case "BLOCKED":
      return {
        label: "신청 불가",
        badgeVariant: "blocked" as const,
        cardClassName:
          "border border-[color:var(--surface-container-high)] bg-[color:var(--surface-container)] text-[color:var(--text-strong)]",
        statusTextClassName: "text-[color:var(--text-soft)]",
      };
    default:
      return {
        label: "예약 가능",
        badgeVariant: "muted" as const,
        cardClassName:
          "border border-[color:var(--surface-container-high)] bg-[color:var(--surface-container-lowest)] text-[color:var(--text-strong)]",
        statusTextClassName: "text-[color:var(--text-strong)]",
      };
  }
}

function DashboardTabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: (typeof DASHBOARD_TABS)[number]["icon"];
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-3 text-sm font-semibold transition-all sm:px-6",
        active
          ? "bg-white text-[color:var(--primary)] shadow-[0_14px_30px_rgba(25,54,71,0.08)]"
          : "text-[color:var(--text-soft)] hover:text-[color:var(--text-strong)]",
      )}
    >
      <Icon className={cn("h-4 w-4", active ? "text-[color:var(--primary)]" : "text-[color:var(--text-muted)]")} />
      <span>{label}</span>
    </button>
  );
}

function OverviewStat({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-[color:var(--surface-container-low)] p-5">
      <p className="text-sm font-semibold tracking-wide text-[color:var(--text-muted)]">{label}</p>
      <p className="mt-3 font-display text-3xl font-extrabold text-[color:var(--text-strong)]">{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-soft)]">{description}</p>
    </div>
  );
}

function DailySummaryCard({
  label,
  booked,
  open,
  blocked,
  total,
}: TeacherDashboardData["summary"][number]) {
  return (
    <Card className="border border-black/5 bg-white shadow-[0_20px_60px_rgba(30,57,75,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
            {label}
          </p>
          <p className="mt-4 font-display text-4xl font-extrabold text-[color:var(--text-strong)]">
            {booked}명
          </p>
        </div>
        <Badge variant={booked > 0 ? "booked" : "muted"}>{booked > 0 ? "예약 있음" : "예약 없음"}</Badge>
      </div>
      <div className="mt-6 grid gap-3">
        <div className="flex items-center justify-between rounded-2xl bg-[color:var(--surface-container-low)] px-4 py-3 text-sm">
          <span className="text-[color:var(--text-soft)]">열린 슬롯</span>
          <strong className="text-[color:var(--text-strong)]">{open}개</strong>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-[color:var(--surface-container-low)] px-4 py-3 text-sm">
          <span className="text-[color:var(--text-soft)]">신청 불가</span>
          <strong className="text-[color:var(--text-strong)]">{blocked}개</strong>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-[color:var(--surface-container-low)] px-4 py-3 text-sm">
          <span className="text-[color:var(--text-soft)]">총 슬롯</span>
          <strong className="text-[color:var(--text-strong)]">{total}개</strong>
        </div>
      </div>
    </Card>
  );
}

export function TeacherDashboardClient({ data }: TeacherDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>("calendar");
  const [selectedWeekKey, setSelectedWeekKey] = useState(data.weeks[0]?.weekKey ?? "");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedWeek = data.weeks.find((week) => week.weekKey === selectedWeekKey) ?? data.weeks[0] ?? null;
  const selectedWeekSlots =
    selectedWeek?.days.flatMap((day) =>
      day.slots.map((slot) => ({
        ...slot,
        fullLabel: day.fullLabel,
      })),
    ) ?? [];
  const selectedSlot =
    selectedWeekSlots.find((slot) => slot.id === selectedSlotId) ?? selectedWeekSlots[0] ?? null;
  const selectedConfig =
    data.configs.find((config) => config.weekKey === selectedWeek?.weekKey) ?? data.configs[0] ?? null;
  const totals = data.summary.reduce(
    (acc, item) => ({
      booked: acc.booked + item.booked,
      open: acc.open + item.open,
      blocked: acc.blocked + item.blocked,
      total: acc.total + item.total,
    }),
    {
      booked: 0,
      open: 0,
      blocked: 0,
      total: 0,
    },
  );

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

  function handleToggleSlot(slotId: string) {
    startTransition(async () => {
      const result = await toggleTeacherSlotAction(slotId);
      announce(result.message, result.status === "error");
      router.refresh();
    });
  }

  function handleConfigSave(formData: FormData) {
    startTransition(async () => {
      const result = await updateTeacherWeekConfigAction({
        weekKey: String(formData.get("weekKey")),
        slotIntervalMinutes: Number(formData.get("slotIntervalMinutes")),
        startTime: String(formData.get("startTime")),
        endTime: String(formData.get("endTime")),
      });
      announce(result.message, result.status === "error");
      router.refresh();
    });
  }

  function handleNotificationRead(notificationId: string) {
    startTransition(async () => {
      const result = await markTeacherNotificationReadAction(notificationId);
      announce(result.message, result.status === "error");
      router.refresh();
    });
  }

  function handleAllNotificationsRead() {
    startTransition(async () => {
      const result = await markAllTeacherNotificationsReadAction();
      announce(result.message, result.status === "error");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[2.25rem] border border-black/5 bg-white shadow-[0_20px_60px_rgba(30,57,75,0.08)]">
          <div className="px-8 py-10 sm:px-10 sm:py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--primary-container)] text-[color:var(--primary)] shadow-sm">
              <GraduationCap className="h-8 w-8" strokeWidth={1.8} />
            </div>
            <Badge variant="primary" className="mt-6 rounded-full px-4 py-1.5 font-bold tracking-[0.16em] uppercase">
              Teacher Studio
            </Badge>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[0.96] tracking-[-0.05em] text-[color:var(--text-strong)] sm:text-5xl">
              {data.teacher.classLabel}
              <br />
              상담 운영 대시보드
            </h1>
            <p className="text-readable mt-5 max-w-2xl text-lg leading-relaxed text-[color:var(--text-soft)]">
              예약 현황을 확인하고, 상담 가능 시간을 조정하고, 주차별 운영 시간을 관리할 수 있습니다.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <OverviewStat
                label="담당 교사"
                value={`${data.teacher.name} 선생님`}
                description="이 계정은 현재 학급만 조회하고 수정할 수 있습니다."
              />
              <OverviewStat
                label="읽지 않은 알림"
                value={`${data.unreadCount}건`}
                description="새 예약이나 변경 사항을 바로 확인할 수 있습니다."
              />
              <OverviewStat
                label="운영 주차"
                value={selectedWeek?.label ?? "주차 없음"}
                description={selectedWeek?.description ?? "표시할 주차 정보가 없습니다."}
              />
            </div>
          </div>

          <div className="border-t border-black/5 bg-slate-50/60 px-8 py-6 sm:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-readable max-w-[420px] text-sm leading-relaxed text-[color:var(--text-soft)]">
                신청 현황은 캘린더에서 확인하고, 새 예약과 변경 사항은 알림에서 확인해 주세요.
                운영 시간 변경이 필요하면 캘린더 설정에서 조정할 수 있습니다.
              </p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button
                  type="button"
                  size="lg"
                  onClick={() => setActiveTab("calendar")}
                  className="h-12 rounded-xl px-6 text-base"
                >
                  <CalendarRange className="h-[18px] w-[18px]" />
                  신청 캘린더 보기
                </Button>
                <Button
                  type="button"
                  variant="soft"
                  size="lg"
                  onClick={() => setActiveTab("notifications")}
                  className="h-12 rounded-xl bg-white px-6 text-base ring-1 ring-inset ring-[color:var(--surface-container-high)]"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  알림 확인
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <Card className="overflow-hidden border border-primary/10 bg-gradient-to-br from-[color:var(--primary)] via-[color:var(--primary)] to-[color:var(--primary-dim)] text-[#FFFFFF]">
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-full bg-white/12 p-3">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90">
                실시간 운영 요약
              </div>
            </div>
            <p className="mt-8 text-sm font-semibold tracking-[0.14em] text-white/72 uppercase">오늘 한눈에 보기</p>
            <p className="mt-4 font-display text-5xl font-extrabold tracking-[-0.05em]">{totals.booked}건</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/78">
              현재까지 접수된 상담 수와 신청 가능한 슬롯 현황을 확인할 수 있습니다.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-[1.5rem] bg-white/10 p-4">
                <p className="text-sm text-white/70">예약</p>
                <p className="mt-2 text-2xl font-semibold">{totals.booked}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/10 p-4">
                <p className="text-sm text-white/70">열림</p>
                <p className="mt-2 text-2xl font-semibold">{totals.open}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/10 p-4">
                <p className="text-sm text-white/70">차단</p>
                <p className="mt-2 text-2xl font-semibold">{totals.blocked}</p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <Card className="border border-black/5 bg-white">
              <p className="text-sm font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
                현재 운영 설정
              </p>
              <h2 className="mt-3 font-display text-3xl font-extrabold text-[color:var(--text-strong)]">
                {selectedConfig?.weekLabel ?? "설정 준비 중"}
              </h2>
              <div className="mt-5 grid gap-3 text-sm text-[color:var(--text-soft)]">
                <div className="flex items-center justify-between rounded-2xl bg-[color:var(--surface-container-low)] px-4 py-3">
                  <span>시간 간격</span>
                  <strong className="text-[color:var(--text-strong)]">
                    {selectedConfig ? `${selectedConfig.slotIntervalMinutes}분` : "-"}
                  </strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-[color:var(--surface-container-low)] px-4 py-3">
                  <span>운영 시간</span>
                  <strong className="text-[color:var(--text-strong)]">
                    {selectedConfig ? `${selectedConfig.startTime} - ${selectedConfig.endTime}` : "-"}
                  </strong>
                </div>
              </div>
              <Button
                type="button"
                variant="soft"
                onClick={() => setActiveTab("settings")}
                className="mt-5 h-12 rounded-xl px-5"
              >
                <Settings2 className="h-4 w-4" />
                캘린더 설정 보기
              </Button>
            </Card>

            <Card className="border border-black/5 bg-white">
              <p className="text-sm font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
                권한 및 접근
              </p>
              <h2 className="mt-3 font-display text-3xl font-extrabold text-[color:var(--text-strong)]">
                본인 학급만 관리
              </h2>
              <p className="text-readable mt-4 text-sm leading-relaxed text-[color:var(--text-soft)]">
                학부모 계정은 이 화면에 접근할 수 없고, 교사 계정은 본인 학급의 슬롯만 열고 닫을 수
                있습니다.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[color:var(--primary-container)] px-4 py-2 text-sm font-semibold text-[color:var(--on-primary-container)]">
                <ShieldCheck className="h-4 w-4" />
                학급 범위 보호
              </div>
            </Card>
          </div>
        </div>
      </section>

      <div className="inline-flex w-full flex-wrap gap-2 rounded-[1.5rem] border border-[color:var(--surface-container-high)] bg-[color:var(--surface-container-low)] p-2 sm:w-fit">
        {DASHBOARD_TABS.map((tab) => (
          <DashboardTabButton
            key={tab.value}
            active={activeTab === tab.value}
            icon={tab.icon}
            label={tab.label}
            onClick={() => setActiveTab(tab.value)}
          />
        ))}
      </div>

      {activeTab === "calendar" ? (
        <section className="grid gap-6 xl:grid-cols-[1.28fr_0.82fr]">
          <Card className="overflow-hidden border border-black/5 bg-white p-0 shadow-[0_20px_60px_rgba(30,57,75,0.06)]">
            <div className="border-b border-black/5 bg-slate-50/60 px-6 py-6 sm:px-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
                    캘린더
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-extrabold text-[color:var(--text-strong)]">
                    주차별 신청 현황
                  </h2>
                  <p className="text-readable mt-2 text-sm leading-relaxed text-[color:var(--text-soft)]">
                    {selectedWeek?.description ?? "주차를 선택하면 해당 기간 슬롯을 관리할 수 있습니다."}
                  </p>
                </div>
                <Badge variant="muted" className="w-fit px-4 py-2 text-sm">
                  {selectedWeek?.label ?? "주차 없음"}
                </Badge>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {data.weeks.map((week) => (
                  <button
                    key={week.weekKey}
                    type="button"
                    onClick={() => setSelectedWeekKey(week.weekKey)}
                    className={cn(
                      "rounded-full px-5 py-3 text-sm font-semibold transition-all",
                      selectedWeekKey === week.weekKey
                        ? "bg-[color:var(--primary-container)] text-[color:var(--on-primary-container)] shadow-sm"
                        : "bg-white text-[color:var(--text-soft)] ring-1 ring-inset ring-[color:var(--surface-container-high)] hover:text-[color:var(--text-strong)]",
                    )}
                  >
                    {week.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <div className="grid gap-4 md:hidden">
                {selectedWeek?.days.map((day) => (
                  <div
                    key={day.dateKey}
                    className="rounded-[1.75rem] border border-black/5 bg-[color:var(--surface-container-lowest)] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3 border-b border-[color:var(--surface-container)] pb-3">
                      <div>
                        <p className="font-semibold text-[color:var(--text-strong)]">{day.fullLabel}</p>
                        <p className="mt-1 text-sm text-[color:var(--text-soft)]">
                          총 {day.slots.length}개 슬롯
                        </p>
                      </div>
                      <Badge variant="booked">
                        {day.slots.filter((slot) => slot.status === "BOOKED").length}건 예약
                      </Badge>
                    </div>

                    <div className="grid gap-3">
                      {day.slots.map((slot) => {
                        const slotMeta = getSlotMeta(slot.status);

                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setSelectedSlotId(slot.id)}
                            className={cn(
                              "rounded-[1.35rem] px-4 py-4 text-left transition-all",
                              slotMeta.cardClassName,
                              selectedSlot?.id === slot.id &&
                                "ring-2 ring-[rgba(36,102,129,0.28)] shadow-[0_12px_30px_rgba(30,57,75,0.08)]",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-[color:var(--text-muted)]">
                                  {slot.startLabel} - {slot.endLabel}
                                </p>
                                <p className={cn("mt-2 text-base font-semibold", slotMeta.statusTextClassName)}>
                                  {slotMeta.label}
                                </p>
                              </div>
                              <Badge variant={slotMeta.badgeVariant}>{slotMeta.label}</Badge>
                            </div>
                            {slot.status === "BOOKED" ? (
                              <div className="mt-3 text-sm leading-relaxed text-[color:var(--text-soft)]">
                                <p>{slot.reservedStudentName}</p>
                                <p>{slot.reservedParentName}</p>
                              </div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 hidden gap-4 md:grid md:grid-cols-5">
                {selectedWeek?.days.map((day) => (
                  <div
                    key={day.dateKey}
                    className="rounded-[1.75rem] border border-black/5 bg-[color:var(--surface-container-lowest)] p-4"
                  >
                    <div className="mb-4 border-b border-[color:var(--surface-container)] pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
                            {day.weekdayLabel}
                          </p>
                          <p className="mt-2 font-display text-4xl font-extrabold text-[color:var(--text-strong)]">
                            {day.dayNumber}
                          </p>
                        </div>
                        <span className="rounded-full bg-[color:var(--surface-container-low)] px-3 py-1 text-xs font-semibold text-[color:var(--text-soft)]">
                          {day.monthLabel}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-[color:var(--text-soft)]">{day.fullLabel}</p>
                    </div>

                    <div className="grid gap-3">
                      {day.slots.map((slot) => {
                        const slotMeta = getSlotMeta(slot.status);

                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setSelectedSlotId(slot.id)}
                            className={cn(
                              "min-h-[132px] rounded-[1.35rem] px-4 py-4 text-left transition-all",
                              slotMeta.cardClassName,
                              selectedSlot?.id === slot.id &&
                                "ring-2 ring-[color:var(--primary)] shadow-[0_14px_30px_rgba(30,57,75,0.08)]",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-medium text-[color:var(--text-muted)]">
                                {slot.startLabel} - {slot.endLabel}
                              </p>
                              {slot.status === "BOOKED" && slot.reservedConsultationType ? (
                                <span className="text-[color:var(--primary)]">
                                  {slot.reservedConsultationType === "PHONE" ? (
                                    <Phone className="h-4 w-4" />
                                  ) : (
                                    <Users className="h-4 w-4" />
                                  )}
                                </span>
                              ) : null}
                            </div>
                            <p className={cn("mt-3 text-base font-semibold", slotMeta.statusTextClassName)}>
                              {slotMeta.label}
                            </p>
                            {slot.status === "BOOKED" ? (
                              <div className="mt-3 text-sm leading-relaxed text-[color:var(--text-soft)]">
                                <p>{slot.reservedStudentName}</p>
                                <p>{slot.reservedParentName}</p>
                              </div>
                            ) : (
                              <div className="mt-3 text-sm text-[color:var(--text-soft)]">
                                {slot.status === "BLOCKED" ? "학부모 신청이 닫혀 있습니다." : "학부모가 선택할 수 있는 상태입니다."}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden border border-black/5 bg-white p-0 shadow-[0_20px_60px_rgba(30,57,75,0.06)]">
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--primary-container)] text-[color:var(--primary)]">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
                    선택한 슬롯
                  </p>
                  <h3 className="mt-1 font-display text-3xl font-extrabold text-[color:var(--text-strong)]">
                    {selectedSlot ? selectedSlot.fullLabel : "슬롯을 선택해주세요"}
                  </h3>
                </div>
              </div>

              {selectedSlot ? (
                <div className="mt-6 grid gap-5">
                  <div>
                    <p className="flex items-center gap-2 text-lg text-[color:var(--text-soft)]">
                      <Clock3 className="h-5 w-5" />
                      {selectedSlot.startLabel} - {selectedSlot.endLabel}
                    </p>
                  </div>

                  <div className="grid gap-3 rounded-[1.75rem] bg-[color:var(--surface-container-low)] p-5 text-sm leading-relaxed">
                    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3">
                      <span className="text-[color:var(--text-soft)]">현재 상태</span>
                      <Badge variant={getSlotMeta(selectedSlot.status).badgeVariant}>
                        {getSlotMeta(selectedSlot.status).label}
                      </Badge>
                    </div>
                    {selectedSlot.reservedStudentName ? (
                      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3">
                        <span className="text-[color:var(--text-soft)]">학생</span>
                        <strong className="text-[color:var(--text-strong)]">
                          {selectedSlot.reservedStudentName}
                        </strong>
                      </div>
                    ) : null}
                    {selectedSlot.reservedParentName ? (
                      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3">
                        <span className="text-[color:var(--text-soft)]">학부모</span>
                        <strong className="text-[color:var(--text-strong)]">
                          {selectedSlot.reservedParentName}
                        </strong>
                      </div>
                    ) : null}
                    {selectedSlot.reservedPhone ? (
                      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3">
                        <span className="text-[color:var(--text-soft)]">연락처</span>
                        <strong className="text-[color:var(--text-strong)]">{selectedSlot.reservedPhone}</strong>
                      </div>
                    ) : null}
                    {selectedSlot.reservedConsultationType ? (
                      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3">
                        <span className="text-[color:var(--text-soft)]">상담 방법</span>
                        <strong className="flex items-center gap-2 text-[color:var(--primary)]">
                          {selectedSlot.reservedConsultationType === "PHONE" ? (
                            <>
                              <Phone className="h-4 w-4" />
                              전화 상담
                            </>
                          ) : (
                            <>
                              <Users className="h-4 w-4" />
                              대면 상담
                            </>
                          )}
                        </strong>
                      </div>
                    ) : null}
                    {selectedSlot.reservationCreatedAt ? (
                      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3">
                        <span className="text-[color:var(--text-soft)]">신청 시각</span>
                        <strong className="text-[color:var(--text-strong)]">
                          {formatFullDate(new Date(selectedSlot.reservationCreatedAt))}
                        </strong>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-[1.5rem] bg-[color:var(--primary-container)]/55 px-5 py-4 text-sm leading-relaxed text-[color:var(--on-primary-container)]">
                    예약된 슬롯은 상태를 바꿀 수 없고, 비예약 슬롯만 신청 가능 상태와 차단 상태 사이를
                    전환할 수 있습니다.
                  </div>
                </div>
              ) : (
                <p className="text-readable mt-6 text-sm leading-relaxed text-[color:var(--text-soft)]">
                  왼쪽 캘린더에서 슬롯을 선택하면 상세 정보와 제어 버튼이 여기에 표시됩니다.
                </p>
              )}
            </div>

            <div className="border-t border-black/5 bg-slate-50/60 px-6 py-5 sm:px-8">
              {selectedSlot ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-readable max-w-[280px] text-sm leading-relaxed text-[color:var(--text-soft)]">
                    {selectedSlot.status === "BOOKED"
                      ? "이미 예약된 슬롯은 변경할 수 없습니다. 예약 조정이 필요하면 학부모와 일정을 다시 확인해 주세요."
                      : "현재 슬롯의 신청 가능 여부를 바로 변경할 수 있습니다."}
                  </p>
                  {selectedSlot.status !== "BOOKED" ? (
                    <Button
                      type="button"
                      disabled={pending}
                      onClick={() => handleToggleSlot(selectedSlot.id)}
                      className="h-12 rounded-xl px-6 text-base"
                    >
                      <Lock className="h-[18px] w-[18px]" />
                      {selectedSlot.status === "BLOCKED" ? "슬롯 다시 열기" : "신청 불가로 전환"}
                    </Button>
                  ) : (
                    <Badge variant="booked" className="w-fit px-4 py-2 text-sm">
                      예약 완료 슬롯
                    </Badge>
                  )}
                </div>
              ) : null}
            </div>
          </Card>
        </section>
      ) : null}

      {activeTab === "summary" ? (
        <section className="grid gap-6">
          <Card className="border border-black/5 bg-white shadow-[0_20px_60px_rgba(30,57,75,0.06)]">
            <p className="text-sm font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
              날짜별 현황
            </p>
            <h2 className="mt-3 font-display text-4xl font-extrabold text-[color:var(--text-strong)]">
              날짜별 예약 현황을 확인하세요
            </h2>
            <p className="text-readable mt-4 max-w-3xl text-sm leading-relaxed text-[color:var(--text-soft)]">
              날짜별 예약 수와 신청 가능 슬롯, 신청 불가 슬롯을 비교해 운영 상황을 확인할 수 있습니다.
            </p>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.summary.map((item) => (
              <DailySummaryCard key={item.dateKey} {...item} />
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "settings" ? (
        <section className="grid gap-6">
          <Card className="border border-black/5 bg-white shadow-[0_20px_60px_rgba(30,57,75,0.06)]">
            <p className="text-sm font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
              캘린더 설정
            </p>
            <h2 className="mt-3 font-display text-4xl font-extrabold text-[color:var(--text-strong)]">
              주차별 운영 시간을 조정하세요
            </h2>
            <p className="text-readable mt-4 max-w-3xl text-sm leading-relaxed text-[color:var(--text-soft)]">
              시간 간격과 시작·종료 시각은 주차별로 관리됩니다. 이미 예약이 들어간 주차는 다시 생성할
              수 없으므로, 저장 전 현재 예약 여부를 함께 확인하는 편이 안전합니다.
            </p>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            {data.configs.map((config) => (
              <Card
                key={config.id}
                className="overflow-hidden border border-black/5 bg-white p-0 shadow-[0_20px_60px_rgba(30,57,75,0.06)]"
              >
                <form
                  className="grid gap-0"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleConfigSave(new FormData(event.currentTarget));
                  }}
                >
                  <input type="hidden" name="weekKey" value={config.weekKey} />
                  <div className="px-6 py-6 sm:px-8">
                    <p className="text-sm font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
                      주차 설정
                    </p>
                    <h3 className="mt-3 font-display text-3xl font-extrabold text-[color:var(--text-strong)]">
                      {config.weekLabel}
                    </h3>
                  </div>

                  <div className="grid gap-5 px-6 pb-6 sm:grid-cols-3 sm:px-8">
                    <label className="grid gap-2 text-sm text-[color:var(--text-soft)]">
                      시간 간격
                      <select
                        name="slotIntervalMinutes"
                        defaultValue={String(config.slotIntervalMinutes)}
                        className="h-12 rounded-2xl border border-[color:var(--surface-container-high)] bg-[color:var(--surface-container-lowest)] px-4 outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                      >
                        {[10, 20, 30].map((value) => (
                          <option key={value} value={value}>
                            {value}분
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm text-[color:var(--text-soft)]">
                      시작 시간
                      <input
                        name="startTime"
                        type="time"
                        defaultValue={config.startTime}
                        className="h-12 rounded-2xl border border-[color:var(--surface-container-high)] bg-[color:var(--surface-container-lowest)] px-4 outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-[color:var(--text-soft)]">
                      종료 시간
                      <input
                        name="endTime"
                        type="time"
                        defaultValue={config.endTime}
                        className="h-12 rounded-2xl border border-[color:var(--surface-container-high)] bg-[color:var(--surface-container-lowest)] px-4 outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                      />
                    </label>
                  </div>

                  <div className="border-t border-black/5 bg-slate-50/60 px-6 py-5 sm:px-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-readable max-w-[360px] text-sm leading-relaxed text-[color:var(--text-soft)]">
                        이미 예약이 존재하는 주차는 시간 간격과 운영 시간을 다시 생성할 수 없습니다.
                      </p>
                      <Button type="submit" disabled={pending} className="h-12 rounded-xl px-6 text-base">
                        <Save className="h-[18px] w-[18px]" />
                        설정 저장
                      </Button>
                    </div>
                  </div>
                </form>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "notifications" ? (
        <section className="grid gap-6">
          <Card className="overflow-hidden border border-black/5 bg-white p-0 shadow-[0_20px_60px_rgba(30,57,75,0.06)]">
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <p className="text-sm font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
                알림
              </p>
              <h2 className="mt-3 font-display text-4xl font-extrabold text-[color:var(--text-strong)]">
                새 예약과 변경 사항을 확인하세요
              </h2>
              <p className="text-readable mt-4 max-w-3xl text-sm leading-relaxed text-[color:var(--text-soft)]">
                교사 계정에서 바로 처리해야 할 새 예약과 읽지 않은 알림을 한 곳에 모았습니다.
              </p>
            </div>
            <div className="border-t border-black/5 bg-slate-50/60 px-6 py-5 sm:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[color:var(--text-soft)] shadow-sm ring-1 ring-inset ring-[color:var(--surface-container-high)]">
                  <Bell className="h-4 w-4" />
                  읽지 않은 알림 {data.unreadCount}건
                </div>
                <Button
                  type="button"
                  variant="soft"
                  onClick={handleAllNotificationsRead}
                  disabled={pending}
                  className="h-12 rounded-xl px-6"
                >
                  <CheckCheck className="h-4 w-4" />
                  전체 읽음
                </Button>
              </div>
            </div>
          </Card>

          {data.notifications.length === 0 ? (
            <Card className="border border-black/5 bg-white text-center shadow-[0_20px_60px_rgba(30,57,75,0.06)]">
              <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
                <div className="rounded-full bg-[color:var(--secondary-container)] px-4 py-2 text-sm font-medium text-[color:var(--secondary-foreground)]">
                  아직 비어 있어요
                </div>
                <h3 className="font-display text-3xl font-extrabold text-[color:var(--text-strong)]">
                  새 알림이 없습니다
                </h3>
                <p className="text-readable text-sm leading-relaxed text-[color:var(--text-soft)]">
                  예약이 들어오거나 변경이 발생하면 이 영역에서 가장 먼저 확인할 수 있습니다.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {data.notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={cn(
                    "border border-black/5 bg-white shadow-[0_20px_60px_rgba(30,57,75,0.06)]",
                    !notification.isRead && "border-primary/15 bg-[color:var(--primary-container)]/28",
                  )}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 rounded-full bg-[color:var(--secondary-container)] p-3 text-[color:var(--secondary-foreground)]">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-[color:var(--text-strong)]">
                            {notification.title}
                          </p>
                          {notification.isRead ? (
                            <Badge variant="muted">읽음</Badge>
                          ) : (
                            <Badge variant="booked">새 알림</Badge>
                          )}
                        </div>
                        <p className="text-readable mt-2 text-sm leading-relaxed text-[color:var(--text-soft)]">
                          {notification.message}
                        </p>
                        <p className="mt-3 text-xs font-semibold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
                          {formatFullDate(new Date(notification.createdAt))}
                        </p>
                      </div>
                    </div>
                    {!notification.isRead ? (
                      <Button
                        type="button"
                        variant="soft"
                        onClick={() => handleNotificationRead(notification.id)}
                        disabled={pending}
                        className="h-11 rounded-xl px-5"
                      >
                        읽음 처리
                      </Button>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
