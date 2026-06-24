/**
 * Authorization Helpers
 * Centralized authorization checks for common scenarios
 */

import { createApiError, ErrorCodes } from '@/lib/api-errors';
import type { UserProfile, Role } from '@/lib/types';

/**
 * Verify user has required role
 */
export function requireRole(userProfile: UserProfile | undefined, requiredRoles: Role | Role[]): void {
  if (!userProfile) {
    throw createApiError(ErrorCodes.AUTHENTICATION_ERROR, 'User not authenticated', 401);
  }

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  if (!roles.includes(userProfile.role)) {
    throw createApiError(
      ErrorCodes.AUTHORIZATION_ERROR,
      `Insufficient permissions. Required role: ${roles.join(' or ')}`,
      403
    );
  }
}

/**
 * Verify vendor owns resource (ownership check)
 * Prevents cross-vendor data access
 */
export function requireVendorOwnership(
  userProfile: UserProfile | undefined,
  resourceVendorId: string,
  resourceType: string = 'resource'
): void {
  if (!userProfile) {
    throw createApiError(ErrorCodes.AUTHENTICATION_ERROR, 'User not authenticated', 401);
  }

  if (userProfile.role !== 'vendor') {
    throw createApiError(
      ErrorCodes.AUTHORIZATION_ERROR,
      `Only vendors can access vendor ${resourceType}`,
      403
    );
  }

  if (userProfile.uid !== resourceVendorId) {
    throw createApiError(
      ErrorCodes.AUTHORIZATION_ERROR,
      `You don't have permission to access this ${resourceType}`,
      403
    );
  }
}

/**
 * Verify customer owns resource (ownership check)
 * Prevents cross-user data access
 */
export function requireCustomerOwnership(
  userProfile: UserProfile | undefined,
  resourceUserId: string,
  resourceType: string = 'resource'
): void {
  if (!userProfile) {
    throw createApiError(ErrorCodes.AUTHENTICATION_ERROR, 'User not authenticated', 401);
  }

  if (userProfile.uid !== resourceUserId) {
    throw createApiError(
      ErrorCodes.AUTHORIZATION_ERROR,
      `You don't have permission to access this ${resourceType}`,
      403
    );
  }
}

/**
 * Verify user is admin
 */
export function requireAdmin(userProfile: UserProfile | undefined): void {
  requireRole(userProfile, 'admin');
}

/**
 * Verify user is vendor
 */
export function requireVendor(userProfile: UserProfile | undefined): void {
  requireRole(userProfile, 'vendor');
}

/**
 * Verify user is customer or has no special role
 */
export function requireCustomer(userProfile: UserProfile | undefined): void {
  requireRole(userProfile, 'customer');
}

/**
 * Verify user is authenticated
 */
export function requireAuthentication(userProfile: UserProfile | undefined): void {
  if (!userProfile) {
    throw createApiError(ErrorCodes.AUTHENTICATION_ERROR, 'User not authenticated', 401);
  }
}
