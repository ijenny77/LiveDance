// Values come from mobile/.env (see .env.example) — Expo inlines any var prefixed
// with EXPO_PUBLIC_ into the JS bundle at build time, so these are safe to be public
// (same anon key already exposed in the web app's browser bundle).
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Base URL of the running Next.js app (e.g. http://192.168.1.23:3000), reachable
// from your phone over the same Wi-Fi. Used only for the student session endpoints
// that must run server-side with the service-role key.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — set them in mobile/.env');
}

if (!API_BASE_URL) {
  console.warn('Missing EXPO_PUBLIC_API_URL — set it in mobile/.env to your computer\'s LAN IP running `npm run dev`');
}
