import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/config';

// 1. Sanitization & Anti-XSS Functions
export function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  
  // Strip dangerous script, iframe, HTML tags and inline event handlers
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

// 2. Phone Number Validation
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const clean = phone.replace(/[+\s\-()]/g, '');
  // Must be digits only and length between 8 and 15
  const isDigits = /^\d+$/.test(clean);
  return isDigits && clean.length >= 8 && clean.length <= 15;
}

// 3. Email Address Validation
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// 4. Safe URL Validation
export function isValidUrl(url: string): boolean {
  if (!url) return true; // Optional fields can be empty
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) return false;
  return trimmed.startsWith('https://') || trimmed.startsWith('http://');
}

// 5. Booking Rate Limiting & Anti-Spam Check
const BOOKING_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown between tickets per phone
const bookingTimestamps: Record<string, number> = {};

export function checkBookingRateLimit(phoneKey: string): { allowed: boolean; remainingSeconds?: number } {
  const cleanKey = phoneKey.replace(/[+\s\-()]/g, '');
  const now = Date.now();
  const lastBooking = bookingTimestamps[cleanKey];

  if (lastBooking && now - lastBooking < BOOKING_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((BOOKING_COOLDOWN_MS - (now - lastBooking)) / 1000);
    return { allowed: false, remainingSeconds };
  }

  // Update timestamp
  bookingTimestamps[cleanKey] = now;
  return { allowed: true };
}

// 6. Security Audit Log Service
export interface AuditLogEntry {
  action: string;
  performedByUid: string;
  targetDoctorId?: string;
  details?: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
}

export async function writeAuditLog(
  action: string,
  performedByUid: string,
  targetDoctorId?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const logData: AuditLogEntry = {
      action,
      performedByUid,
      targetDoctorId: targetDoctorId || 'N/A',
      details: details || {},
      timestamp: new Date().toISOString()
    };

    await addDoc(collection(db, "auditLogs"), logData);
  } catch (error) {
    console.error("Audit log creation error:", error);
  }
}
