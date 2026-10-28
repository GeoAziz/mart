'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, Suspense } from 'react';

interface GoogleAnalyticsProps {
  measurementId?: string;
}

function PageViewTracker({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  // Track Next.js App Router SPA page transitions
  useEffect(() => {
    if (!gaId || typeof window === 'undefined') return;

    // Skip the first client render to avoid duplicate page_view with gtag('config')
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_location: window.location.href,
        page_path: url,
        page_title: document.title,
      });
    }
  }, [pathname, searchParams, gaId]);

  return null;
}

export default function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const gaId =
    measurementId ||
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

  if (!gaId) return null;

  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker gaId={gaId} />
      </Suspense>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
              send_page_view: true
            });
          `,
        }}
      />
    </>
  );
}



