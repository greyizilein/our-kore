import { createClient } from "@supabase/supabase-js";

// Public, publishable values — safe to ship in the browser bundle.
const SUPABASE_URL = "https://zrjljdybvzvjofgldwyc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyamxqZHlidnp2am9mZ2xkd3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTAwNTgsImV4cCI6MjA5NDA4NjA1OH0.EQNM6u6eakZV3moJtAcvI0bYMieAn2JT1PZ5xmXsvls";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "kore.auth",
  },
});

export const KORE_SUPABASE_URL = SUPABASE_URL;
export const KORE_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
