'use client';

import { PropsWithChildren } from 'react';

interface VendorPageShellProps extends PropsWithChildren {
  title?: string;
}

export default function VendorPageShell({ children, title }: VendorPageShellProps) {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {title && <h1 className="text-3xl font-bold tracking-tight">{title}</h1>}
      {children}
    </div>
  );
}
