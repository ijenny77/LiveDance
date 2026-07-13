import { startStudentSession } from '@/app/actions/student';

// Thin HTTP wrapper around startStudentSession() so the mobile app can start a
// student session without ever holding the Supabase service-role key itself.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const phoneNumber = typeof body?.phoneNumber === 'string' ? body.phoneNumber : '';
  const lessonCode = typeof body?.lessonCode === 'string' ? body.lessonCode : '';

  if (!phoneNumber || !lessonCode) {
    return Response.json({ success: false, error: 'Phone number and lesson code are required' }, { status: 400 });
  }

  const result = await startStudentSession(phoneNumber, lessonCode);
  return Response.json(result, { status: result.success ? 200 : 400 });
}
