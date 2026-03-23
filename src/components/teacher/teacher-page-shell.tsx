import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, CalendarClock, GraduationCap, Settings2 } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { cn } from "@/lib/utils";

const TEACHER_PAGE_LINKS = [
  { href: "/teacher/dashboard", label: "대시보드", icon: GraduationCap },
  { href: "/teacher/settings", label: "상담 설정", icon: Settings2 },
  { href: "/teacher/availability", label: "날짜 조정", icon: CalendarClock },
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
      <section className="mx-auto w-full max-w-[980px] px-5 py-8 sm:px-8">
        <div className="grid gap-5">
          <header className="overflow-hidden rounded-[1.75rem] border border-[color:var(--primary)]/20 bg-gradient-to-br from-[color:var(--primary)] via-[color:var(--primary)] to-[color:var(--primary-dim)] p-6 text-white shadow-[0_18px_48px_rgba(30,57,75,0.14)] sm:p-8">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <span className="inline-flex rounded-full border border-white/18 bg-white/12 px-3 py-1 text-sm font-semibold text-white">
                    교사 포털
                  </span>
                  <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
                    {title}
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-white/78 sm:text-[0.95rem]">
                    {description}
                  </p>
                </div>
                {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
              </div>

              <div className="flex flex-wrap gap-2 border-t border-white/14 pt-5">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-2 text-sm text-white">
                  <GraduationCap className="h-4 w-4 text-white" />
                  {classLabel}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-2 text-sm text-white">
                  담당 교사 {teacherName}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm",
                    unreadCount > 0
                      ? "bg-white text-[color:var(--primary)]"
                      : "bg-white/12 text-white",
                  )}
                >
                  <Bell className="h-4 w-4" />
                  읽지 않은 알림 {unreadCount}건
                </span>
              </div>

              <nav className="flex flex-wrap gap-2 border-t border-white/14 pt-5">
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
                          ? "bg-white text-[color:var(--primary)]"
                          : "bg-white/10 text-white hover:bg-white/18",
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
