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
  Percent 
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

export default function FinancialReports() {
  const [stats, setStats] = useState<FinancialStats | null>(null)
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { currentUser } = useAuth()

  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!currentUser) return
      try {
        const token = await currentUser.getIdToken()
        
        // Fetch financial stats
        const statsResponse = await fetch('/api/vendor/financial/stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const statsData = await statsResponse.json()
        setStats(statsData)

        // Fetch ledger entries
        const ledgerResponse = await fetch('/api/vendor/financial/ledger', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const ledgerData = await ledgerResponse.json()
        setLedgerEntries(ledgerData.entries)
      } catch (error) {
        console.error('Error fetching financial data:', error)
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

  if (isLoading || !stats) {
    return <div>Loading financial data...</div>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {stats.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +{stats.revenueGrowth}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {stats.netEarnings.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              After platform fees and commissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {stats.totalCommissions.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total commissions paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {stats.averageOrderValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Per order average
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Revenue Overview</TabsTrigger>
          <TabsTrigger value="ledger">Ledger Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <Overview data={stats.monthlyData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle>Ledger Entries</CardTitle>
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
                  {ledgerEntries.map((entry) => (
                    <TableRow key={entry.description + entry.createdAt.toString()}>
                      <TableCell>
                        {entry.createdAt instanceof Date 
                          ? entry.createdAt.toLocaleDateString()
                          : new Date(entry.createdAt.seconds * 1000).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className={
                          entry.type.includes('credit') 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }>
                          {entry.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="text-right">
                        KSh {entry.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        KSh {entry.netAmount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
