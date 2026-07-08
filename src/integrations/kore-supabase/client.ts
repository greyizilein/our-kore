import { createClient } from "@supabase/supabase-js";

// Public, publishable values — safe to ship in the browser bundle.
const SUPABASE_URL = "https://edawcwxuenhndhpfbieh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkYXdjd3h1ZW5obmRocGZiaWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MjE4MjIsImV4cCI6MjA5OTA5NzgyMn0.TGg8owwjo2Evr-KDFnehe8eF2DxsCGnSH8TS2D9ein0";

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
