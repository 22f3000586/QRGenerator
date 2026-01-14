import { createClient } from "@supabase/supabase-js";

console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
