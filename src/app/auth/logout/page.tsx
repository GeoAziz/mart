
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function LogoutPage() {
  const { logOut, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      await logOut();
      // Redirection is now handled within the logOut function in AuthContext
      // router.push('/'); // Fallback if not handled, but should be
    };
    performLogout();
  }, [logOut, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <h1 className="text-2xl font-semibold text-glow-accent">Logging Out...</h1>
      <p className="text-muted-foreground">Please wait while we securely log you out.</p>
    </div>
  );
}
