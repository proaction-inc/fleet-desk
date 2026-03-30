import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// Server-side client — uses service role if available, falls back to anon
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Public client for client-side operations (newsletter signup)
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);
