import { Metadata } from 'next'
import VendorPageShell from '@/components/vendor/VendorPageShell'
import TransactionHistory from '@/components/vendor/financial/TransactionHistory'

export const metadata: Metadata = {
  title: 'Transactions',
  description: 'View your transaction history',
}

export default function TransactionsPage() {
  return (
    <VendorPageShell>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
        </div>
        <TransactionHistory />
      </div>
    </VendorPageShell>
  )
}
