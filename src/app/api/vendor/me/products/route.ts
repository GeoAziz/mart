import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { requireVendor, requireAdmin } from '@/lib/authorization';
import { formatApiError } from '@/lib/api-errors';
import { firestoreAdmin as db } from '@/lib/firebase-admin';
import { getVendorIdFromUser, verifyVendorOwnsProduct } from '@/lib/vendor-isolation';
import { formatApiError, createApiError, ErrorCodes } from '@/lib/api-errors';
import { paginateQuery } from '@/lib/pagination';
import { getCachedVendorProducts, cacheVendorProducts } from '@/lib/cache-strategy';

/**
 * Vendor Products Route
 * GET /api/vendor/me/products - List vendor's products with pagination
 * POST /api/vendor/me/products - Create new product
 */

async function getVendorProductsHandler(req: AuthenticatedRequest) {
  try {
    requireVendor(authenticatedUser || req.userProfile);
    const vendorId = getVendorIdFromUser(req.userProfile);

    // Check cache first
    const cached = getCachedVendorProducts(vendorId);
    if (cached) {
      return NextResponse.json(cached, { status: 200 });
    }

    // Get pagination params
    const { searchParams } = new URL(req.url);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
    const cursor = searchParams.get('cursor') || undefined;
    const status = searchParams.get('status') as any;

    // Build query constraints
    const constraints = [
      { field: 'vendorId', operator: '==' as const, value: vendorId },
    ];

    if (status && ['draft', 'pending_approval', 'active', 'rejected'].includes(status)) {
      constraints.push({ field: 'status', operator: '==' as const, value: status });
    }

    // Paginate products
    const result = await paginateQuery(
      'products',
      constraints,
      'createdAt',
      'desc',
      { pageSize, cursor }
    );

    // Cache the result
    if (result.items.length > 0) {
      await cacheVendorProducts(vendorId, result.items);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const { response } = formatApiError(error);
    return response;
  }
}

async function createProductHandler(req: AuthenticatedRequest) {
  try {
    requireVendor(authenticatedUser || req.userProfile);
    const vendorId = getVendorIdFromUser(req.userProfile);
    const body = await req.json();

    // Ensure vendor ID in product matches authenticated vendor
    if (body.vendorId && body.vendorId !== vendorId) {
      throw createApiError(
        ErrorCodes.AUTHORIZATION_ERROR,
        'Cannot create products for other vendors',
        403
      );
    }

    // Create product with validated data
    const productData = {
      ...body,
      vendorId,
      status: 'draft', // Default to draft, needs admin approval
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const productRef = await db.collection('products').add(productData);

    return NextResponse.json(
      { id: productRef.id, ...productData },
      { status: 201 }
    );
  } catch (error) {
    const { response } = formatApiError(error);
    return response;
  }
}

export const GET = withAuth(getVendorProductsHandler, ['vendor', 'admin']);
export const POST = withAuth(createProductHandler, ['vendor', 'admin']);
