import { createClient } from '@supabase/supabase-js';

// Use this client strictly inside isolated Admin Server Actions or Server Components.
// It bypasses Row-Level Security entirely! 
export function createAdminClient() {
  if (!process.env.SUPABASE_SECRET_KEY) {
    throw new Error('Missing SUPABASE_SECRET_KEY. Cannot run admin operations.');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
