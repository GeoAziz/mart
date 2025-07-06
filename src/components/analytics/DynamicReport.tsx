'use client';

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { StatCard } from './stat-card';
import { PresetManager } from './preset-manager';
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
// import { MetricCard } from './stat-card'
// import { FilterPreset } from './preset-manager'
import { FilterPreset } from '@/lib/types/analytics'
import { ReportingService } from '@/lib/services/reporting'
import { CategoryMetric } from '@/lib/services/reporting'
import { 
  DynamicReportFilter, 
  AnalyticsMetrics, 
  ComparativeAnalysis,
  ReportTemplate
} from '@/lib/types/analytics';
import { reportingService } from '@/lib/services/reporting-service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';

interface DateRange {
  from: Date;
  to: Date;
}

// Using CategoryMetric from '@/lib/types/analytics' instead

// Removed local FilterPreset interface to use the imported one from '@/lib/types/analytics'

interface DynamicReportProps {
  currentVendorId: string;
}

const DynamicReport = ({ currentVendorId }: DynamicReportProps) => {
  const [filter, setFilter] = useState<DynamicReportFilter>({
    dateRange: {
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate: new Date()
    }
  });

  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [comparison, setComparison] = useState<ComparativeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<ReportTemplate | null>(null);
  const { toast } = useToast();

  const generateReport = async () => {
    setLoading(true);
    try {
      const data = await reportingService.generateReport(filter);
      const compData = await reportingService.generateComparison(filter);
      setMetrics(data);
      setComparison(compData);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'csv' | 'xlsx' | 'pdf' | 'json' | 'html', templateId?: string) => {
    if (!metrics) return;

    try {
      const buffer = await reportingService.exportReport(metrics, {
        format,
        sections: ['overview', 'products', 'categories'],
        includeCharts: true,
        template: templateId
      });

      // Create download link
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${format}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const [templateName, setTemplateName] = useState('');

  // Function to save a new template
  const handleSaveTemplate = async () => {
    try {
      await reportingService.saveFilterPreset(
        currentVendorId,
        templateName,
        filter
      );
      toast({
        title: 'Success',
        description: 'Template saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
    }
  };

  // Function to save a new filter preset
  const handleSavePreset = async (preset: Omit<FilterPreset, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await reportingService.saveFilterPreset(
        currentVendorId,
        preset.name,
        preset.filter
      )
      toast({
        title: 'Success',
        description: 'Filter preset saved successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save filter preset',
        variant: 'destructive',
      })
    }
  };

  // Function to load a template
  const handleLoadTemplate = (template: ReportTemplate) => {
    setActiveTemplate(template);
    setFilter(template.filters);
    generateReport();
  };

  // Function to load a filter preset
  const handleLoadPreset = (preset: { filter: DynamicReportFilter }) => {
    setFilter(preset.filter);
    generateReport();
  };

  const formatDateRange = (range: DateRange) => {
    if (!range.from || !range.to) return '';
    return `${format(range.from, 'MMM d, yyyy')} - ${format(range.to, 'MMM d, yyyy')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Calendar
                mode="single"
                selected={filter.dateRange.startDate}
                onSelect={(date) => date && setFilter(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, startDate: date }
                }))}
              />
              <Calendar
                mode="single"
                selected={filter.dateRange.endDate}
                onSelect={(date) => date && setFilter(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, endDate: date }
                }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              onValueChange={(value) => setFilter(prev => ({
                ...prev,
                sortBy: value as DynamicReportFilter['sortBy']
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="units">Units Sold</SelectItem>
                <SelectItem value="avgOrderValue">Average Order Value</SelectItem>
                <SelectItem value="profit">Profit</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Button onClick={generateReport} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Report'}
      </Button>

      {metrics && comparison && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="templates">Templates & Presets</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Revenue"
                value={`$${metrics.revenue.toFixed(2)}`}
                change={comparison.percentageChange.revenue}
              />
              <StatCard
                title="Orders"
                value={metrics.orders.toString()}
                change={comparison.percentageChange.orders}
              />
              <StatCard
                title="Average Order Value"
                value={`$${metrics.averageOrderValue.toFixed(2)}`}
                change={comparison.percentageChange.averageOrderValue}
              />
              <StatCard
                title="Customers"
                value={metrics.customerCount.toString()}
                change={comparison.percentageChange.customerCount}
              />
            </div>
          </TabsContent>

          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>Period Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>Current Period: {format(filter.dateRange.startDate, 'PP')} - {format(filter.dateRange.endDate, 'PP')}</div>
                  <div>Previous Period: {format(new Date(filter.dateRange.startDate.getTime() - (filter.dateRange.endDate.getTime() - filter.dateRange.startDate.getTime())), 'PP')} - {format(filter.dateRange.startDate, 'PP')}</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.topProducts.map(product => (
                    <div key={product.id} className="flex justify-between">
                      <span>{product.id}</span>
                      <span>{product.units} units</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.categoryBreakdown.map(category => (
                    <div key={category.name} className="flex justify-between">
                      <span>{category.name}</span>
                      <span>{category.units} units</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <PresetManager
              templates={templates}
              filterPresets={filterPresets}
              currentFilter={filter}
              onLoadTemplate={handleLoadTemplate}
              onLoadPreset={handleLoadPreset}
              onSaveTemplate={handleSaveTemplate}
              onSavePreset={handleSavePreset}
            />
          </TabsContent>
        </Tabs>
      )}

      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          onClick={() => exportReport('csv')}
          disabled={!metrics}
        >
          Export CSV
        </Button>
        <Button
          variant="outline"
          onClick={() => exportReport('xlsx')}
          disabled={!metrics}
        >
          Export Excel
        </Button>
        <Button
          variant="outline"
          onClick={() => exportReport('pdf')}
          disabled={!metrics}
        >
          Export PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => exportReport('json')}
          disabled={!metrics}
        >
          Export JSON
        </Button>
        <Button
          variant="outline"
          onClick={() => exportReport('html')}
          disabled={!metrics}
        >
          Export HTML
        </Button>
      </div>
    </div>
  );
}

export default DynamicReport;
