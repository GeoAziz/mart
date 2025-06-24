
import Logo from '@/components/layout/Logo';
import { Card } from '@/components/ui/card';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="mb-8">
        <Logo />
      </div>
      <Card className="w-full max-w-md bg-card border-primary shadow-2xl glow-edge-primary">
        {children}
      </Card>
       <p className="mt-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} ZilaCart. Secure & Futuristic.
      </p>
    </div>
  );
}
