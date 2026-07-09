import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  console.warn('Supabase URL is not set. Check your environment variables.');
}

// Client for general browser usage (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for administrative backend operations (service role key, bypasses RLS)
export const getSupabaseAdmin = () => {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseAdmin can only be called in a server context (Server Action, Route Handler, etc.)');
  }
  
  if (!supabaseServiceRoleKey) {
    console.warn('Supabase Service Role Key is not set. Admin bypass queries will fail.');
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
