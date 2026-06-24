
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { z } from 'zod';
import type { Timestamp } from 'firebase-admin/firestore';
import { toDate } from '@/lib/date';
import type { Category } from '@/lib/types';
import { cacheAside } from '@/lib/cache-service';
import { getProductCategories, invalidateCategoryCache } from '@/lib/products-catalog-service';

export const revalidate = 300; // ISR: revalidate every 5 minutes

const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters."),
  description: z.string().optional(),
});

function mapCategoryDocument(doc: FirebaseFirestore.DocumentSnapshot): Category {
  const data = doc.data() as Omit<Category, 'id'>;
  return {
    id: doc.id,
    ...data,
    createdAt: toDate(data.createdAt) ?? new Date(data.createdAt || Date.now()),
    updatedAt: toDate(data.updatedAt) ?? new Date(data.updatedAt || Date.now()),
  };
}

// GET all categories with caching
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeCount = searchParams.get('includeCount') === 'true';

    // If count requested, use product-based categories (faster)
    if (includeCount) {
      const categories = await getProductCategories();
      return NextResponse.json(
        { categories, total: categories.length, cached: true },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
          },
        }
      );
    }

    // Otherwise, fetch full category documents with caching
    const categories = await cacheAside(
      'categories:all',
      async () => {
        const snapshot = await firestoreAdmin.collection('categories').orderBy('name', 'asc').get();
        return snapshot.docs.map(mapCategoryDocument);
      },
      3600 // 1 hour TTL
    );

    return NextResponse.json(categories || [], {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { message: 'Internal Server Error while fetching categories.' },
      { status: 500 }
    );
  }
}

// POST: Create a new category (admin only)
async function createCategoryHandler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const validationResult = categorySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ message: 'Validation failed', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, description } = validationResult.data;
    const now = new Date();

    const categoryData: Omit<Category, 'id'> = {
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await firestoreAdmin.collection('categories').add(categoryData);
    const createdCategory = { id: docRef.id, ...categoryData };
    
    // Ensure dates are Date objects for client response
    const clientResponse = {
        ...createdCategory,
        createdAt: new Date(createdCategory.createdAt),
        updatedAt: new Date(createdCategory.updatedAt),
    };

    return NextResponse.json(clientResponse, { status: 201 });

  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error.type === 'entity.parse.failed' || error.name === 'SyntaxError') {
      return NextResponse.json({ message: 'Invalid JSON payload.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error while creating category.' }, { status: 500 });
  }
}

export const POST = withAuth(createCategoryHandler, 'admin');
