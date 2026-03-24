import type { PostgrestMaybeSingleResponse, PostgrestResponse, PostgrestSingleResponse } from "@supabase/supabase-js";

export function createId() {
  return crypto.randomUUID();
}

export function nowIsoString() {
  return new Date().toISOString();
}

export function requireData<T>(
  response: PostgrestSingleResponse<T> | PostgrestResponse<T>,
  message = "Database request failed.",
) {
  if (response.error) {
    throw new Error(`${message} ${response.error.message}`);
  }

  return response.data;
}

export function requireMaybeSingle<T>(
  response: PostgrestMaybeSingleResponse<T>,
  message = "Database request failed.",
) {
  if (response.error) {
    throw new Error(`${message} ${response.error.message}`);
  }

  return response.data;
}
