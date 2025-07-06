import { Metadata } from 'next'
import StoreAnalyticsDashboard from '@/components/analytics/StoreAnalyticsDashboard'
import VendorPageShell from '@/components/vendor/VendorPageShell'

export const metadata: Metadata = {
  title: 'Store Analytics',
  description: 'View your store performance metrics and insights',
}

export default function StoreAnalyticsPage() {
  return (
    <VendorPageShell>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Store Analytics</h2>
        </div>
        <StoreAnalyticsDashboard />
      </div>
    </VendorPageShell>
  )
}
