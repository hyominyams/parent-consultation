import { CONSENT_VERSION } from "@/lib/config/consent";
import { createId } from "@/lib/db/helpers";
import { supabaseAdmin } from "@/lib/db/supabase";

export async function hasParentConsent(parentUserId: string) {
  const { count, error } = await supabaseAdmin
    .from("ConsentRecord")
    .select("id", { count: "exact", head: true })
    .eq("parentUserId", parentUserId);

  if (error) {
    throw new Error(`Failed to check parent consent. ${error.message}`);
  }

  return Boolean(count);
}

export async function hasTeacherConsent(teacherUserId: string) {
  const { count, error } = await supabaseAdmin
    .from("ConsentRecord")
    .select("id", { count: "exact", head: true })
    .eq("teacherUserId", teacherUserId);

  if (error) {
    throw new Error(`Failed to check teacher consent. ${error.message}`);
  }

  return Boolean(count);
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

  const { error } = await supabaseAdmin.from("ConsentRecord").insert({
    id: createId(),
    userType: "PARENT",
    parentUserId,
    teacherUserId: null,
    privacyConsent: true,
    thirdPartyConsent: true,
    consentVersion: CONSENT_VERSION,
  });

  if (error) {
    throw new Error(`Failed to save parent consent. ${error.message}`);
  }
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

  const { error } = await supabaseAdmin.from("ConsentRecord").insert({
    id: createId(),
    userType: "TEACHER",
    parentUserId: null,
    teacherUserId,
    privacyConsent: true,
    thirdPartyConsent: true,
    consentVersion: CONSENT_VERSION,
  });

  if (error) {
    throw new Error(`Failed to save teacher consent. ${error.message}`);
  }
}
