import { UserType } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type AppSession = {
  userId: string;
  userType: UserType;
  grade: number;
  classroom: number;
  displayName: string;
  loginId?: string;
};

const SESSION_COOKIE_NAME = "parent-consultation-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const fallback = "development-only-session-secret-parent-consultation";
  const secret = process.env.SESSION_SECRET ?? fallback;
  return new TextEncoder().encode(secret);
}

export async function setSession(payload: AppSession) {
  const cookieStore = await cookies();
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSessionSecret());

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return payload as AppSession;
  } catch {
    return null;
  }
}

export function getSessionRedirectPath(session: AppSession) {
  return session.userType === UserType.TEACHER ? "/teacher/dashboard" : "/dashboard";
}
