
import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest, type Role } from '@/lib/authMiddleware';

// Basic authenticated handler (any authenticated user can access)
async function getHandler(req: AuthenticatedRequest) {
  return NextResponse.json({ 
    message: `Hello, ${req.userProfile.fullName || req.user.email}! Your role is ${req.userProfile.role}. This is a protected GET route.`,
    uid: req.user.uid,
    userProfile: req.userProfile
  });
}

// Handler restricted to 'admin' role
async function postHandler(req: AuthenticatedRequest) {
  // Example: an admin might create a new global setting
  const body = await req.json();
  return NextResponse.json({ 
    message: `Admin ${req.userProfile.fullName || req.user.email} performed an action.`,
    receivedBody: body,
    userProfile: req.userProfile 
  });
}

// Handler restricted to 'vendor' or 'admin' roles
async function putHandler(req: AuthenticatedRequest) {
  return NextResponse.json({
    message: `User ${req.userProfile.fullName} with role ${req.userProfile.role} accessed this VENDOR or ADMIN route.`,
    userProfile: req.userProfile
  });
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler, 'admin'); // Only 'admin' can access
export const PUT = withAuth(putHandler, ['vendor', 'admin']); // 'vendor' or 'admin' can access
