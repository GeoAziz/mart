import type { UserProfile } from '@/lib/types';
import { createApiError, ErrorCodes } from '@/lib/api-errors';

/**
 * Vendor Data Isolation
 * Ensures vendors can only access their own products, orders, and data
 */

/**
 * Verify vendor owns the product
 */
export function verifyVendorOwnsProduct(
  vendorId: string,
  productVendorId: string
): void {
  if (vendorId !== productVendorId) {
    throw createApiError(
      ErrorCodes.AUTHORIZATION_ERROR,
      'You do not have permission to access this product',
      403
    );
  }
}

/**
 * Verify vendor can access this order
 */
export function verifyVendorCanAccessOrder(
  vendorId: string,
  orderVendorIds: string[]
): void {
  if (!orderVendorIds.includes(vendorId)) {
    throw createApiError(
      ErrorCodes.AUTHORIZATION_ERROR,
      'You do not have permission to access this order',
      403
    );
  }
}

/**
 * Verify user owns this resource
 */
export function verifyUserOwnsResource(userId: string, resourceUserId: string): void {
  if (userId !== resourceUserId) {
    throw createApiError(
      ErrorCodes.AUTHORIZATION_ERROR,
      'You do not have permission to access this resource',
      403
    );
  }
}

/**
 * Build vendor-scoped query filter
 * Used to automatically filter queries to only include vendor's data
 */
export function getVendorDataFilter(userProfile: UserProfile): {
  field: string;
  operator: FirebaseFirestore.WhereFilterOp;
  value: string | string[];
} | null {
  if (userProfile.role === 'vendor') {
    return {
      field: 'vendorId',
      operator: '==',
      value: userProfile.uid,
    };
  }

  if (userProfile.role === 'customer') {
    return {
      field: 'userId',
      operator: '==',
      value: userProfile.uid,
    };
  }

  // Admin can access all
  return null;
}

/**
 * Verify user role has permission for action
 */
export function verifyUserRolePermission(
  userProfile: UserProfile,
  allowedRoles: UserProfile['role'][]
): void {
  if (!allowedRoles.includes(userProfile.role)) {
    throw createApiError(
      ErrorCodes.AUTHORIZATION_ERROR,
      `This action requires one of roles: ${allowedRoles.join(', ')}`,
      403
    );
  }
}

/**
 * Filter array of items to only those vendor has access to
 */
export function filterByVendor<T extends { vendorId?: string }>(
  items: T[],
  vendorId: string
): T[] {
  return items.filter((item) => item.vendorId === vendorId);
}

/**
 * Extract vendor ID from user profile with validation
 */
export function getVendorIdFromUser(userProfile: UserProfile): string {
  if (userProfile.role !== 'vendor') {
    throw createApiError(
      ErrorCodes.AUTHORIZATION_ERROR,
      'This action is only available to vendors',
      403
    );
  }

  return userProfile.uid;
}
