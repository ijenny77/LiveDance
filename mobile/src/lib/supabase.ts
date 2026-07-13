import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// Anon-key client only — same trust level as the web app's browser client.
// Admin screens rely on Supabase Auth + RLS ("authenticated" role) for access,
// exactly like app/admin/* on the web. Session persists across app restarts via
// AsyncStorage (the RN equivalent of the browser's localStorage).
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
