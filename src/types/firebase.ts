import type { Timestamp } from 'firebase/firestore';

export interface FirebaseTimestamp {
  toDate(): Date;
}

// Type guard to check if a value is a Firebase Timestamp
export function isFirebaseTimestamp(value: any): value is FirebaseTimestamp {
  return value && typeof value.toDate === 'function';
}

// Utility function to safely convert any timestamp-like value to Date
export function convertToDate(value: Date | Timestamp | FirebaseTimestamp | any): Date {
  if (value instanceof Date) {
    return value;
  }
  if (isFirebaseTimestamp(value)) {
    return value.toDate();
  }
  return new Date(value);
}
