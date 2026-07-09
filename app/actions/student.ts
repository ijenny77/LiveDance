'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { Lesson, PaymentStatus, LessonStatus } from '@/types';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SessionResponse {
  success: boolean;
  error?: string;
  lesson?: Lesson;
  paymentStatus?: PaymentStatus;
  studentId?: string;
  token?: string;
}

// Looks up (or creates) the student + pending payment for a phone/lesson-code pair,
// then mints a short-lived opaque token standing in for that identity in URLs.
export async function startStudentSession(
  phoneNumber: string,
  lessonCode: string
): Promise<SessionResponse> {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    // 1. Find the lesson by lesson_code
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .eq('lesson_code', lessonCode)
      .maybeSingle();

    if (lessonError) {
      console.error('Lesson lookup error:', lessonError);
      return { success: false, error: 'Database error reading lesson' };
    }

    if (!lesson) {
      return { success: false, error: 'Invalid lesson code' };
    }

    // A lesson cannot be joined if it has ended
    if (lesson.status === 'ended') {
      return { success: false, error: 'This lesson has already ended' };
    }

    // 2. Find or create the student by phone number
    let { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (studentError) {
      return { success: false, error: 'Database error reading student profile' };
    }

    if (!student) {
      // Auto-create student. Default name can be 'Student (Phone Ending in XXX)'
      const lastFour = phoneNumber.slice(-4);
      const defaultName = `Dancer ${lastFour}`;

      const { data: newStudent, error: createError } = await supabaseAdmin
        .from('students')
        .insert({
          name: defaultName,
          phone_number: phoneNumber,
        })
        .select()
        .single();

      if (createError) {
        return { success: false, error: 'Failed to create student profile' };
      }
      student = newStudent;
    }

    // 3. Find or create payment record for this student and lesson
    let { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('student_id', student.id)
      .eq('lesson_id', lesson.id)
      .maybeSingle();

    if (paymentError) {
      return { success: false, error: 'Database error reading payment status' };
    }

    if (!payment) {
      // Auto-create pending payment record
      const { data: newPayment, error: createPaymentError } = await supabaseAdmin
        .from('payments')
        .insert({
          student_id: student.id,
          lesson_id: lesson.id,
          status: 'pending'
        })
        .select()
        .single();

      if (createPaymentError) {
        return { success: false, error: 'Failed to initialize payment record' };
      }
      payment = newPayment;
    }

    // 4. Mint a fresh session token for this student/lesson pair
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .insert({
        student_id: student.id,
        lesson_id: lesson.id,
        expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      })
      .select('token')
      .single();

    if (sessionError) {
      return { success: false, error: 'Failed to start session' };
    }

    return {
      success: true,
      lesson: lesson as Lesson,
      paymentStatus: payment.status as PaymentStatus,
      studentId: student.id,
      token: session.token,
    };
  } catch (err: any) {
    console.error('Start Student Session Error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred' };
  }
}

// Resolves an opaque session token back into the lesson/payment status it represents.
// Used by /status and /lesson/[id] instead of ever passing phone numbers or lesson codes around.
export async function resolveSession(token: string): Promise<SessionResponse> {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('student_id, lesson_id, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (sessionError) {
      return { success: false, error: 'Database error reading session' };
    }

    if (!session || new Date(session.expires_at) < new Date()) {
      if (session) {
        // Lazily clean up the expired row instead of letting the table grow unbounded
        await supabaseAdmin.from('sessions').delete().eq('token', token);
      }
      return { success: false, error: 'Your session has expired. Please enter your details again.' };
    }

    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .eq('id', session.lesson_id)
      .maybeSingle();

    if (lessonError || !lesson) {
      return { success: false, error: 'Lesson no longer exists' };
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('status')
      .eq('student_id', session.student_id)
      .eq('lesson_id', session.lesson_id)
      .maybeSingle();

    if (paymentError || !payment) {
      return { success: false, error: 'Payment record not found' };
    }

    return {
      success: true,
      lesson: lesson as Lesson,
      paymentStatus: payment.status as PaymentStatus,
      studentId: session.student_id,
      token,
    };
  } catch (err: any) {
    console.error('Resolve Session Error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred' };
  }
}

// Resolves a session token to the {studentId, lessonId} it grants, or null if
// the token is missing/expired. Shared by the attendance actions below so that
// attendance can only ever be logged for the student/lesson a valid token actually
// represents — never for an arbitrary caller-supplied id.
async function getActiveSessionIdentity(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  token: string
): Promise<{ studentId: string; lessonId: string } | null> {
  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('student_id, lesson_id, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!session || new Date(session.expires_at) < new Date()) {
    return null;
  }

  return { studentId: session.student_id, lessonId: session.lesson_id };
}

// Log attendance record. Takes a session token (not raw ids) so a caller can only
// ever affect the attendance row for the student/lesson their own valid token grants.
export async function joinLessonAttendance(
  token: string
): Promise<{ success: boolean; error?: string; attendanceId?: string }> {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const identity = await getActiveSessionIdentity(supabaseAdmin, token);
    if (!identity) {
      return { success: false, error: 'Invalid or expired session' };
    }
    const { studentId, lessonId } = identity;

    // Only log attendance if the payment for this lesson has actually been approved
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('status')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (!payment || payment.status !== 'approved') {
      return { success: false, error: 'Payment not approved for this lesson' };
    }

    // Check if active attendance already exists
    const { data: existing } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)
      .is('left_at', null)
      .maybeSingle();

    if (existing) {
      return { success: true, attendanceId: existing.id };
    }

    const { data, error } = await supabaseAdmin
      .from('attendance')
      .insert({
        student_id: studentId,
        lesson_id: lessonId,
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, attendanceId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Records the exit time for the caller's own active attendance row, resolved from
// their session token — mirrors joinLessonAttendance's ownership guarantee.
export async function leaveLessonAttendance(
  token: string
): Promise<{ success: boolean; error?: string }> {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const identity = await getActiveSessionIdentity(supabaseAdmin, token);
    if (!identity) {
      return { success: false, error: 'Invalid or expired session' };
    }
    const { studentId, lessonId } = identity;

    const { data: lastAttendance } = await supabaseAdmin
      .from('attendance')
      .select('id')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)
      .is('left_at', null)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastAttendance) {
      await supabaseAdmin
        .from('attendance')
        .update({ left_at: new Date().toISOString() })
        .eq('id', lastAttendance.id);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
