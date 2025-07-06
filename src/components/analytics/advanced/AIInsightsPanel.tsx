'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, Users, ShoppingBag, AlertTriangle } from 'lucide-react';
import type { AIInsights } from '@/lib/types';

interface AIInsightsPanelProps {
  insights: AIInsights;
}

export function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>AI-Powered Insights</CardTitle>
            <CardDescription>Data-driven recommendations and analysis</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Alert>
              <AlertTitle className="font-semibold">Summary</AlertTitle>
              <AlertDescription>{insights.overview.summary}</AlertDescription>
            </Alert>
            
            <div className="grid gap-4 mt-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Key Findings
                </h4>
                <ul className="space-y-2">
                  {insights.overview.keyFindings.map((finding, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Badge variant="secondary">{index + 1}</Badge>
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Factors
                </h4>
                <ul className="space-y-2">
                  {insights.overview.riskFactors.map((risk, index) => (
                    <li key={index} className="flex items-start gap-2 text-destructive">
                      <Badge variant="destructive">{index + 1}</Badge>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4 mt-4">
            {insights.productInsights.map((product, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{product.productName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Insights</h4>
                      <ul className="list-disc pl-4 space-y-1">
                        {product.insights.map((insight, i) => (
                          <li key={i}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Recommendations</h4>
                      <ul className="list-disc pl-4 space-y-1">
                        {product.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="market" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Market Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Emerging Categories</h4>
                      <div className="flex flex-wrap gap-2">
                        {insights.marketTrends.emergingCategories.map((category, i) => (
                          <Badge key={i} variant="secondary">{category}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Declining Categories</h4>
                      <div className="flex flex-wrap gap-2">
                        {insights.marketTrends.decliningCategories.map((category, i) => (
                          <Badge key={i} variant="destructive">{category}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4 mt-4">
            <div className="grid gap-4">
              {insights.customerBehavior.segments.map((segment, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">{segment.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Characteristics</h4>
                        <ul className="list-disc pl-4 space-y-1">
                          {segment.characteristics.map((char, i) => (
                            <li key={i}>{char}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Recommendations</h4>
                        <ul className="list-disc pl-4 space-y-1">
                          {segment.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
