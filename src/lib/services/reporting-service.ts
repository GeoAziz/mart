import { firestoreAdmin } from '../firebase-admin';
import { DynamicReportFilter, AnalyticsMetrics, ComparativeAnalysis, ReportExportOptions } from '../types/analytics';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

export class ReportingService {
  private static instance: ReportingService;

  private constructor() {}

  public static getInstance(): ReportingService {
    if (!ReportingService.instance) {
      ReportingService.instance = new ReportingService();
    }
    return ReportingService.instance;
  }

  async generateReport(filter: DynamicReportFilter): Promise<AnalyticsMetrics> {
    const ordersRef = firestoreAdmin.collection('orders');
    let query = ordersRef.where('createdAt', '>=', filter.dateRange.startDate)
                        .where('createdAt', '<=', filter.dateRange.endDate);

    // Apply additional filters
    if (filter.categories?.length) {
      query = query.where('categories', 'array-contains-any', filter.categories);
    }
    if (filter.vendors?.length) {
      query = query.where('vendorIds', 'array-contains-any', filter.vendors);
    }

    const orders = await query.get();
    
    // Calculate metrics
    let revenue = 0;
    let customerCount = new Set();
    const productSales: { [key: string]: { units: number; name: string; revenue: number } } = {};
    const categorySales: { [key: string]: number } = {};

    orders.forEach(order => {
      const data = order.data();
      revenue += data.totalAmount;
      customerCount.add(data.userId);
      
      data.items.forEach((item: any) => {
        // Ensure productSales has name and revenue
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            units: 0,
            name: item.productName || item.name || 'Unknown',
            revenue: 0
          };
        }
        productSales[item.productId].units += item.quantity;
        productSales[item.productId].revenue += (item.price || 0) * item.quantity;

        if (item.category) {
          categorySales[item.category] = (categorySales[item.category] || 0) + item.quantity;
        }
      });
    });

    // Sort and format metrics based on filter
    const topProducts = Object.entries(productSales)
      .map(([id, { units, name, revenue }]) => ({ id, units, name, revenue }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 10);

    const categoryBreakdown = Object.entries(categorySales)
      .map(([name, units]) => ({
        id: name, // using category name as id
        name,
        units,
        revenue: 0, // set to 0 or calculate if possible
        growth: 0   // set to 0 or calculate if possible
      }))
      .sort((a, b) => b.units - a.units);

    return {
      revenue,
      orders: orders.size,
      averageOrderValue: revenue / orders.size || 0,
      customerCount: customerCount.size,
      topProducts,
      categoryBreakdown
    };
  }

  async generateComparison(filter: DynamicReportFilter): Promise<ComparativeAnalysis> {
    const currentPeriod = await this.generateReport(filter);
    
    // Calculate previous period date range
    const duration = filter.dateRange.endDate.getTime() - filter.dateRange.startDate.getTime();
    const previousFilter = {
      ...filter,
      dateRange: {
        endDate: filter.dateRange.startDate,
        startDate: new Date(filter.dateRange.startDate.getTime() - duration)
      }
    };
    
    const previousPeriod = await this.generateReport(previousFilter);

    // Calculate percentage changes
    const calculatePercentageChange = (current: number, previous: number) => 
      previous === 0 ? 100 : ((current - previous) / previous) * 100;

    return {
      currentPeriod,
      previousPeriod,
      percentageChange: {
        revenue: calculatePercentageChange(currentPeriod.revenue, previousPeriod.revenue),
        orders: calculatePercentageChange(currentPeriod.orders, previousPeriod.orders),
        averageOrderValue: calculatePercentageChange(currentPeriod.averageOrderValue, previousPeriod.averageOrderValue),
        customerCount: calculatePercentageChange(currentPeriod.customerCount, previousPeriod.customerCount)
      }
    };
  }

  async exportReport(data: AnalyticsMetrics, options: ReportExportOptions): Promise<Buffer> {
    switch (options.format) {
      case 'csv':
        return this.exportToCSV(data, options);
      case 'xlsx':
        return this.exportToXLSX(data, options);
      case 'pdf':
        return this.exportToPDF(data, options);
      default:
        throw new Error('Unsupported export format');
    }
  }

  private async exportToCSV(data: AnalyticsMetrics, options: ReportExportOptions): Promise<Buffer> {
    const rows = [
      ['Metric', 'Value'],
      ['Revenue', data.revenue],
      ['Orders', data.orders],
      ['Average Order Value', data.averageOrderValue],
      ['Customer Count', data.customerCount],
      [],
      ['Top Products'],
      ['Product ID', 'Units Sold'],
      ...data.topProducts.map(p => [p.id, p.units]),
      [],
      ['Category Breakdown'],
      ['Category', 'Units Sold'],
      ...data.categoryBreakdown.map(c => [c.name, c.units])
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    return Buffer.from(csvContent);
  }

  private async exportToXLSX(data: AnalyticsMetrics, options: ReportExportOptions): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();
    
    // Overview sheet
    if (options.sections.includes('overview')) {
      const overviewData = [
        ['Metric', 'Value'],
        ['Revenue', data.revenue],
        ['Orders', data.orders],
        ['Average Order Value', data.averageOrderValue],
        ['Customer Count', data.customerCount]
      ];
      const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');
    }

    // Products sheet
    if (options.sections.includes('products')) {
      const productsData = [
        ['Product ID', 'Units Sold'],
        ...data.topProducts.map(p => [p.id, p.units])
      ];
      const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
      XLSX.utils.book_append_sheet(workbook, productsSheet, 'Top Products');
    }

    // Categories sheet
    if (options.sections.includes('categories')) {
      const categoriesData = [
        ['Category', 'Units Sold'],
        ...data.categoryBreakdown.map(c => [c.name, c.units])
      ];
      const categoriesSheet = XLSX.utils.aoa_to_sheet(categoriesData);
      XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Categories');
    }

    return Buffer.from(XLSX.write(workbook, { type: 'buffer' }));
  }

  private async exportToPDF(data: AnalyticsMetrics, options: ReportExportOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument();

      doc.on('data', chunks.push.bind(chunks));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Add title
      doc.fontSize(20).text('Analytics Report', { align: 'center' });
      doc.moveDown();

      // Add overview section
      if (options.sections.includes('overview')) {
        doc.fontSize(16).text('Overview');
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Revenue: $${data.revenue.toFixed(2)}`);
        doc.text(`Orders: ${data.orders}`);
        doc.text(`Average Order Value: $${data.averageOrderValue.toFixed(2)}`);
        doc.text(`Customer Count: ${data.customerCount}`);
        doc.moveDown();
      }

      // Add products section
      if (options.sections.includes('products')) {
        doc.fontSize(16).text('Top Products');
        doc.moveDown();
        doc.fontSize(12);
        data.topProducts.forEach(product => {
          doc.text(`${product.id}: ${product.units} units`);
        });
        doc.moveDown();
      }

      // Add categories section
      if (options.sections.includes('categories')) {
        doc.fontSize(16).text('Category Breakdown');
        doc.moveDown();
        doc.fontSize(12);
        data.categoryBreakdown.forEach(category => {
          doc.text(`${category.name}: ${category.units} units`);
        });
      }

      doc.end();
    });
  }

  async createReportTemplate(vendorId: string, templateData: any): Promise<any> {
    const templatesRef = firestoreAdmin.collection('reportTemplates');
    const template = {
      ...templateData,
      vendorId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const doc = await templatesRef.add(template);
    return { id: doc.id, ...template };
  }

  async getReportTemplates(vendorId: string): Promise<any[]> {
    const templatesRef = firestoreAdmin.collection('reportTemplates');
    const snapshot = await templatesRef.where('vendorId', '==', vendorId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async saveFilterPreset(vendorId: string, name: string, filters: any): Promise<any> {
    const presetsRef = firestoreAdmin.collection('filterPresets');
    const preset = {
      vendorId,
      name,
      filters,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const doc = await presetsRef.add(preset);
    return { id: doc.id, ...preset };
  }

  async getFilterPresets(vendorId: string): Promise<any[]> {
    const presetsRef = firestoreAdmin.collection('filterPresets');
    const snapshot = await presetsRef.where('vendorId', '==', vendorId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

// Export singleton instance
export const reportingService = ReportingService.getInstance();
