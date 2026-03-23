import Link from "next/link";
import { Bell, BookOpen, CalendarRange, GraduationCap, LogOut, ShieldCheck } from "lucide-react";

import { logoutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type SiteHeaderProps = {
  currentPath?: string;
};

export async function SiteHeader({ currentPath }: SiteHeaderProps) {
  const session = await getSession();

  const unreadCount =
    session?.userType === "TEACHER"
      ? await prisma.teacherNotification.count({
          where: {
            teacherUserId: session.userId,
            isRead: false,
          },
        })
      : 0;

  const links =
    session?.userType === "TEACHER"
      ? [{ href: "/teacher/dashboard", label: "교사 대시보드", icon: GraduationCap }]
      : [
          { href: "/", label: "소개", icon: BookOpen },
          { href: "/reserve", label: "예약", icon: CalendarRange },
          { href: "/dashboard", label: "내 신청", icon: ShieldCheck },
        ];

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1180px] items-center px-5 py-4 sm:px-8">
        {/* Left Section: Logo */}
        <div className="flex flex-1 justify-start">
          <Link
            href="/"
            className="group flex flex-col justify-center leading-none"
          >
            <span className="font-logo text-[1.4rem] font-bold italic tracking-tight text-[color:var(--primary)] transition-colors group-hover:text-[color:var(--text-strong)] sm:text-[1.6rem]">
              Sinwol
            </span>
            <span className="mt-0.5 text-[0.55rem] font-medium tracking-[0.16em] text-[color:var(--text-subtle)] uppercase transition-colors group-hover:text-[color:var(--text-soft)]">
              Elementary
            </span>
          </Link>
        </div>

        {/* Center Section: Navigation Links - Absolutely Centered */}
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex">
          <div className="flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const active = currentPath === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={active ? { color: '#ffffff' } : undefined}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                    active
                      ? "bg-[color:var(--primary)] text-[#FFFFFF] shadow-[0_14px_30px_rgba(26,95,122,0.15)]"
                      : "text-[color:var(--text-soft)] hover:bg-[color:var(--surface-1)]"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      active ? "text-[#FFFFFF]" : "text-[color:var(--text-subtle)]"
                    }`}
                    style={active ? { color: '#ffffff' } : undefined}
                  />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Section: Auth/Buttons */}
        <div className="flex flex-1 items-center justify-end gap-3">
          {session?.userType === "TEACHER" ? (
            <Badge variant={unreadCount > 0 ? "booked" : "muted"} className="hidden sm:inline-flex">
              <Bell className="mr-1 h-3.5 w-3.5" />
              새 알림 {unreadCount}건
            </Badge>
          ) : null}
          
          {session ? (
            <>
              <div className="hidden rounded-full bg-white px-4 py-2 text-sm text-[color:var(--text-soft)] shadow-[0_14px_30px_rgba(25,54,71,0.08)] sm:block">
                {session.displayName}
              </div>
              <form action={logoutAction}>
                <Button variant="soft" size="sm" className="rounded-full">
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </Button>
              </form>
            </>
          ) : (
            <Button asChild variant="primary" size="sm" className="rounded-full px-6" style={{ color: '#ffffff' }}>
              <Link href={currentPath === "/" ? "/reserve" : "/auth"} style={{ color: '#ffffff' }}>
                {currentPath === "/" ? "시작하기" : "로그인"}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
