'use server';

import { AccessToken } from 'livekit-server-sdk';
import { resolveSession } from '@/app/actions/student';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Lesson } from '@/types';

interface LiveKitTokenResponse {
  success: boolean;
  error?: string;
  url?: string;
  token?: string;
  roomName?: string;
}

// Mirrors the room-name scheme the app previously used for its Jitsi embeds,
// so mobile and web clients land in the same room.
function roomNameForLesson(lesson: Lesson) {
  return `LiveDance_${lesson.meeting_room || lesson.id.substring(0, 8)}`;
}

// Mints a LiveKit room-access token for a live lesson room. Shared by the
// mobile app's HTTP route (app/api/mobile/livekit/token) and the web lesson
// room page, which can call this server action directly.
export async function getLiveKitToken(
  lessonId: string,
  token: string,
  accessToken?: string
): Promise<LiveKitTokenResponse> {
  if (!lessonId || !token) {
    return { success: false, error: 'Missing lessonId or token' };
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !livekitUrl) {
    return { success: false, error: 'LiveKit is not configured on the server' };
  }

  let lesson: Lesson;
  let identity: string;
  let name: string;

  if (token === 'admin') {
    if (!accessToken) {
      return { success: false, error: 'Missing admin access token' };
    }
    const supabaseAdmin = getSupabaseAdmin();
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return { success: false, error: 'Invalid admin session' };
    }

    const { data: lessonRow, error: lessonError } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .maybeSingle();
    if (lessonError || !lessonRow) {
      return { success: false, error: 'Lesson not found' };
    }

    lesson = lessonRow as Lesson;
    identity = userData.user.id;
    name = 'Instructor';
  } else {
    const res = await resolveSession(token);
    if (!res.success || !res.lesson || res.lesson.id !== lessonId || res.lesson.status !== 'live' || res.paymentStatus !== 'approved') {
      return { success: false, error: res.error || 'Not authorized to join this lesson' };
    }

    lesson = res.lesson;
    identity = res.studentId || token;

    const supabaseAdmin = getSupabaseAdmin();
    const { data: studentRow } = await supabaseAdmin
      .from('students')
      .select('name')
      .eq('id', res.studentId)
      .maybeSingle();
    name = studentRow?.name || 'Student';
  }

  const roomName = roomNameForLesson(lesson);
  const at = new AccessToken(apiKey, apiSecret, { identity, name });
  at.addGrant({ room: roomName, roomJoin: true, canPublish: true, canSubscribe: true });

  return { success: true, url: livekitUrl, token: await at.toJwt(), roomName };
}
