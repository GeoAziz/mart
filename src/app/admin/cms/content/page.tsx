
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, FileText } from 'lucide-react';
import Link from 'next/link';

export default function CmsContentPage() {
  return (
    <div className="space-y-8">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
            <Edit className="mr-3 h-6 w-6 text-primary" /> General Content Management (CMS)
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            This section is for managing static content pages like "About Us", "Terms of Service", etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
            <FileText className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-xl font-semibold text-muted-foreground">Feature Coming Soon</p>
            <p className="text-sm text-muted-foreground">
                The functionality to edit general site pages will be implemented here.
            </p>
            <Button asChild className="mt-6">
                <Link href="/admin/overview">Back to Dashboard</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
