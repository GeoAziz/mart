'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Overview } from './Overview'
import RecentSales from './RecentSales'
import { CalendarDateRangePicker } from '../ui/date-range-picker'
import { Button } from '@/components/ui/button'
import { Download, Users, CreditCard, Activity } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'

interface StoreAnalytics {
  salesPerformance: Array<{
    date: string;
    revenue: number;
    units: number;
  }>;
  inventoryTurnover: Array<{
    productId: string;
    name: string;
    turnoverRate: number;
    daysInStock: number;
  }>;
  categoryPerformance: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
  popularityMetrics: Array<{
    productId: string;
    name: string;
    views: number;
    conversionRate: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    revenue: number;
    units: number;
  }>;
}

export default function StoreAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<StoreAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { currentUser } = useAuth()

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!currentUser) return
      try {
        const token = await currentUser.getIdToken()
        const response = await fetch('/api/vendor/me/products/analytics', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        if (!response.ok) throw new Error('Failed to fetch analytics')
        const data = await response.json()
        setAnalytics(data)
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [currentUser])

  if (isLoading) {
    return <div>Loading analytics...</div>
  }

  if (!analytics) {
    return <div>Failed to load analytics</div>
  }

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2">
          <CalendarDateRangePicker />
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Detailed Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  KSh {analytics.salesPerformance.reduce((sum, day) => sum + day.revenue, 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  From all sales
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Units Sold</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.salesPerformance.reduce((sum, day) => sum + day.units, 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all products
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Views</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(analytics.popularityMetrics.reduce((sum, product) => sum + product.views, 0) / analytics.popularityMetrics.length).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per product
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Conversion Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(analytics.popularityMetrics.reduce((sum, product) => sum + product.conversionRate, 0) / analytics.popularityMetrics.length).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Views to sales
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Sales Performance</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview data={analytics.salesPerformance.map(day => ({ 
                  date: day.date,
                  revenue: day.revenue
                }))} />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
              </CardHeader>
              <CardContent>
                <RecentSales products={analytics.topProducts.map(product => ({
                  name: product.name,
                  sales: product.units
                }))} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
            <CalendarDateRangePicker />
          </div>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.categoryPerformance.map((category) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <span>{category.category}</span>
                      <div className="text-right">
                        <div>KSh {category.revenue.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{category.percentage.toFixed(1)}% of total</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Turnover</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.inventoryTurnover.map((product) => (
                    <div key={product.productId} className="flex items-center justify-between">
                      <span>{product.name}</span>
                      <div className="text-right">
                        <div>{product.turnoverRate.toFixed(2)}x turnover</div>
                        <div className="text-sm text-muted-foreground">{product.daysInStock} days in stock</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Popularity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.popularityMetrics.map((product) => (
                    <div key={product.productId} className="flex items-center justify-between">
                      <span>{product.name}</span>
                      <div className="text-right">
                        <div>{product.views.toLocaleString()} views</div>
                        <div className="text-sm text-muted-foreground">{product.conversionRate.toFixed(1)}% conversion</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}
