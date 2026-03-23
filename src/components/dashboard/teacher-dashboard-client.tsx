"use client";

import { useMemo, useState, useTransition } from "react";
import { Bell, CalendarClock, CheckCheck, Lock, Save, Phone, Users } from "lucide-react";
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

export function TeacherDashboardClient({ data }: TeacherDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"calendar" | "summary" | "settings" | "notifications">(
    "calendar",
  );
  const [selectedWeekKey, setSelectedWeekKey] = useState(data.weeks[0]?.weekKey ?? "");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedWeek = useMemo(
    () => data.weeks.find((week) => week.weekKey === selectedWeekKey) ?? data.weeks[0],
    [data.weeks, selectedWeekKey],
  );

  const selectedSlot = useMemo(
    () =>
      selectedWeek?.days
        .flatMap((day) =>
          day.slots.map((slot) => ({
            ...slot,
            fullLabel: day.fullLabel,
          })),
        )
        .find((slot) => slot.id === selectedSlotId) ??
      selectedWeek?.days.flatMap((day) =>
        day.slots.map((slot) => ({
          ...slot,
          fullLabel: day.fullLabel,
        })),
      )[0] ??
      null,
    [selectedSlotId, selectedWeek],
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
    <div className="grid gap-6">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="bg-[color:var(--surface-container-lowest)] shadow-sm ring-1 ring-black/5 border-none">
          <Badge variant="primary" className="mb-5 w-fit shadow-none">
            TEACHER DASHBOARD
          </Badge>
          <h1 className="font-display text-5xl leading-[0.95] tracking-[-0.05em] text-[color:var(--text-strong)] sm:text-6xl">
            {data.teacher.classLabel}
            <br />
            상담 관리
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-9 text-[color:var(--text-soft)]">
            교사 계정은 본인 학급의 상담 일정만 관리할 수 있습니다. 예약 현황 확인, 슬롯 차단,
            주차별 시간표 재구성이 한 화면에서 가능합니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Badge variant="booked">교사 {data.teacher.name}</Badge>
            <Badge variant="muted">읽지 않은 알림 {data.unreadCount}건</Badge>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-[color:var(--primary)] to-[color:var(--primary-dim)] text-[#FFFFFF] shadow-sm ring-1 ring-black/5 border-none">
          <div className="grid gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-[#FFFFFF]/70">오늘 한눈에 보기</p>
              <p className="mt-3 text-4xl font-semibold">{data.summary.reduce((sum, item) => sum + item.booked, 0)}건</p>
              <p className="mt-2 text-[#FFFFFF]/76">현재까지 예약된 상담 수</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[1.5rem] bg-white/10 p-4">
                <p className="text-sm text-[#FFFFFF]/70">예약</p>
                <p className="mt-2 text-2xl font-semibold">{data.summary.reduce((sum, item) => sum + item.booked, 0)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/10 p-4">
                <p className="text-sm text-[#FFFFFF]/70">열림</p>
                <p className="mt-2 text-2xl font-semibold">{data.summary.reduce((sum, item) => sum + item.open, 0)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/10 p-4">
                <p className="text-sm text-[#FFFFFF]/70">차단</p>
                <p className="mt-2 text-2xl font-semibold">{data.summary.reduce((sum, item) => sum + item.blocked, 0)}</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <div className="inline-flex w-fit rounded-full bg-[color:var(--surface-1)] p-1">
        {[
          { value: "calendar", label: "신청 캘린더" },
          { value: "summary", label: "날짜별 현황" },
          { value: "settings", label: "캘린더 설정" },
          { value: "notifications", label: "알림" },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value as typeof activeTab)}
            className={cn(
              "rounded-full px-5 py-3 text-sm transition",
              activeTab === tab.value
                ? "bg-white text-[color:var(--secondary)] shadow-[0_14px_30px_rgba(25,54,71,0.08)]"
                : "text-[color:var(--text-soft)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "calendar" ? (
        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <Card>
            <div className="flex flex-wrap gap-3">
              {data.weeks.map((week) => (
                <button
                  key={week.weekKey}
                  type="button"
                  onClick={() => setSelectedWeekKey(week.weekKey)}
                  className={cn(
                    "rounded-full px-5 py-3 text-sm font-bold transition",
                    selectedWeekKey === week.weekKey
                      ? "bg-[color:var(--primary-container)] text-[color:var(--on-primary-container)]"
                      : "bg-[color:var(--surface-container)] text-[color:var(--text-soft)] hover:text-[color:var(--text-strong)] hover:bg-[color:var(--surface-container-high)]",
                  )}
                >
                  {week.label}
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:hidden">
              {selectedWeek?.days.map((day) => (
                <div key={day.dateKey} className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-black/5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-semibold text-[color:var(--text-strong)]">{day.fullLabel}</p>
                    <Badge variant="muted">{day.slots.filter((slot) => slot.status === "BOOKED").length}건 예약</Badge>
                  </div>
                  <div className="grid gap-3">
                    {day.slots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={cn(
                          "rounded-[1.5rem] px-4 py-4 text-left transition",
                          slot.status === "BOOKED"
                            ? "bg-[#dff0f8]"
                            : slot.status === "BLOCKED"
                              ? "bg-[#e4e9ed]"
                              : "bg-white",
                          selectedSlot?.id === slot.id && "ring-2 ring-[rgba(36,102,129,0.28)]",
                        )}
                      >
                        <div className="text-sm text-[color:var(--text-muted)]">
                          {slot.startLabel} - {slot.endLabel}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-1">
                          <span className="font-medium text-[color:var(--text-strong)]">
                            {slot.status === "BOOKED"
                              ? slot.reservedStudentName
                              : slot.status === "BLOCKED"
                                ? "신청 불가"
                                : "예약 가능"}
                          </span>
                          {slot.status === "BOOKED" && slot.reservedConsultationType && (
                            <span className="text-primary">
                              {slot.reservedConsultationType === "PHONE" ? (
                                <Phone className="h-4 w-4" />
                              ) : (
                                <Users className="h-4 w-4" />
                              )}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 hidden gap-4 md:grid md:grid-cols-5">
              {selectedWeek?.days.map((day) => (
                <div key={day.dateKey} className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-black/5">
                  <div className="mb-4 border-b border-[color:var(--surface-container)] pb-3">
                    <p className="text-sm uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{day.weekdayLabel}</p>
                    <div className="mt-2 flex items-end justify-between">
                      <p className="font-display text-4xl font-extrabold text-[color:var(--text-strong)]">{day.dayNumber}</p>
                      <span className="text-sm font-bold text-[color:var(--text-soft)]">{day.monthLabel}</span>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {day.slots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={cn(
                          "min-h-[110px] rounded-[1.5rem] px-4 py-4 text-left transition",
                          slot.status === "BOOKED"
                            ? "bg-[color:var(--secondary-container)]"
                            : slot.status === "BLOCKED"
                              ? "bg-[color:var(--surface-container)]"
                              : "bg-[color:var(--surface-container-lowest)] border border-[color:var(--surface-container-high)]",
                          selectedSlot?.id === slot.id && "ring-2 ring-[color:var(--primary)]",
                        )}
                      >
                        <div className="text-sm text-[color:var(--text-muted)]">
                          {slot.startLabel} - {slot.endLabel}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-1">
                          <span className="font-medium text-[color:var(--text-strong)]">
                            {slot.status === "BOOKED"
                              ? slot.reservedStudentName
                              : slot.status === "BLOCKED"
                                ? "신청 불가"
                                : "예약 가능"}
                          </span>
                          {slot.status === "BOOKED" && slot.reservedConsultationType && (
                            <span className="text-primary">
                              {slot.reservedConsultationType === "PHONE" ? (
                                <Phone className="h-4 w-4" />
                              ) : (
                                <Users className="h-4 w-4" />
                              )}
                            </span>
                          )}
                        </div>
                        {slot.status === "BOOKED" ? (
                          <div className="mt-2 text-sm text-[color:var(--text-soft)]">{slot.reservedParentName}</div>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-6">
            <Card>
              <div className="flex items-center gap-3 text-[color:var(--secondary)]">
                <CalendarClock className="h-5 w-5" />
                <span className="text-sm uppercase tracking-[0.16em]">선택한 슬롯</span>
              </div>
              {selectedSlot ? (
                <div className="mt-5 grid gap-5">
                  <div>
                    <h3 className="font-display text-3xl text-[color:var(--text-strong)]">{selectedSlot.fullLabel}</h3>
                    <p className="mt-2 text-lg text-[color:var(--text-soft)]">
                      {selectedSlot.startLabel} - {selectedSlot.endLabel}
                    </p>
                  </div>
                  <div className="grid gap-2 rounded-[1.75rem] bg-[color:var(--surface-container)] p-5 text-sm leading-7 text-[color:var(--text-strong)]">
                    <p>상태: <span className="font-bold text-[color:var(--primary)]">{selectedSlot.status === "BOOKED" ? "예약 완료" : selectedSlot.status === "BLOCKED" ? "신청 불가" : "예약 가능"}</span></p>
                    {selectedSlot.reservedParentName ? <p>학부모: {selectedSlot.reservedParentName}</p> : null}
                    {selectedSlot.reservedPhone ? <p>연락처: {selectedSlot.reservedPhone}</p> : null}
                    {selectedSlot.reservedConsultationType ? (
                      <p className="flex items-center gap-1.5 font-bold text-primary">
                        상담 방법: {selectedSlot.reservedConsultationType === "PHONE" ? (
                          <><Phone className="w-4 h-4" /> 전화 상담</>
                        ) : (
                          <><Users className="w-4 h-4" /> 대면 상담</>
                        )}
                      </p>
                    ) : null}
                    {selectedSlot.reservationCreatedAt ? <p>신청 시각: {formatFullDate(new Date(selectedSlot.reservationCreatedAt))}</p> : null}
                  </div>
                  {selectedSlot.status !== "BOOKED" ? (
                    <Button disabled={pending} onClick={() => handleToggleSlot(selectedSlot.id)} style={{ color: '#ffffff' }}>
                      <Lock className="h-4 w-4" style={{ color: '#ffffff' }} />
                      {selectedSlot.status === "BLOCKED" ? "슬롯 다시 열기" : "신청 불가로 전환"}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="mt-5 text-[color:var(--text-soft)]">좌측에서 슬롯을 선택해주세요.</p>
              )}
            </Card>

            <Card className="bg-[color:var(--surface-0)]">
              <p className="font-semibold text-[color:var(--text-strong)]">교사 권한 안내</p>
              <p className="mt-3 text-sm leading-8 text-[color:var(--text-soft)]">
                교사 계정은 본인 학급 슬롯만 조회하고 수정할 수 있습니다. 학부모 계정은 이 화면에 접근할 수 없습니다.
              </p>
            </Card>
          </div>
        </section>
      ) : null}

      {activeTab === "summary" ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.summary.map((item) => (
            <Card key={item.dateKey} className="bg-[color:var(--surface-0)]">
              <p className="text-sm uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{item.label}</p>
              <p className="mt-4 font-display text-4xl text-[color:var(--text-strong)]">{item.booked}명</p>
              <div className="mt-4 grid gap-2 text-sm text-[color:var(--text-soft)]">
                <p>열린 슬롯 {item.open}개</p>
                <p>신청 불가 {item.blocked}개</p>
                <p>총 슬롯 {item.total}개</p>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      {activeTab === "settings" ? (
        <section className="grid gap-6 lg:grid-cols-2">
          {data.configs.map((config) => (
            <Card key={config.id}>
              <form
                className="grid gap-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleConfigSave(new FormData(event.currentTarget));
                }}
              >
                <input type="hidden" name="weekKey" value={config.weekKey} />
                <div>
                  <p className="text-sm uppercase tracking-[0.14em] text-[color:var(--text-muted)]">주차 설정</p>
                  <h3 className="mt-2 font-display text-3xl text-[color:var(--text-strong)]">{config.weekLabel}</h3>
                </div>
                <div className="grid gap-5 sm:grid-cols-3">
                  <label className="grid gap-2 text-sm text-[color:var(--text-soft)]">
                    시간 간격
                    <select
                      name="slotIntervalMinutes"
                      defaultValue={String(config.slotIntervalMinutes)}
                      className="h-12 rounded-2xl bg-[color:var(--surface-1)] px-4 outline-none"
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
                    <input name="startTime" type="time" defaultValue={config.startTime} className="h-12 rounded-2xl bg-[color:var(--surface-1)] px-4 outline-none" />
                  </label>
                  <label className="grid gap-2 text-sm text-[color:var(--text-soft)]">
                    종료 시간
                    <input name="endTime" type="time" defaultValue={config.endTime} className="h-12 rounded-2xl bg-[color:var(--surface-1)] px-4 outline-none" />
                  </label>
                </div>
                <p className="text-sm leading-7 text-[color:var(--text-soft)]">
                  이미 예약이 존재하는 주차는 시간 간격과 운영 시간을 다시 생성할 수 없습니다.
                </p>
                <div className="flex justify-end">
                  <Button type="submit" disabled={pending} style={{ color: '#ffffff' }}>
                    <Save className="h-4 w-4" style={{ color: '#ffffff' }} />
                    설정 저장
                  </Button>
                </div>
              </form>
            </Card>
          ))}
        </section>
      ) : null}

      {activeTab === "notifications" ? (
        <section className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-[color:var(--text-muted)]">알림</p>
              <h2 className="mt-2 font-display text-4xl text-[color:var(--text-strong)]">새 예약과 변경 사항을 확인하세요</h2>
            </div>
            <Button variant="secondary" onClick={handleAllNotificationsRead} disabled={pending}>
              <CheckCheck className="h-4 w-4" />
              전체 읽음
            </Button>
          </div>
          <div className="grid gap-4">
            {data.notifications.map((notification) => (
              <Card key={notification.id} className={notification.isRead ? "bg-white" : "bg-[color:var(--surface-0)]"}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 rounded-full bg-[color:var(--secondary-container)] p-3 text-[color:var(--secondary-foreground)]">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-[color:var(--text-strong)]">{notification.title}</p>
                      <p className="mt-2 text-sm leading-7 text-[color:var(--text-soft)]">{notification.message}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{formatFullDate(new Date(notification.createdAt))}</p>
                    </div>
                  </div>
                  {!notification.isRead ? (
                    <Button variant="soft" onClick={() => handleNotificationRead(notification.id)} disabled={pending}>
                      읽음 처리
                    </Button>
                  ) : (
                    <Badge variant="muted">읽음</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
