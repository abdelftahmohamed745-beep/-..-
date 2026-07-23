export type PatientStatus = 'waiting' | 'called' | 'done' | 'cancelled';
export type SubscriptionStatus = 'trial' | 'active' | 'expired';

export interface DoctorWorkHours {
  open: string; // e.g. "09:00"
  close: string; // e.g. "21:00"
  maxPatientsPerDay: number;
  daysOfWeek: string[]; // e.g. ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"]
}

export interface ClinicServiceItem {
  serviceName: string;
  price: string;
}

export interface DoctorProfile {
  uid: string;
  name: string;
  specialty: string;
  clinicName: string;
  qrCodeId: string;
  phone?: string;
  whatsappNumber?: string;
  address: string;
  city?: string;
  photoUrl?: string;
  description?: string;
  servicesAndPrices?: ClinicServiceItem[];
  clinicPhotos?: string[];
  subscriptionStatus: SubscriptionStatus;
  trialEndDate: string; // ISO date string
  subscriptionEndDate?: string;
  avgConsultTime: number; // in minutes, e.g. 15
  workHours: DoctorWorkHours;
  createdAt: string;
  isActive?: boolean; // Platform admin control: true = active, false = deactivated
  isAdmin?: boolean; // Platform administrator flag
}

export interface PatientRecord {
  id: string;
  doctorId: string;
  clinicId?: string;
  userId?: string;
  sequenceNumber: number;
  queueNumber?: number;
  name: string;
  phone: string;
  status: PatientStatus;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO string
  updatedAt?: string;
  calledAt?: string; // ISO string
  doneAt?: string; // ISO string
  cancelledAt?: string; // ISO string
  estimatedMinutes?: number;
  notificationSent?: boolean;
  notificationSentAt?: string;
  notifiedForTwoTurns?: boolean;
  notifiedForOneTurn?: boolean;
  notifiedForTenMinutes?: boolean;
  notificationPreference?: NotificationTimingPreference;
}

export type NotificationTimingPreference = 'two_turns' | 'one_turn' | 'ten_minutes';

export interface UserNotificationSettings {
  timingPreference: NotificationTimingPreference;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  fcmToken?: string;
  updatedAt?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'near_turn' | 'system' | 'queue_update';
  bookingId?: string;
  clinicName?: string;
  isRead: boolean;
  createdAt: string;
}

export interface QueueSummary {
  totalWaiting: number;
  totalCalled: number;
  totalDone: number;
  currentCallingNumber: number | null;
  avgConsultTime: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}
