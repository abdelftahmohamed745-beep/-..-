export type PatientStatus = 'waiting' | 'called' | 'done' | 'cancelled';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';
export type SubscriptionPlan = 'monthly' | 'yearly';

export type ClinicRole = 'OWNER' | 'DOCTOR' | 'SECRETARY' | 'STAFF';

export type ClinicPermission =
  | 'VIEW_CLINIC'
  | 'EDIT_CLINIC'
  | 'VIEW_PATIENTS'
  | 'CREATE_PATIENT'
  | 'EDIT_PATIENT'
  | 'VIEW_APPOINTMENTS'
  | 'CREATE_APPOINTMENT'
  | 'EDIT_APPOINTMENT'
  | 'MANAGE_QUEUE'
  | 'VIEW_DOCTORS'
  | 'MANAGE_DOCTORS'
  | 'VIEW_FINANCE'
  | 'MANAGE_FINANCE'
  | 'REFUND_PAYMENT'
  | 'EDIT_PRICES'
  | 'MANAGE_MEMBERS'
  | 'MANAGE_SETTINGS'
  | 'VIEW_REPORTS'
  | 'MANAGE_SUBSCRIPTION';

export interface ClinicMember {
  id: string; // Document ID (usually uid or orgId_uid)
  uid: string; // Firebase Auth User ID
  organizationId: string; // Clinic Doctor Profile ID / Organization ID
  role: ClinicRole;
  displayName: string;
  email: string;
  status: 'active' | 'disabled' | 'invited';
  createdAt: string; // ISO string
  updatedAt?: string;
  invitedBy?: string;
  customPermissions?: ClinicPermission[];
}

export interface ClinicInvitation {
  id: string; // Token / document ID (e.g., inv_123456)
  organizationId: string;
  clinicName: string;
  invitedEmail: string;
  invitedName: string;
  role: ClinicRole;
  customPermissions?: ClinicPermission[];
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt: string; // ISO string
  expiresAt: string; // ISO string
  invitedBy: string; // Owner UID
  invitedByName?: string;
  acceptedByUid?: string;
  acceptedAt?: string;
}

export interface ClinicAuditLog {
  id: string;
  organizationId: string;
  actorUid: string;
  actorName?: string;
  action:
    | 'member_added'
    | 'member_invited'
    | 'invitation_accepted'
    | 'invitation_revoked'
    | 'role_changed'
    | 'member_disabled'
    | 'member_enabled'
    | 'member_removed'
    | 'permission_updated'
    | 'payment_created'
    | 'payment_updated'
    | 'expense_created'
    | 'expense_updated'
    | 'expense_deleted'
    | 'refund_created'
    | 'service_created'
    | 'service_updated'
    | 'service_price_changed';
  targetUid?: string;
  targetEmail?: string;
  targetName?: string;
  details?: string;
  timestamp: string; // ISO string
}

export interface ClinicService {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  price: number;
  active: boolean;
  createdAt: string; // ISO string
  updatedAt?: string;
  createdBy: string;
}

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';

export interface ClinicTransaction {
  id: string;
  organizationId: string;
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  appointmentId?: string;
  serviceId?: string;
  serviceName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number; // totalAmount - paidAmount
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string; // ISO string
  updatedAt?: string;
  refundDetails?: {
    refundAmount: number;
    reason: string;
    refundedBy: string;
    refundedByName?: string;
    refundedAt: string; // ISO string
  };
}

export type ExpenseCategory = 'RENT' | 'UTILITIES' | 'MEDICAL_SUPPLIES' | 'SALARIES' | 'MAINTENANCE' | 'OTHER';

export interface ClinicExpense {
  id: string;
  organizationId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  note?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string; // ISO string
  updatedAt?: string;
}

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
  referenceCode?: string; // Unique fixed clinic code e.g. REF-A1B2C3
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
  ratingAverage?: number; // e.g. 4.8
  ratingCount?: number; // e.g. 15
}

export interface SubscriptionLog {
  id: string;
  clinicId: string;
  clinicName: string;
  doctorName: string;
  referenceCode: string;
  plan: SubscriptionPlan;
  amount: number; // Fixed 200 or 1500 EGP
  activatedAt: string; // ISO string
  expiresAt: string; // ISO string
  adminId: string;
  action: 'activate' | 'extend' | 'cancel';
  notes?: string;
}

export interface DoctorRating {
  id: string;
  doctorId: string;
  patientRecordId: string;
  patientName: string;
  patientPhone?: string;
  stars: number; // 1 to 5
  comment?: string;
  createdAt: string; // ISO string
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
  type: 'near_turn' | 'system' | 'queue_update' | 'followup_reminder';
  bookingId?: string;
  clinicName?: string;
  isRead: boolean;
  createdAt: string;
}

export type FollowUpAppointmentStatus = 'upcoming' | 'confirmed' | 'attended' | 'cancelled' | 'no_show';

export interface FollowUpReminderSettings {
  oneDayBefore: boolean;
  twoHoursBefore: boolean;
}

export interface FollowUpAppointment {
  id: string;
  patientId?: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName?: string;
  clinicId: string;
  clinicName?: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  notes?: string;
  reason?: string;
  reminderSettings: FollowUpReminderSettings;
  appointmentStatus: FollowUpAppointmentStatus;
  rescheduleRequested?: boolean;
  requestedNewDate?: string;
  requestedNewTime?: string;
  createdAt: string; // ISO string
  updatedAt?: string;
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
