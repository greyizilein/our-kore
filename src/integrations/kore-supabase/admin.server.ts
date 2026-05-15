import { createClient } from "@supabase/supabase-js";

// Server-only admin client. Bypasses RLS. Never import from client code.
const url = process.env.KORE_SUPABASE_URL;
const serviceRoleKey = process.env.KORE_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  // Don't throw at module load — server functions will surface a clearer error.
  console.warn("[kore-supabase] Missing KORE_SUPABASE_URL or KORE_SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient(url ?? "", serviceRoleKey ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});
