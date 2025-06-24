
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Mail, Lock, Loader2 } from 'lucide-react'; // Added Loader2
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext'; // Updated import
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { logIn, loading: authLoading } = useAuth(); // Use logIn from context
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await logIn(email, password);
      // Redirection is handled by AuthContext's logIn on success
    } catch (error) {
      // Error handling is done in AuthContext
      console.error("Login Page Submit Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline text-glow-accent flex items-center justify-center">
          <LogIn className="mr-3 h-6 w-6 text-accent" /> Welcome Back to ZilaCart
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter your credentials to access your account.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 bg-input border-primary focus:ring-accent"
                disabled={isLoading || authLoading}
                />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                </Link>
            </div>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 bg-input border-primary focus:ring-accent"
                disabled={isLoading || authLoading}
                />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary" disabled={isLoading || authLoading}>
            {isLoading || authLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
            {isLoading || authLoading ? 'Logging In...' : 'Login'}
          </Button>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link href="/auth/register" className="font-medium text-accent hover:underline">
              Register here
            </Link>
          </div>
        </CardFooter>
      </form>
    </>
  );
}
