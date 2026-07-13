# LiveDance Academy — Mobile

Expo (React Native) companion app for the LiveDance web project. Covers the same two flows as the website:

- **Student flow** — enter phone + lesson code, watch payment/lesson status update live, join the Jitsi video room when the instructor goes live.
- **Admin flow** — instructor login, dashboard (start/end lesson), lessons, payments queue, students, attendance.

## 1. Configure environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

| Variable | Value |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Same value as `NEXT_PUBLIC_SUPABASE_URL` in the web app's `.env.local` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same value as `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the web app's `.env.local` |
| `EXPO_PUBLIC_API_URL` | `http://<your-computer's-LAN-IP>:3000` — see below |

Find your LAN IP (must be the same Wi-Fi network your phone is on):

- Windows: `ipconfig` → look for "IPv4 Address" under your active adapter.

Do **not** use `localhost` or `127.0.0.1` — that resolves to the phone itself, not your computer. Never put the Supabase **service-role** key in this app; it stays server-side in the Next.js app.

## 2. Run the web app (backend)

The mobile app calls the Next.js app's API routes (`app/api/mobile/*`) for the student flow, and talks to Supabase directly for the admin flow. From the repo root:

```bash
npm run dev
```

Leave this running. Confirm it's reachable from your phone by opening `http://<your-LAN-IP>:3000` in your phone's browser.

## 3. Run the mobile app

```bash
cd mobile
npx expo start
```

Scan the QR code with the **Expo Go** app (iOS/Android) — install it from the App Store / Play Store first. Your phone and computer must be on the same Wi-Fi network.

## Notes

- Admin screens authenticate directly against Supabase (same as the web `/admin` pages) and rely on the existing RLS policies — no new backend code needed there.
- The student flow (`startStudentSession`, `resolveSession`, `joinLessonAttendance`, `leaveLessonAttendance`) is proxied through new route handlers in `app/api/mobile/` on the web app, so the Supabase service-role key never leaves the server.
- The live lesson room renders the same `meet.jit.si` URL as the web app inside a WebView.
