import { Metadata } from 'next'
import VendorPageShell from '@/components/vendor/VendorPageShell'
import MessagingCenter from '@/components/vendor/messaging/MessagingCenter'

export const metadata: Metadata = {
  title: 'Vendor Messages',
  description: 'Manage your customer communications',
}

export default function VendorMessagingPage() {
  return (
    <VendorPageShell>
      <div className="flex-1 p-4 md:p-8 pt-6">
        <MessagingCenter />
      </div>
    </VendorPageShell>
  )
}
