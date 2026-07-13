// Mirrors types/index.ts from the web app.
export type LessonStatus = 'scheduled' | 'live' | 'ended';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface Student {
  id: string;
  name: string;
  phone_number: string;
  date_registered: string;
}

export interface Lesson {
  id: string;
  title: string;
  date: string;
  time: string;
  price: number;
  lesson_code: string;
  status: LessonStatus;
  meeting_room: string;
}

export interface Payment {
  id: string;
  student_id: string;
  lesson_id: string;
  status: PaymentStatus;
  paid_at: string | null;
}

export interface Attendance {
  id: string;
  student_id: string;
  lesson_id: string;
  joined_at: string;
  left_at: string | null;
}

export interface PaymentJoin {
  id: string;
  student_id: string;
  lesson_id: string;
  status: PaymentStatus;
  paid_at: string | null;
  student: { name: string; phone_number: string } | null;
  lesson: { title: string; price: number; date: string } | null;
}

export interface AttendanceJoin {
  id: string;
  student_id: string;
  lesson_id: string;
  joined_at: string;
  left_at: string | null;
  student: { name: string; phone_number: string } | null;
}
