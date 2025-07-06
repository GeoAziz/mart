'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, ShoppingCart, Target, Settings } from 'lucide-react';
import type { AutomatedRecommendations } from '@/lib/types';

interface AutomatedRecommendationsPanelProps {
  recommendations: AutomatedRecommendations;
}

export function AutomatedRecommendationsPanel({ recommendations }: AutomatedRecommendationsPanelProps) {
  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return 'text-green-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Automated Recommendations</CardTitle>
            <CardDescription>AI-generated suggestions for business optimization</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="priority">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="priority">Priority Actions</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
          </TabsList>

          <TabsContent value="priority" className="space-y-4 mt-4">
            {recommendations.priority.map((action, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className={getImpactColor(action.impact)}>
                        {action.type.toUpperCase()}
                      </Badge>
                      <h4 className="font-semibold mt-2">{action.action}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{action.reasoning}</p>
                    </div>
                    <Badge variant="outline">
                      {action.impact.toUpperCase()} IMPACT
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <div className="text-sm font-semibold">Potential Benefit</div>
                    <p className="text-sm text-muted-foreground">{action.potentialBenefit}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="products" className="space-y-4 mt-4">
            {recommendations.products.map((product, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{product.productName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {product.suggestions.map((suggestion, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div>
                          <div className="font-semibold">{suggestion.type}</div>
                          <p className="text-sm text-muted-foreground mt-1">{suggestion.action}</p>
                          <div className="text-sm text-primary mt-2">
                            Expected Impact: {suggestion.expectedImpact}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="marketing" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Suggested Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recommendations.marketing.suggestedCampaigns.map((campaign, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge>{campaign.type}</Badge>
                            <div className="mt-2">
                              <div className="text-sm font-semibold">Target Audience</div>
                              <div className="text-sm text-muted-foreground">{campaign.targetAudience}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Expected ROI</div>
                            <div className="font-semibold text-green-500">
                              {(campaign.expectedROI * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          Suggested Timing: {campaign.timing}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cross-Sell Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recommendations.marketing.crossSellOpportunities.map((opportunity, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="font-semibold">{opportunity.sourceProduct}</div>
                        <div className="mt-2">
                          <div className="text-sm text-muted-foreground">Recommended Products:</div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {opportunity.recommendedProducts.map((prod, i) => (
                              <Badge key={i} variant="secondary">{prod}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-green-500">
                          {(opportunity.conversionProbability * 100).toFixed(1)}% conversion probability
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="optimization" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pricing Optimization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recommendations.optimization.pricing.map((item, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="font-semibold">{item.productId}</div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Current: ${item.currentPrice}</div>
                            <div className="font-semibold text-green-500">Suggested: ${item.suggestedPrice}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">{item.reasoning}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Inventory Optimization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recommendations.optimization.inventory.map((item, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold">{item.productId}</div>
                            <div className="text-sm text-muted-foreground mt-1">{item.action}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{item.suggestedQuantity} units</div>
                            <div className="text-sm text-muted-foreground">{item.timing}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
