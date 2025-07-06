'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LineChart, BarChart } from '@tremor/react';
import { TrendingUp, Award, History, Target } from 'lucide-react';
import type { PerformanceBenchmarks } from '@/lib/types';

interface PerformanceBenchmarksPanelProps {
  benchmarks: PerformanceBenchmarks;
}

export function PerformanceBenchmarksPanel({ benchmarks }: PerformanceBenchmarksPanelProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Performance Benchmarks</CardTitle>
            <CardDescription>Compare your performance against industry standards</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="industry">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="industry">Industry</TabsTrigger>
            <TabsTrigger value="competitive">Competition</TabsTrigger>
            <TabsTrigger value="historical">Historical</TabsTrigger>
          </TabsList>

          <TabsContent value="industry" className="space-y-4 mt-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    ${benchmarks.industry.averageRevenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Top Performers: ${benchmarks.industry.topPerformerThresholds.revenue.toLocaleString()}+
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Average Order Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    ${benchmarks.industry.averageOrderValue.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Top Performers: ${benchmarks.industry.topPerformerThresholds.orderValue.toLocaleString()}+
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Conversion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {(benchmarks.industry.averageConversionRate * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Top Performers: {(benchmarks.industry.topPerformerThresholds.conversionRate * 100).toFixed(1)}%+
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="competitive" className="space-y-4 mt-4">
            <Alert>
              <AlertTitle className="font-semibold">Market Position</AlertTitle>
              <AlertDescription>{benchmarks.competitive.marketPosition}</AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {benchmarks.competitive.strengthAreas.map((strength, index) => (
                      <Badge key={index} variant="default">{strength}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Areas for Improvement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {benchmarks.competitive.improvementAreas.map((area, index) => (
                      <Badge key={index} variant="secondary">{area}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {benchmarks.competitive.opportunities.map((opportunity, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Target className="h-4 w-4 mt-1" />
                        {opportunity}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="historical" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Year-over-Year Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Revenue Growth</div>
                    <div className="text-2xl font-bold">
                      {(benchmarks.historical.yearOverYear.revenueGrowth * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Order Growth</div>
                    <div className="text-2xl font-bold">
                      {(benchmarks.historical.yearOverYear.orderGrowth * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Customer Growth</div>
                    <div className="text-2xl font-bold">
                      {(benchmarks.historical.yearOverYear.customerGrowth * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Best Performing Periods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {benchmarks.historical.bestPeriods.map((period, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{period.period}</h4>
                          <div className="text-sm text-muted-foreground mt-1">
                            ${period.revenue.toLocaleString()} revenue | {period.orders} orders
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-sm font-semibold">Success Factors:</div>
                        <ul className="list-disc pl-4 mt-1 text-sm">
                          {period.factors.map((factor, i) => (
                            <li key={i}>{factor}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
