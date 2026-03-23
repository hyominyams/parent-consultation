import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, CalendarClock, GraduationCap, Settings2 } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TEACHER_PAGE_LINKS = [
  { href: "/teacher/dashboard", label: "대시보드", icon: GraduationCap },
  { href: "/teacher/settings", label: "상담 설정", icon: Settings2 },
  { href: "/teacher/availability", label: "일정 관리", icon: CalendarClock },
] as const;

type TeacherPageShellProps = {
  currentPath: string;
  title: string;
  description: string;
  teacherName: string;
  classLabel: string;
  unreadCount: number;
  actions?: ReactNode;
  children: ReactNode;
};

export function TeacherPageShell({
  currentPath,
  title,
  description,
  teacherName,
  classLabel,
  unreadCount,
  actions,
  children,
}: TeacherPageShellProps) {
  return (
    <main className="min-h-screen">
      <SiteHeader currentPath={currentPath} />
      <section className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8">
        <div className="grid gap-5">
          <header className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_20px_60px_rgba(30,57,75,0.08)]">
            <div className="px-6 py-7 sm:px-8 sm:py-8">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-2xl">
                    <Badge
                      variant="primary"
                      className="rounded-full px-4 py-1.5 font-bold tracking-[0.16em] uppercase"
                    >
                      Teacher Portal
                    </Badge>
                    <h1 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)] sm:text-4xl">
                      {title}
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-[color:var(--text-soft)] sm:text-[0.95rem]">
                      {description}
                    </p>
                  </div>
                  {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--surface-container-low)] px-4 py-2 text-sm font-semibold text-[color:var(--text-strong)]">
                    <GraduationCap className="h-4 w-4 text-[color:var(--primary)]" />
                    {classLabel}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--surface-container-low)] px-4 py-2 text-sm font-semibold text-[color:var(--text-strong)]">
                    담당 교사 {teacherName}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
                      unreadCount > 0
                        ? "bg-[color:var(--primary-container)] text-[color:var(--on-primary-container)]"
                        : "bg-[color:var(--surface-container-low)] text-[color:var(--text-soft)]",
                    )}
                  >
                    <Bell className="h-4 w-4" />
                    읽지 않은 알림 {unreadCount}건
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-black/5 bg-slate-50/60 px-6 py-4 sm:px-8">
              <nav className="flex flex-wrap gap-2">
                {TEACHER_PAGE_LINKS.map((link) => {
                  const Icon = link.icon;
                  const active = currentPath === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                        active
                          ? "bg-[color:var(--primary)] text-white shadow-sm"
                          : "bg-white text-[color:var(--text-soft)] ring-1 ring-inset ring-[color:var(--surface-container-high)] hover:text-[color:var(--text-strong)]",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </header>

          {children}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
