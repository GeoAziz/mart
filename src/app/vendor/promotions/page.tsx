import { Metadata } from 'next'
import VendorPageShell from '@/components/vendor/VendorPageShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Promotions',
  description: 'Manage your store promotions and discounts',
}

export default function PromotionsPage() {
  return (
    <VendorPageShell>
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Promotions & Discounts</h2>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Promotion
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Active Promotions</CardTitle>
            <CardDescription>You currently have no active promotions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Click "Create Promotion" to generate a discount code for your customers.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </VendorPageShell>
  )
}

