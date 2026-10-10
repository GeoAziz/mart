import { NextResponse } from 'next/server';
import { getProductBrands } from '@/lib/products-catalog-service';
import { withRequestMetrics } from '@/lib/api-metrics';

export const revalidate = 300; // ISR: revalidate every 5 minutes

/**
 * GET /api/brands - Get all product brands with counts
 * Cached response to improve performance
 */
async function getBrandsHandler() {
  try {
    const brands = await getProductBrands();

    return NextResponse.json(
      {
        brands,
        total: brands.length,
        cached: true,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { message: 'Error fetching brands' },
      { status: 500 }
    );
  }
}

export const GET = withRequestMetrics(getBrandsHandler);
