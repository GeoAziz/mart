
import { NextResponse } from 'next/server';
import { firestoreAdmin, storageAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { NextRequest } from 'next/server';
import type { Product } from '@/lib/types';


// Helper function to delete an image from Firebase Storage
async function deleteImageFromStorage(imageUrl: string | undefined | null) {
  if (!imageUrl || !imageUrl.startsWith('https://storage.googleapis.com/')) {
    return;
  }

  try {
    const bucketNameWithHost = imageUrl.split('https://storage.googleapis.com/')[1];
    if (!bucketNameWithHost) {
      return;
    }
    
    const firstSlashIndex = bucketNameWithHost.indexOf('/');
    if (firstSlashIndex === -1) {
        return;
    }

    const filePath = bucketNameWithHost.substring(firstSlashIndex + 1);
    const decodedFilePath = decodeURIComponent(filePath);
    const bucket = storageAdmin.bucket();
    const file = bucket.file(decodedFilePath);
    
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
    }
  } catch (error) {
    console.error(`Failed to delete image ${imageUrl} from storage:`, error);
  }
}


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const productId = params.id;
  try {
    const productDoc = await firestoreAdmin.collection('products').doc(productId).get();

    if (!productDoc.exists) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    const data = productDoc.data();
    if (!data) {
        return NextResponse.json({ message: 'Product data is missing' }, { status: 404 });
    }

    const product: Product = {
      id: productDoc.id,
      name: data.name || 'Unnamed Product',
      description: data.description || '',
      price: data.price || 0,
      category: data.category || 'Uncategorized',
      stock: data.stock === undefined ? 0 : data.stock,
      imageUrl: data.imageUrl || 'https://placehold.co/400x300/cccccc/E0E0E0?text=No+Image',
      additionalImageUrls: data.additionalImageUrls || [],
      brand: data.brand || 'Unknown Brand',
      dateAdded: data.dateAdded?.toDate ? data.dateAdded.toDate() : new Date(data.dateAdded || Date.now()),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
      dataAiHint: data.dataAiHint || data.category?.toLowerCase().split(' ')[0] || "product",
      vendorId: data.vendorId,
      status: data.status || 'pending_approval',
      sku: data.sku || '',
      rating: data.rating
    };
    return NextResponse.json(product);

  } catch (error) {
    console.error(`Error fetching product ${productId} from Firestore:`, error);
    return NextResponse.json({ message: 'Error fetching product' }, { status: 500 });
  }
}

async function updateProductHandler(
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
  const productId = params.id;
  const authenticatedUser = req.userProfile;

  try {
    const productDocRef = firestoreAdmin.collection('products').doc(productId);
    const productDocSnap = await productDocRef.get();

    if (!productDocSnap.exists) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    const existingProductData = productDocSnap.data() as Product;
    const updatedDataFromRequest = await req.json();
    
    if (Object.keys(updatedDataFromRequest).length === 0) {
        return NextResponse.json({ message: 'No update data provided' }, { status: 400 });
    }

    // Authorization checks
    if (authenticatedUser.role === 'vendor') {
      if (existingProductData.vendorId !== authenticatedUser.uid) {
        return NextResponse.json({ message: 'Forbidden: You do not own this product.' }, { status: 403 });
      }
      if (updatedDataFromRequest.vendorId && updatedDataFromRequest.vendorId !== authenticatedUser.uid) {
        delete updatedDataFromRequest.vendorId; 
      }
      if (updatedDataFromRequest.status && updatedDataFromRequest.status !== existingProductData.status) {
        if (!((existingProductData.status === 'draft' || existingProductData.status === 'rejected') && ['draft', 'pending_approval'].includes(updatedDataFromRequest.status))) {
            delete updatedDataFromRequest.status;
        }
      }
    } else if (authenticatedUser.role === 'admin') {
      if (updatedDataFromRequest.status && !['pending_approval', 'active', 'rejected', 'draft'].includes(updatedDataFromRequest.status)) {
        return NextResponse.json({ message: 'Invalid product status value.' }, { status: 400 });
      }
    } else {
        return NextResponse.json({ message: 'Forbidden: Insufficient permissions.' }, { status: 403 });
    }

    const dataToUpdate: Partial<Product> = { ...updatedDataFromRequest };
    if (dataToUpdate.price !== undefined) {
        dataToUpdate.price = parseFloat(String(dataToUpdate.price));
        if (isNaN(dataToUpdate.price)) return NextResponse.json({ message: 'Invalid price format' }, { status: 400 });
    }
    if (dataToUpdate.stock !== undefined) {
        dataToUpdate.stock = parseInt(String(dataToUpdate.stock), 10);
        if (isNaN(dataToUpdate.stock)) return NextResponse.json({ message: 'Invalid stock format' }, { status: 400 });
    }
    if (dataToUpdate.additionalImageUrls !== undefined && !Array.isArray(dataToUpdate.additionalImageUrls)) {
        return NextResponse.json({ message: 'additionalImageUrls must be an array.' }, { status: 400 });
    }
    
    dataToUpdate.updatedAt = new Date();

    const existingImageUrls = [existingProductData.imageUrl, ...(existingProductData.additionalImageUrls || [])].filter(Boolean) as string[];
    const newImageUrls = [dataToUpdate.imageUrl, ...(dataToUpdate.additionalImageUrls || [])].filter(Boolean) as string[];
    
    const urlsToDelete = existingImageUrls.filter(url => !newImageUrls.includes(url));
    for (const url of urlsToDelete) {
      await deleteImageFromStorage(url);
    }
        
    await productDocRef.set(dataToUpdate, { merge: true });
    
    const updatedDoc = await productDocRef.get();
    if (!updatedDoc.exists) return NextResponse.json({ message: 'Product not found after update' }, { status: 404 });

    const finalData = updatedDoc.data()!; 
     const productResponse: Product = {
      id: updatedDoc.id,
      name: finalData.name,
      description: finalData.description,
      price: finalData.price,
      category: finalData.category,
      stock: finalData.stock,
      imageUrl: finalData.imageUrl,
      additionalImageUrls: finalData.additionalImageUrls,
      brand: finalData.brand,
      dateAdded: finalData.dateAdded?.toDate(),
      updatedAt: finalData.updatedAt?.toDate(),
      dataAiHint: finalData.dataAiHint,
      vendorId: finalData.vendorId,
      status: finalData.status,
      sku: finalData.sku,
      rating: finalData.rating,
    };
    return NextResponse.json(productResponse);

  } catch (error) {
    console.error(`Error updating product ${productId} in Firestore:`, error);
    if (error instanceof Error && error.message.includes('JSON')) return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    return NextResponse.json({ message: 'Error updating product' }, { status: 500 });
  }
}
export const PUT = withAuth(updateProductHandler, ['vendor', 'admin']);


async function deleteProductHandler(
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
  const productId = params.id;
  const authenticatedUser = req.userProfile;
  try {
    const productDocRef = firestoreAdmin.collection('products').doc(productId);
    const productDocSnap = await productDocRef.get();

    if (!productDocSnap.exists) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    const productData = productDocSnap.data() as Product;

    if (authenticatedUser.role === 'vendor' && productData.vendorId !== authenticatedUser.uid) {
      return NextResponse.json({ message: 'Forbidden: You do not own this product.' }, { status: 403 });
    }

    const imagesToDelete = [productData.imageUrl, ...(productData.additionalImageUrls || [])];
    for (const imageUrl of imagesToDelete) {
      await deleteImageFromStorage(imageUrl);
    }

    await productDocRef.delete();
    return NextResponse.json({ message: 'Product deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Error deleting product ${productId}:`, error);
    return NextResponse.json({ message: 'Error deleting product' }, { status: 500 });
  }
}
export const DELETE = withAuth(deleteProductHandler, ['vendor', 'admin']);

