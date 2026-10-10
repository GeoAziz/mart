'use client';

import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import Link from 'next/link';

const SupportButton = () => {
  return (
    <Button
      asChild
      variant="default"
      size="icon"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-accent focus:ring-accent transition-all duration-300"
      aria-label="Contact Support"
    >
      <Link href="mailto:support@zilacart.com">
        <Mail className="h-7 w-7 text-primary-foreground" />
      </Link>
    </Button>
  );
};

export default SupportButton;

