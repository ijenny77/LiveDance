import { getLiveKitToken } from '@/app/actions/livekit';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const lessonId = typeof body?.lessonId === 'string' ? body.lessonId : '';
  const token = typeof body?.token === 'string' ? body.token : '';
  const accessToken = typeof body?.accessToken === 'string' ? body.accessToken : '';

  const result = await getLiveKitToken(lessonId, token, accessToken);
  return Response.json(result, { status: result.success ? 200 : 400 });
}
