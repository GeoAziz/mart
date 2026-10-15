'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Globe, Eye } from 'lucide-react';
import Link from 'next/link';
import Breadcrumb from '@/components/ui/breadcrumb';

export default function CmsContentPage() {
  const [pages] = useState([
    {
      title: 'About ZilaCart',
      slug: '/about',
      status: 'Published',
      description: 'Company mission, marketplace metrics, vendor ecosystem, and corporate values.',
      lastUpdated: 'Today'
    },
    {
      title: 'Contact Us',
      slug: '/contact',
      status: 'Published',
      description: 'Support phone numbers, Nairobi headquarters, email directory, and inquiry form.',
      lastUpdated: 'Today'
    },
    {
      title: 'Help Center & FAQ',
      slug: '/help',
      status: 'Published',
      description: 'Searchable customer questions across ordering, M-Pesa payments, and delivery.',
      lastUpdated: 'Today'
    },
    {
      title: 'Shipping & Returns Policy',
      slug: '/shipping',
      status: 'Published',
      description: 'Kenyan delivery zones, county timelines, doorstep inspection, and 7-day return guarantee.',
      lastUpdated: 'Today'
    }
  ]);

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: 'Admin', href: '/admin' }, { label: 'CMS', href: '/admin/cms' }, { label: 'Content', href: '/admin/cms/content' }]} />
      
      <Card className="bg-card border-border shadow-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <CardTitle className="text-2xl font-headline text-glow-primary flex items-center gap-2">
                <Globe className="h-6 w-6 text-primary" /> General Content Management (CMS)
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Manage public storefront pages, policy documents, and brand copy.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/overview">Back to Dashboard</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {pages.map((p, idx) => (
              <div 
                key={idx}
                className="p-5 border border-border/70 rounded-xl bg-card hover:bg-muted/40 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-foreground text-base">{p.title}</h3>
                    <Badge variant="outline" className="text-green-400 bg-green-500/10 border-green-500/30 text-xs">
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl">{p.description}</p>
                  <p className="text-[11px] text-muted-foreground/80">Path: <span className="font-mono text-primary">{p.slug}</span> &bull; Updated: {p.lastUpdated}</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button asChild size="sm" variant="outline" className="hover:border-primary">
                    <Link href={p.slug} target="_blank" className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      <span>Preview Live</span>
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
