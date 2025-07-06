import { Metadata } from 'next'
import VendorPageShell from '@/components/vendor/VendorPageShell'
import SupportCenter from '@/components/vendor/support/SupportCenter'

export const metadata: Metadata = {
  title: 'Vendor Support Center',
  description: 'Get help and support for your vendor account',
}

export default function VendorSupportPage() {
  return (
    <VendorPageShell>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Support Center</h2>
        </div>
        <SupportCenter />
      </div>
    </VendorPageShell>
  )
}
