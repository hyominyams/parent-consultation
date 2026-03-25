"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { Bell, ChevronRight } from "lucide-react";

import { cn, formatMonthDay, formatWeekday } from "@/lib/utils";

type TeacherNotificationMenuProps = {
  unreadCount: number;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    scheduleLabel: string | null;
  }>;
};

export function TeacherNotificationMenu({
  unreadCount,
  notifications,
}: TeacherNotificationMenuProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const visibleCount = unreadCount > 99 ? "99+" : String(unreadCount);

  const handlePointerDown = useEffectEvent((event: MouseEvent | TouchEvent) => {
    const target = event.target;

    if (!(target instanceof Node) || !rootRef.current || rootRef.current.contains(target)) {
      return;
    }

    setOpen(false);
  });

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`읽지 않은 알림 ${unreadCount}건`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[color:var(--text-soft)] shadow-[0_14px_30px_rgba(25,54,71,0.08)] ring-1 ring-[color:var(--surface-container-high)] transition-colors hover:text-[color:var(--primary)]"
      >
        <Bell className="h-5 w-5" />
        <span
          className={cn(
            "absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none",
            unreadCount > 0
              ? "bg-[color:var(--primary)] text-white"
              : "bg-[color:var(--surface-container-low)] text-[color:var(--text-muted)]",
          )}
        >
          {visibleCount}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[1.5rem] border border-black/5 bg-white shadow-[0_24px_60px_rgba(25,54,71,0.16)]"
        >
          <div className="border-b border-[color:var(--surface-container-high)] px-5 py-4">
            <p className="text-sm font-semibold text-[color:var(--text-strong)]">알림 미리보기</p>
            <p className="mt-1 text-sm text-[color:var(--text-soft)]">
              최근 알림을 확인하고 대시보드에서 이어서 관리할 수 있습니다.
            </p>
          </div>

          {notifications.length === 0 ? (
            <div className="px-5 py-8 text-sm leading-6 text-[color:var(--text-soft)]">
              표시할 알림이 없습니다.
            </div>
          ) : (
            <div className="max-h-[22rem] overflow-y-auto p-2">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href="/teacher/dashboard"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-[1.2rem] px-4 py-3 transition-colors",
                    notification.isRead
                      ? "bg-white hover:bg-[color:var(--surface-container-low)]"
                      : "bg-[color:var(--primary-container)]/35 hover:bg-[color:var(--primary-container)]/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2.5 w-2.5 shrink-0 rounded-full",
                            notification.isRead
                              ? "bg-[color:var(--surface-container-high)]"
                              : "bg-[color:var(--primary)]",
                          )}
                        />
                        <p className="truncate text-sm font-semibold text-[color:var(--text-strong)]">
                          {notification.title}
                        </p>
                      </div>
                      <p className="mt-2 truncate text-sm text-[color:var(--text-soft)]">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-xs font-medium text-[color:var(--text-muted)]">
                        {notification.scheduleLabel ??
                          `${formatMonthDay(notification.createdAt)} · ${formatWeekday(notification.createdAt)}`}
                      </p>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="border-t border-[color:var(--surface-container-high)] p-2">
            <Link
              href="/teacher/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-[1rem] px-3 py-3 text-sm font-semibold text-[color:var(--primary)] transition-colors hover:bg-[color:var(--surface-container-low)]"
            >
              대시보드에서 전체 알림 보기
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
