import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";

function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!value) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  return value;
}

function getServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!value) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return value;
}

declare global {
  var supabaseAdmin:
    | ReturnType<typeof createClient<Database>>
    | undefined;
}

export const supabaseAdmin =
  global.supabaseAdmin ??
  createClient<Database>(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

if (process.env.NODE_ENV !== "production") {
  global.supabaseAdmin = supabaseAdmin;
}
