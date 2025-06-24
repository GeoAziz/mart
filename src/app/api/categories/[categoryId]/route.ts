
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { z } from 'zod';
import type { Category } from '@/lib/types';

const categoryUpdateSchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters.").optional(),
  description: z.string().optional(),
}).partial().refine(obj => Object.keys(obj).length > 0, "At least one field must be provided for update.");

// PUT: Update a category (admin only)
async function updateCategoryHandler(req: AuthenticatedRequest, context: { params: { categoryId: string } }) {
  const { categoryId } = context.params;
  if (!categoryId) {
    return NextResponse.json({ message: 'Category ID is missing.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validationResult = categoryUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ message: 'Validation failed', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const dataToUpdate = {
        ...validationResult.data,
        updatedAt: new Date(),
    };

    const docRef = firestoreAdmin.collection('categories').doc(categoryId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        return NextResponse.json({ message: 'Category not found.' }, { status: 404 });
    }

    await docRef.update(dataToUpdate);

    return NextResponse.json({ message: 'Category updated successfully.' }, { status: 200 });
  } catch (error: any) {
    console.error(`Error updating category ${categoryId}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while updating category.' }, { status: 500 });
  }
}

export const PUT = withAuth(updateCategoryHandler, 'admin');

// DELETE: Delete a category (admin only)
async function deleteCategoryHandler(req: AuthenticatedRequest, context: { params: { categoryId: string } }) {
  const { categoryId } = context.params;
  if (!categoryId) {
    return NextResponse.json({ message: 'Category ID is missing.' }, { status: 400 });
  }
  // TODO: Before deleting, check if any products are using this category.
  // If so, either block the deletion or reassign products to a default category.
  // For now, we will proceed with a simple delete.

  try {
    const docRef = firestoreAdmin.collection('categories').doc(categoryId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        return NextResponse.json({ message: 'Category not found.' }, { status: 404 });
    }
    await docRef.delete();
    return NextResponse.json({ message: 'Category deleted successfully.' }, { status: 200 });
  } catch (error: any) {
    console.error(`Error deleting category ${categoryId}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while deleting category.' }, { status: 500 });
  }
}
export const DELETE = withAuth(deleteCategoryHandler, 'admin');

// GET: Get a single category
export async function GET(req: NextRequest, context: { params: { categoryId: string } }) {
    const { categoryId } = context.params;
     if (!categoryId) {
        return NextResponse.json({ message: 'Category ID is missing.' }, { status: 400 });
    }
    try {
        const docRef = firestoreAdmin.collection('categories').doc(categoryId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return NextResponse.json({ message: 'Category not found.' }, { status: 404 });
        }
        return NextResponse.json(docSnap.data(), { status: 200 });
    } catch (error) {
        console.error(`Error fetching category ${categoryId}:`, error);
        return NextResponse.json({ message: 'Internal Server Error while fetching category.' }, { status: 500 });
    }
}
