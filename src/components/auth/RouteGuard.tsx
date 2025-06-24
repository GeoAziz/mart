'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles: ('customer' | 'vendor' | 'admin')[];
}

const RouteGuard: React.FC<RouteGuardProps> = ({ children, allowedRoles }) => {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until authentication is fully resolved
    if (authLoading) {
      return; 
    }

    // If not loading and there's no user profile, redirect to login
    if (!userProfile) {
      router.replace('/auth/login');
      return;
    }

    // If user's role is not in the allowed list, redirect to a safe page (e.g., home)
    if (!allowedRoles.includes(userProfile.role)) {
      router.replace('/');
      return;
    }
  }, [userProfile, authLoading, allowedRoles, router]);

  // While loading or if user is not yet available or not authorized, show a loading spinner
  // This prevents rendering the protected content before the checks complete
  if (authLoading || !userProfile || !allowedRoles.includes(userProfile.role)) {
    return (
      <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If checks pass, render the protected children
  return <>{children}</>;
};

export default RouteGuard;
