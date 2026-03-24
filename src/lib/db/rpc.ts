import { supabaseAdmin } from "@/lib/db/supabase";
import type { Database } from "@/lib/db/types";

type RpcName = keyof Database["public"]["Functions"];

export async function callRpc<N extends RpcName>(
  fn: N,
  args: Database["public"]["Functions"][N]["Args"],
  message = "Database function failed.",
) {
  const { data, error } = await supabaseAdmin.rpc(fn, args);

  if (error) {
    throw new Error(`${message} ${error.message}`);
  }

  return data as Database["public"]["Functions"][N]["Returns"];
}
