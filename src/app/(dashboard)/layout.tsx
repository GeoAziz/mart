import React from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Dashboard-specific pages (admin/vendor/account) will render their own sidebars
  // This layout intentionally does not render the public Header/Footer.
  return <>{children}</>;
}
