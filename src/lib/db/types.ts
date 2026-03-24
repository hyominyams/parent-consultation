export type UserType = "PARENT" | "TEACHER";
export type ConsultationType = "PHONE" | "IN_PERSON";
export type SlotStatus = "OPEN" | "BLOCKED" | "BOOKED";

export type ParentUserRow = {
  id: string;
  loginId: string;
  grade: number;
  classroom: number | null;
  studentNumber: number;
  studentName: string;
  parentName: string;
  phone: string;
  pinHash: string;
  createdAt: string;
  updatedAt: string;
};

export type TeacherUserRow = {
  id: string;
  grade: number;
  classroom: number;
  teacherName: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type ConsentRecordRow = {
  id: string;
  userType: UserType;
  parentUserId: string | null;
  teacherUserId: string | null;
  privacyConsent: boolean;
  thirdPartyConsent: boolean;
  consentVersion: string;
  consentedAt: string;
};

export type ClassScheduleConfigRow = {
  id: string;
  grade: number;
  classroom: number;
  weekKey: string;
  slotIntervalMinutes: number;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
};

export type ReservationSlotRow = {
  id: string;
  grade: number;
  classroom: number;
  weekKey: string;
  date: string;
  timeLabel: string;
  startDateTime: string;
  endDateTime: string;
  status: SlotStatus;
  createdAt: string;
  updatedAt: string;
};

export type ReservationRow = {
  id: string;
  parentUserId: string;
  slotId: string;
  consultationType: ConsultationType;
  createdAt: string;
  updatedAt: string;
};

export type TeacherNotificationRow = {
  id: string;
  teacherUserId: string;
  reservationId: string | null;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type Database = {
  public: {
    Tables: {
      ParentUser: {
        Row: ParentUserRow;
        Insert: Omit<ParentUserRow, "createdAt"> & { createdAt?: string };
        Update: Partial<Omit<ParentUserRow, "id" | "createdAt">>;
        Relationships: [];
      };
      TeacherUser: {
        Row: TeacherUserRow;
        Insert: Omit<TeacherUserRow, "createdAt"> & { createdAt?: string };
        Update: Partial<Omit<TeacherUserRow, "id" | "createdAt">>;
        Relationships: [];
      };
      ConsentRecord: {
        Row: ConsentRecordRow;
        Insert: Omit<ConsentRecordRow, "consentedAt"> & { consentedAt?: string };
        Update: Partial<Omit<ConsentRecordRow, "id" | "consentedAt">>;
        Relationships: [];
      };
      ClassScheduleConfig: {
        Row: ClassScheduleConfigRow;
        Insert: Omit<ClassScheduleConfigRow, "createdAt"> & { createdAt?: string };
        Update: Partial<Omit<ClassScheduleConfigRow, "id" | "createdAt">>;
        Relationships: [];
      };
      ReservationSlot: {
        Row: ReservationSlotRow;
        Insert: Omit<ReservationSlotRow, "createdAt"> & { createdAt?: string };
        Update: Partial<Omit<ReservationSlotRow, "id" | "createdAt">>;
        Relationships: [];
      };
      Reservation: {
        Row: ReservationRow;
        Insert: Omit<ReservationRow, "createdAt"> & { createdAt?: string };
        Update: Partial<Omit<ReservationRow, "id" | "createdAt">>;
        Relationships: [];
      };
      TeacherNotification: {
        Row: TeacherNotificationRow;
        Insert: Omit<TeacherNotificationRow, "createdAt" | "isRead"> & {
          createdAt?: string;
          isRead?: boolean;
        };
        Update: Partial<Omit<TeacherNotificationRow, "id" | "createdAt">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      app_book_reservation: {
        Args: {
          p_parent_user_id: string;
          p_slot_id: string;
          p_consultation_type: ConsultationType;
        };
        Returns: string;
      };
      app_delete_reservation: {
        Args: {
          p_parent_user_id: string;
          p_intent?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      UserType: UserType;
      ConsultationType: ConsultationType;
      SlotStatus: SlotStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
