
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firebaseAdminAuth, storageAdmin } from '@/lib/firebase-admin'; // Use storageAdmin
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { v4 as uuidv4 } from 'uuid';

async function uploadImageHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  try {
    const body = await req.json();
    const imageDataUri = body.imageDataUri as string; // e.g., "data:image/jpeg;base64,..."
    const originalFilename = body.filename as string || 'image.jpg'; // Optional client-provided filename

    if (!imageDataUri || !imageDataUri.startsWith('data:image')) {
      return NextResponse.json({ message: 'Invalid image data URI format.' }, { status: 400 });
    }

    const [header, base64Data] = imageDataUri.split(';base64,');
    if (!base64Data) {
        return NextResponse.json({ message: 'Malformed image data URI.' }, { status: 400 });
    }
    
    const mimeType = header.split(':')[1]; // e.g., "image/jpeg"
    if (!mimeType || !mimeType.startsWith('image/')) {
        return NextResponse.json({ message: 'Invalid image MIME type.' }, { status: 400 });
    }
    
    const fileExtension = mimeType.split('/')[1] || 'bin'; // e.g., "jpeg"
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    // Path structure: products/{vendorId}/{unique_filename}
    // Or products/{userId_if_admin_or_general}/{unique_filename}
    const filePath = `products/${authenticatedUser.uid}/${uniqueFilename}`;

    const bucket = storageAdmin.bucket(); // Get default bucket
    const file = bucket.file(filePath);

    await file.save(imageBuffer, {
      metadata: {
        contentType: mimeType,
        // You can add custom metadata if needed, e.g., uploaderId: authenticatedUser.uid
      },
      public: true, // Make the file publicly readable
    });

    // Get public URL
    // The public URL format for Cloud Storage for Firebase is:
    // https://storage.googleapis.com/[BUCKET_NAME]/[OBJECT_PATH]
    // Or for Firebase Hosting mapped storage:
    // https://firebasestorage.googleapis.com/v0/b/[BUCKET_NAME]/o/[OBJECT_PATH_URL_ENCODED]?alt=media
    // Making it public via `file.save({ public: true })` and constructing URL is simpler.
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    return NextResponse.json({ imageUrl: publicUrl }, { status: 200 });

  } catch (error: any) {
    console.error('Error uploading image:', error);
    if (error.type === 'entity.parse.failed' || error.message.includes('JSON')) {
      return NextResponse.json({ message: 'Invalid JSON payload for image upload.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error while uploading image.' }, { status: 500 });
  }
}

// Protect this route for vendors and admins
export const POST = withAuth(uploadImageHandler, ['vendor', 'admin']);
