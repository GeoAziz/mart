/**
 * API Route Timestamp Utilities
 * Handles safe timestamp conversion at API boundaries
 */

import { Timestamp } from 'firebase-admin/firestore';
import { safeParseDate } from './timestamp-utils';

/**
 * Safely convert Firestore document data to proper date format
 * Use this when reading from Firestore in API routes
 */
export function normalizeFirestoreData<T extends Record<string, any>>(data: T): T {
  const result: any = { ...data };
  
  // Common date fields in our schema
  const dateFields = ['createdAt', 'updatedAt', 'dateAdded', 'timestamp', 'requestedAt', 'processedAt'];
  
  for (const field of dateFields) {
    if (field in result && result[field] !== undefined) {
      result[field] = safeParseDate(result[field]);
    }
  }
  
  return result as T;
}

/**
 * Safely convert nested status history timestamps
 */
export function normalizeStatusHistory(history: any[]): any[] {
  if (!Array.isArray(history)) return history;
  
  return history.map(entry => ({
    ...entry,
    timestamp: entry.timestamp ? safeParseDate(entry.timestamp) : new Date(),
  }));
}

/**
 * Wrap Firestore document with proper type conversion
 */
export function convertFirestoreDocToResponse<T>(doc: any): T & { id: string } {
  const data = doc.data();
  const normalized = normalizeFirestoreData(data);
  
  // Handle nested status history if it exists
  if ('statusHistory' in normalized && Array.isArray(normalized.statusHistory)) {
    normalized.statusHistory = normalizeStatusHistory(normalized.statusHistory);
  }
  
  return {
    ...normalized,
    id: doc.id,
  } as T & { id: string };
}
