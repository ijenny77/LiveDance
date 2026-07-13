import { leaveLessonAttendance } from '@/app/actions/student';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';

  if (!token) {
    return Response.json({ success: false, error: 'Missing session token' }, { status: 400 });
  }

  const result = await leaveLessonAttendance(token);
  return Response.json(result, { status: result.success ? 200 : 400 });
}
