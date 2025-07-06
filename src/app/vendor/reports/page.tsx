import { Metadata } from 'next'
import VendorPageShell from '@/components/vendor/VendorPageShell'
import FinancialReports from '@/components/vendor/financial/FinancialReports'

export const metadata: Metadata = {
  title: 'Financial Reports',
  description: 'View and download your financial reports',
}

export default function FinancialReportsPage() {
  return (
    <VendorPageShell>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Financial Reports</h2>
        </div>
        <FinancialReports />
      </div>
    </VendorPageShell>
  )
}
