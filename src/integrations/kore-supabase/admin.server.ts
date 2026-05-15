import { createClient } from "@supabase/supabase-js";

// Server-only admin client. Bypasses RLS. Never import from client code.
// Uses a Proxy so module load never throws even when env vars are missing.
const url = process.env.KORE_SUPABASE_URL || "https://zrjljdybvzvjofgldwyc.supabase.co";
const serviceRoleKey = process.env.KORE_SUPABASE_SERVICE_ROLE_KEY ?? "";

let _client: ReturnType<typeof createClient> | null = null;
function getClient() {
  if (_client) return _client;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "KORE_SUPABASE_SERVICE_ROLE_KEY is required for this operation. " +
      "Add it in Vercel → project settings → Environment Variables."
    );
  }
  _client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return _client;
}

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_t, prop: string | symbol) {
    if (prop === "then") return undefined; // prevent Promise.resolve(supabaseAdmin) misuse
    const client = getClient();
    const val = (client as any)[prop];
    return typeof val === "function" ? val.bind(client) : val;
  },
});
