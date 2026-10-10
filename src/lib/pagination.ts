import type { QueryConstraint } from 'firebase-admin/firestore';
import { firestoreAdmin as db } from '@/lib/firebase-admin';

/**
 * Cursor-based Pagination for Firestore
 * Provides efficient pagination without offset (which is slow on large datasets)
 */

export interface PaginationParams {
  pageSize: number;
  cursor?: string; // Base64-encoded document snapshot
  direction?: 'forward' | 'backward';
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  prevCursor?: string;
  hasMore: boolean;
  totalCount?: number; // Optional, requires separate count query
}

/**
 * Encode document snapshot as cursor
 */
export function encodeCursor(docId: string, sortValue: string | number | Date): string {
  const normalized = sortValue instanceof Date ? sortValue.toISOString() : String(sortValue);
  const cursor = `${docId}\u0000${normalized}`;
  return Buffer.from(cursor).toString('base64');
}

/**
 * Decode cursor to get document ID and sort value
 */
export function decodeCursor(cursor: string): { docId: string; sortValue: string } {
  const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
  const separatorIndex = decoded.indexOf('\u0000');
  if (separatorIndex === -1) {
    throw new Error('Invalid cursor format');
  }
  return {
    docId: decoded.slice(0, separatorIndex),
    sortValue: decoded.slice(separatorIndex + 1),
  };
}

/**
 * Paginate Firestore query results using cursor-based pagination
 */
export async function paginateQuery<T extends { id?: string }>(
  collectionPath: string,
  constraints: any[], // Firestore query constraints
  sortField: string,
  sortDirection: 'asc' | 'desc' = 'desc',
  options: PaginationParams
): Promise<PaginatedResult<T>> {
  const { pageSize, cursor, direction = 'forward' } = options;

  // Validate pageSize
  if (pageSize < 1 || pageSize > 100) {
    throw new Error('pageSize must be between 1 and 100');
  }

  try {
    let collection = db.collection(collectionPath);
    let query = collection;

    // Apply constraints
    for (const constraint of constraints) {
      query = query.where(constraint.field, constraint.operator, constraint.value);
    }

    // Apply sorting
    query = query.orderBy(
      sortField,
      sortDirection === 'asc' ? 'asc' : 'desc'
    );

    // If cursor provided, start from that document
    if (cursor) {
      const { docId, sortValue } = decodeCursor(cursor);
      const refDoc = await db.collection(collectionPath).doc(docId).get();

      if (refDoc.exists) {
        // Use the document as the cursor position
        query = direction === 'backward'
          ? query.endBefore(refDoc)
          : query.startAfter(refDoc);
      }
    }

    // Fetch one extra to determine if there are more results
    const snapshot = await query.limit(pageSize + 1).get();
    const docs = snapshot.docs;

    // Determine if there are more results
    const hasMore = docs.length > pageSize;
    const items = docs
      .slice(0, pageSize)
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as T));

    // Generate cursors for pagination
    let nextCursor: string | undefined;
    let prevCursor: string | undefined;

    if (items.length > 0 && hasMore) {
      const lastItem = items[items.length - 1];
      nextCursor = encodeCursor(
        lastItem.id ?? '',
        (lastItem as Record<string, unknown>)[sortField] as string | number | Date
      );
    }

    if (cursor && items.length > 0) {
      const firstItem = items[0];
      prevCursor = cursor; // Previous cursor is the one we started from
    }

    return {
      items,
      nextCursor,
      prevCursor,
      hasMore,
    };
  } catch (error) {
    console.error('Pagination query failed:', error);
    throw error;
  }
}

/**
 * Get total count of documents matching constraints
 * Note: This requires reading all documents, use sparingly
 */
export async function countDocuments(
  collectionPath: string,
  constraints: any[]
): Promise<number> {
  try {
    let query = db.collection(collectionPath);

    for (const constraint of constraints) {
      query = query.where(constraint.field, constraint.operator, constraint.value);
    }

    const snapshot = await query.count().get();
    return snapshot.data().count;
  } catch (error) {
    console.error('Count query failed:', error);
    throw error;
  }
}
