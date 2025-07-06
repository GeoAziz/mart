'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker'
import { Download, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface Transaction {
  id: string
  date: Date
  type: 'sale' | 'refund' | 'payout' | 'commission' | 'adjustment'
  orderId?: string
  description: string
  amount: number
  status: 'completed' | 'pending' | 'failed'
  paymentMethod?: string
}

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { currentUser } = useAuth()

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!currentUser) return
      try {
        const token = await currentUser.getIdToken()
        const response = await fetch('/api/vendor/transactions', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await response.json()
        setTransactions(data.transactions)
      } catch (error) {
        console.error('Error fetching transactions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [currentUser])

  const handleDownload = async () => {
    if (!currentUser) return
    try {
      const token = await currentUser.getIdToken()
      const response = await fetch('/api/vendor/transactions/download', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'transactions.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (error) {
      console.error('Error downloading transactions:', error)
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

    const matchesType = typeFilter === 'all' || transaction.type === typeFilter
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'pending':
        return 'text-yellow-600'
      case 'failed':
        return 'text-red-600'
      default:
        return 'text-muted-foreground'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return '💰'
      case 'refund':
        return '↩️'
      case 'payout':
        return '💸'
      case 'commission':
        return '💼'
      case 'adjustment':
        return '⚖️'
      default:
        return '📝'
    }
  }

  if (isLoading) {
    return <div>Loading transactions...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="sale">Sales</SelectItem>
              <SelectItem value="refund">Refunds</SelectItem>
              <SelectItem value="payout">Payouts</SelectItem>
              <SelectItem value="commission">Commissions</SelectItem>
              <SelectItem value="adjustment">Adjustments</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <CalendarDateRangePicker />
        <Button variant="outline" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span title={transaction.type}>
                      {getTypeIcon(transaction.type)} {transaction.type}
                    </span>
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>{transaction.orderId || '-'}</TableCell>
                  <TableCell>{transaction.paymentMethod || '-'}</TableCell>
                  <TableCell className="text-right">
                    <span className={transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                      KSh {Math.abs(transaction.amount).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={getStatusColor(transaction.status)}>
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
