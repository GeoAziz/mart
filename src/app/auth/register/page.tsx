
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, User, Mail, Lock, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext'; // Updated import
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { signUp, loading: authLoading } = useAuth(); // Use signUp from context
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      // Toast is handled by AuthContext now, but good to have client-side check
      alert('Passwords do not match.'); // Simple alert for now
      return;
    }
    setIsLoading(true);
    try {
      await signUp(email, password, fullName);
      // Redirection is handled by AuthContext's signUp on success
    } catch (error) {
      // Error handling is done in AuthContext
      console.error("Registration Page Submit Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline text-glow-accent flex items-center justify-center">
          <UserPlus className="mr-3 h-6 w-6 text-accent" /> Create Your ZilaCart Account
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Join the future of Kenyan e-commerce.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                id="fullName"
                placeholder="e.g., Aisha Wanjiru"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="pl-10 bg-input border-primary focus:ring-accent"
                disabled={isLoading || authLoading}
                />
            </div>
          </div>
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
            <Label htmlFor="password">Password</Label>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                id="password"
                type="password"
                placeholder="Choose a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="pl-10 bg-input border-primary focus:ring-accent"
                disabled={isLoading || authLoading}
                />
            </div>
             <p className="text-xs text-muted-foreground">Must be at least 8 characters.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
             <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pl-10 bg-input border-primary focus:ring-accent"
                disabled={isLoading || authLoading}
                />
            </div>
             {password && confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match.</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary" disabled={isLoading || authLoading}>
            {isLoading || authLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
            {isLoading || authLoading ? 'Registering...' : 'Register'}
          </Button>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/auth/login" className="font-medium text-accent hover:underline">
              Login here
            </Link>
          </div>
        </CardFooter>
      </form>
    </>
  );
}
