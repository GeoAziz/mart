export interface ProductAnalytics {
  salesPerformance: SalesMetric[];
  popularityMetrics: PopularityMetric[];
  inventoryTurnover: InventoryMetric[];
  categoryPerformance: CategoryMetric[];
  topProducts: TopProduct[];
}

export interface SalesMetric {
  date: string;
  revenue: number;
  units: number;
}

export interface PopularityMetric {
  productId: string;
  name: string;
  views: number;
  conversionRate: number;
}

export interface InventoryMetric {
  productId: string;
  name: string;
  turnoverRate: number;
  daysInStock: number;
}

export interface CategoryMetric {
  id: string;
  name: string;
  units: number;
  revenue: number;
  growth: number;
}

export interface TopProduct {
  id: string;
  name: string;
  revenue: number;
  units: number;
}

export interface AnalyticsTimeframe {
  startDate: Date;
  endDate: Date;
}

export interface AnalyticsFilter {
  timeframe: AnalyticsTimeframe;
  categories?: string[];
  products?: string[];
}

export interface DynamicReportFilter {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  categories?: string[];
  vendors?: string[];
  productTags?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  sortBy?: 'revenue' | 'units' | 'avgOrderValue' | 'profit';
  sortOrder?: 'asc' | 'desc';
}

export interface ComparativeAnalysis {
  currentPeriod: AnalyticsMetrics;
  previousPeriod: AnalyticsMetrics;
  percentageChange: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    customerCount: number;
  };
}

export interface AnalyticsMetrics {
  revenue: number;
  orders: number;
  averageOrderValue: number;
  customerCount: number;
  topProducts: TopProduct[];
  categoryBreakdown: CategoryMetric[];
}

export interface ChartConfiguration {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'radar';
  dataKeys: string[];
  title: string;
  description?: string;
  colors?: string[];
  stacked?: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  charts: ChartConfiguration[];
  sections: ('overview' | 'products' | 'categories' | 'customers')[];
  filters: DynamicReportFilter;
  createdAt: Date;
  updatedAt: Date;
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filter: DynamicReportFilter;
  createdAt: Date;
  updatedAt: Date;
}

// Update ReportExportOptions to include more formats
export interface ReportExportOptions {
  format: 'csv' | 'xlsx' | 'pdf' | 'json' | 'html';
  sections: ('overview' | 'products' | 'categories' | 'customers')[];
  includeCharts: boolean;
  template?: string; // ID of the report template to use
}
