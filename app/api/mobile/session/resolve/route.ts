import { resolveSession } from '@/app/actions/student';

// Resolves an opaque session token to its lesson/payment status for the mobile app.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';

  if (!token) {
    return Response.json({ success: false, error: 'Missing session token' }, { status: 400 });
  }

  const result = await resolveSession(token);
  return Response.json(result, { status: result.success ? 200 : 400 });
}
