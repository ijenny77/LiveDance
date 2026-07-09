export type LessonStatus = 'scheduled' | 'live' | 'ended';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface Student {
  id: string;
  name: string;
  phone_number: string;
  date_registered: string; // ISO timestamp
}

export interface Lesson {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
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
  paid_at: string | null; // ISO timestamp
}

export interface Attendance {
  id: string;
  student_id: string;
  lesson_id: string;
  joined_at: string;
  left_at: string | null;
}

// Extended types for UI joins
export interface StudentPaymentDetail {
  id: string;
  student_name: string;
  student_phone: string;
  lesson_title: string;
  lesson_price: number;
  lesson_date: string;
  status: PaymentStatus;
  paid_at: string | null;
}

export interface AttendanceDetail {
  id: string;
  student_name: string;
  student_phone: string;
  joined_at: string;
  left_at: string | null;
}
