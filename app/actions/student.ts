'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { Lesson, PaymentStatus, LessonStatus } from '@/types';

interface LookupResponse {
  success: boolean;
  error?: string;
  lesson?: Lesson;
  paymentStatus?: PaymentStatus;
  studentId?: string;
}

export async function lookupStudentSession(
  phoneNumber: string,
  lessonCode: string
): Promise<LookupResponse> {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    // 1. Find the lesson by lesson_code
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .eq('lesson_code', lessonCode)
      .maybeSingle();

    if (lessonError) {
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

    return {
      success: true,
      lesson: lesson as Lesson,
      paymentStatus: payment.status as PaymentStatus,
      studentId: student.id,
    };
  } catch (err: any) {
    console.error('Lookup Student Session Error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred' };
  }
}

// Log attendance record
export async function joinLessonAttendance(
  studentId: string,
  lessonId: string
): Promise<{ success: boolean; error?: string; attendanceId?: string }> {
  const supabaseAdmin = getSupabaseAdmin();
  
  try {
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
