/**
 * Timestamp Utility Functions
 * Standardizes timestamp handling across the app:
 * - Always store as Firestore Timestamp
 * - Always read as JavaScript Date at boundary layer
 * - Never mix formats
 */

import { Timestamp } from 'firebase-admin/firestore';

/**
 * Convert any date format to Firestore Timestamp for storage
 * Use this BEFORE writing to Firestore
 */
export function toFirestoreTimestamp(date: Date | Timestamp | string | number | undefined): Timestamp {
  if (!date) return Timestamp.now();
  
  if (date instanceof Timestamp) {
    return date;
  }
  
  if (date instanceof Date) {
    return Timestamp.fromDate(date);
  }
  
  if (typeof date === 'string') {
    return Timestamp.fromDate(new Date(date));
  }
  
  if (typeof date === 'number') {
    return Timestamp.fromMillis(date);
  }
  
  return Timestamp.now();
}

/**
 * Convert Firestore Timestamp to JavaScript Date for use
 * Use this AFTER reading from Firestore
 */
export function toJavaScriptDate(timestamp: Timestamp | Date | string | undefined): Date {
  if (!timestamp) return new Date();
  
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  
  return new Date();
}

/**
 * Ensure a field is always stored as Firestore Timestamp
 * Useful for preparing data before Firestore writes
 */
export function ensureTimestampField<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  
  for (const field of fields) {
    if (field in result && result[field] !== undefined) {
      result[field] = toFirestoreTimestamp(result[field]) as any;
    }
  }
  
  return result;
}

/**
 * Convert all Timestamp fields in an object to JavaScript Date
 * Useful after reading from Firestore
 */
export function convertTimestampsToDates<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  
  for (const field of fields) {
    if (field in result && result[field] !== undefined) {
      result[field] = toJavaScriptDate(result[field]) as any;
    }
  }
  
  return result;
}

/**
 * Safe date parser - handles any input type
 */
export function safeParseDate(value: any): Date {
  try {
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value);
    }
    return new Date();
  } catch {
    return new Date();
  }
}
