
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { sendPasswordReset, loading: authLoading } = useAuth(); // Use sendPasswordReset from context

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await sendPasswordReset(email);
      // Toast notification is handled by AuthContext
    } catch (error) {
      // Error handling is done in AuthContext
      console.error("Forgot Password Page Submit Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline text-glow-accent flex items-center justify-center">
          <Send className="mr-3 h-6 w-6 text-accent" /> Reset Your Password
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password.
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
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary" disabled={isLoading || authLoading}>
            {isLoading || authLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
            {isLoading || authLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
          <div className="text-center text-sm">
            <Link href="/auth/login" className="font-medium text-accent hover:underline flex items-center justify-center">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to Login
            </Link>
          </div>
        </CardFooter>
      </form>
    </>
  );
}
