import React from 'react';
import Link from 'next/link';

type Crumb = { label: string; href?: string };

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center text-sm text-muted-foreground space-x-2">
        {items.map((it, idx) => (
          <li key={idx} className="flex items-center">
            {it.href ? (
              <Link href={it.href} className={idx === items.length - 1 ? 'font-medium text-foreground' : 'hover:underline'} aria-current={idx === items.length - 1 ? 'page' : undefined}>
                {it.label}
              </Link>
            ) : (
              <span className={idx === items.length - 1 ? 'font-medium text-foreground' : ''}>{it.label}</span>
            )}
            {idx < items.length - 1 && <span className="mx-2 text-muted-foreground">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export { Breadcrumb };
