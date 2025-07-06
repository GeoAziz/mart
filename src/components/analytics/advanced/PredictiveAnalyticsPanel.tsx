'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaChart, BarChart } from '@tremor/react';
import { Brain, TrendingUp, Package, DollarSign } from 'lucide-react';
import type { PredictiveAnalytics } from '@/lib/types';

interface PredictiveAnalyticsPanelProps {
  predictions: PredictiveAnalytics;
}

export function PredictiveAnalyticsPanel({ predictions }: PredictiveAnalyticsPanelProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Predictive Analytics</CardTitle>
            <CardDescription>AI-powered forecasts and predictions</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sales">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sales">Sales Predictions</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Forecasts</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Next Month Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-muted-foreground text-sm">Predicted Revenue</span>
                    <span className="text-2xl font-bold">
                      ${predictions.sales.nextMonth.predictedRevenue.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Confidence: {(predictions.sales.nextMonth.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-muted-foreground text-sm">Predicted Orders</span>
                    <span className="text-2xl font-bold">
                      {predictions.sales.nextMonth.predictedOrders.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-sm">Key Factors</span>
                    <ul className="text-sm mt-2 space-y-1">
                      {predictions.sales.nextMonth.factors.map((factor, index) => (
                        <li key={index}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Product Growth Projections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <BarChart
                    data={predictions.sales.productProjections.map(proj => ({
                      name: proj.productName,
                      'Projected Growth': proj.growthRate * 100,
                      'Confidence': proj.confidenceScore * 100
                    }))}
                    index="name"
                    categories={['Projected Growth', 'Confidence']}
                    colors={['blue', 'green']}
                    valueFormatter={(value) => `${value.toFixed(1)}%`}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Restock Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {predictions.inventory.restockRecommendations.map((rec, index) => (
                    <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{rec.productName}</h4>
                        <p className="text-sm text-muted-foreground">{rec.reason}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {rec.suggestedQuantity} units
                        </div>
                        <div className="text-sm text-muted-foreground">
                          by {rec.recommendedDate.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Demand Forecasts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {predictions.inventory.demandForecasts.map((forecast, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h4 className="font-semibold">{forecast.productName}</h4>
                      <div className="mt-2">
                        <div className="text-sm text-muted-foreground">Expected Demand</div>
                        <div className="text-lg font-semibold">{forecast.expectedDemand} units</div>
                      </div>
                      <div className="mt-2">
                        <div className="text-sm text-muted-foreground">Peak Periods</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {forecast.peakPeriods.map((period, i) => (
                            <span key={i} className="text-sm bg-secondary px-2 py-1 rounded">
                              {period}
                            </span>
                          ))}
                        </div>
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
