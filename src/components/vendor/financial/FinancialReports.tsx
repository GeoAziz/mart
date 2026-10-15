'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Overview } from '../../analytics/Overview'
import { CalendarDateRangePicker } from '../../ui/date-range-picker'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent,
  Loader2
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { LedgerEntry } from '@/lib/types'

interface FinancialStats {
  totalRevenue: number
  netEarnings: number
  totalCommissions: number
  averageOrderValue: number
  revenueGrowth: number
  monthlyData: {
    date: string
    revenue: number
  }[]
}

const formatKsh = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return '0.00'
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function FinancialReports() {
  const [stats, setStats] = useState<FinancialStats | null>(null)
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { currentUser } = useAuth()

  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!currentUser) {
        setIsLoading(false)
        return
      }
      try {
        const token = await currentUser.getIdToken()
        
        // Fetch financial data (summary and ledger)
        const response = await fetch('/api/vendors/me/financial', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await response.json().catch(() => ({}))
        
        const summary = data?.summary || { totalSales: 0, netEarnings: 0, totalCommissions: 0 }
        
        // Map the API summary to the expected stats format with safe fallbacks
        setStats({
          totalRevenue: Number(summary.totalSales ?? 0),
          netEarnings: Number(summary.netEarnings ?? 0),
          totalCommissions: Number(summary.totalCommissions ?? 0),
          averageOrderValue: Number(summary.averageOrderValue ?? 0),
          revenueGrowth: Number(summary.revenueGrowth ?? 0),
          monthlyData: Array.isArray(summary.monthlyData) ? summary.monthlyData : []
        })

        setLedgerEntries(Array.isArray(data?.transactions) ? data.transactions : [])
      } catch (error) {
        console.error('Error fetching financial data:', error)
        setStats({
          totalRevenue: 0,
          netEarnings: 0,
          totalCommissions: 0,
          averageOrderValue: 0,
          revenueGrowth: 0,
          monthlyData: []
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchFinancialData()
  }, [currentUser])

  const handleDownloadReport = async (format: 'pdf' | 'csv') => {
    if (!currentUser) return
    try {
      const token = await currentUser.getIdToken()
      const response = await fetch(`/api/vendor/financial/download?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `financial-report.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (error) {
      console.error('Error downloading report:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
        <span>Loading financial data...</span>
      </div>
    )
  }

  const safeStats = stats || {
    totalRevenue: 0,
    netEarnings: 0,
    totalCommissions: 0,
    averageOrderValue: 0,
    revenueGrowth: 0,
    monthlyData: []
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <CalendarDateRangePicker />
        <div className="space-x-2">
          <Button variant="outline" onClick={() => handleDownloadReport('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleDownloadReport('pdf')}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl bg-card/75 backdrop-blur-xl border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {formatKsh(safeStats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              +{safeStats.revenueGrowth || 0}% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-card/75 backdrop-blur-xl border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              KSh {formatKsh(safeStats.netEarnings)}
            </div>
            <p className="text-xs text-muted-foreground">
              After platform fees and commissions
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-card/75 backdrop-blur-xl border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {formatKsh(safeStats.totalCommissions)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total commissions paid
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-card/75 backdrop-blur-xl border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {formatKsh(safeStats.averageOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per order average
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-card/60 border border-border/60 rounded-xl p-1">
          <TabsTrigger value="overview" className="rounded-lg text-xs">Revenue Overview</TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-lg text-xs">Ledger Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="rounded-2xl bg-card/75 backdrop-blur-xl border border-border/80">
            <CardHeader>
              <CardTitle className="text-base">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <Overview data={safeStats.monthlyData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card className="rounded-2xl bg-card/75 backdrop-blur-xl border border-border/80">
            <CardHeader>
              <CardTitle className="text-base">Ledger Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.length > 0 ? (
                    ledgerEntries.map((entry, idx) => (
                      <TableRow key={`ledger-${idx}-${entry.description || ''}`}>
                        <TableCell>
                          {entry.createdAt instanceof Date 
                            ? entry.createdAt.toLocaleDateString()
                            : (entry.createdAt as any)?.seconds 
                              ? new Date((entry.createdAt as any).seconds * 1000).toLocaleDateString()
                              : 'Recent'}
                        </TableCell>
                        <TableCell>
                          <span className={
                            entry.type?.includes('credit') 
                              ? 'text-emerald-400 font-medium' 
                              : 'text-red-400 font-medium'
                          }>
                            {entry.type ? entry.type.replace('_', ' ').toUpperCase() : 'TRANSACTION'}
                          </span>
                        </TableCell>
                        <TableCell>{entry.description || 'Order payment'}</TableCell>
                        <TableCell className="text-right font-medium">
                          KSh {formatKsh(entry.amount)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-400">
                          KSh {formatKsh(entry.netAmount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                        No financial ledger records found yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
