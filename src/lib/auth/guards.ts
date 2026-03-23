import { UserType } from "@prisma/client";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

export async function redirectAuthenticatedUser() {
  const session = await getSession();

  if (!session) {
    return;
  }

  if (session.userType === UserType.TEACHER) {
    const teacher = await prisma.teacherUser.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
      },
    });

    if (!teacher) {
      return;
    }

    redirect("/teacher/dashboard");
  }

  const parent = await prisma.parentUser.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      reservation: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!parent) {
    return;
  }

  redirect(parent.reservation ? "/dashboard" : "/reserve");
}

export async function requireParentSession() {
  const session = await getSession();

  if (!session) {
    redirect("/auth");
  }

  if (session.userType === UserType.TEACHER) {
    redirect("/teacher/dashboard");
  }

  return session;
}

export async function requireTeacherSession() {
  const session = await getSession();

  if (!session) {
    redirect("/auth?role=teacher");
  }

  if (session.userType === UserType.PARENT) {
    redirect("/dashboard");
  }

  return session;
}
