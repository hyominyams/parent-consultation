import { UserType } from "@prisma/client";

import { CONSENT_VERSION } from "@/lib/config/consent";
import { prisma } from "@/lib/db/prisma";

export async function hasParentConsent(parentUserId: string) {
  const record = await prisma.consentRecord.findFirst({
    where: {
      parentUserId,
    },
  });

  return Boolean(record);
}

export async function hasTeacherConsent(teacherUserId: string) {
  const record = await prisma.consentRecord.findFirst({
    where: {
      teacherUserId,
    },
  });

  return Boolean(record);
}

export async function ensureParentConsent(
  parentUserId: string,
  input: { privacyConsent?: boolean; thirdPartyConsent?: boolean },
) {
  if (await hasParentConsent(parentUserId)) {
    return;
  }

  if (!input.privacyConsent || !input.thirdPartyConsent) {
    throw new Error("CONSENT_REQUIRED");
  }

  await prisma.consentRecord.create({
    data: {
      userType: UserType.PARENT,
      parentUserId,
      privacyConsent: true,
      thirdPartyConsent: true,
      consentVersion: CONSENT_VERSION,
    },
  });
}

export async function ensureTeacherConsent(
  teacherUserId: string,
  input: { privacyConsent?: boolean; thirdPartyConsent?: boolean },
) {
  if (await hasTeacherConsent(teacherUserId)) {
    return;
  }

  if (!input.privacyConsent || !input.thirdPartyConsent) {
    throw new Error("CONSENT_REQUIRED");
  }

  await prisma.consentRecord.create({
    data: {
      userType: UserType.TEACHER,
      teacherUserId,
      privacyConsent: true,
      thirdPartyConsent: true,
      consentVersion: CONSENT_VERSION,
    },
  });
}
