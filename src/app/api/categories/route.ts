
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { z } from 'zod';
import type { Timestamp } from 'firebase-admin/firestore';
import type { Category } from '@/lib/types';

const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters."),
  description: z.string().optional(),
});

function mapCategoryDocument(doc: FirebaseFirestore.DocumentSnapshot): Category {
  const data = doc.data() as Omit<Category, 'id'>;
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
  };
}

// GET all categories
export async function GET(req: NextRequest) {
  try {
    const snapshot = await firestoreAdmin.collection('categories').orderBy('name', 'asc').get();
    const categories = snapshot.docs.map(mapCategoryDocument);
    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ message: 'Internal Server Error while fetching categories.' }, { status: 500 });
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
