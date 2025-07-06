import { firestoreAdmin } from '../firebase-admin';
import { Readable } from 'stream';
import { parse as csvParse } from 'csv-parse';
import { stringify as csvStringify } from 'csv-stringify/sync';
import type { 
  SalesMetrics, 
  ProductPerformanceMetrics, 
  CategoryAnalytics, 
  InventoryAlerts 
} from '@/lib/types';

export class ExportService {
  private async getVendorData(vendorId: string) {
    const snapshot = await firestoreAdmin
      .collection('vendors')
      .doc(vendorId)
      .get();
    return snapshot.data();
  }

  async exportToCSV(vendorId: string, dataType: 'sales' | 'products' | 'inventory' | 'analytics') {
    try {
      const data = await this.getVendorData(vendorId);
      if (!data) throw new Error('No data found');

      let csvData: any[];
      let headers: string[];

      switch (dataType) {
        case 'sales':
          csvData = this.formatSalesData(data.sales);
          headers = ['Date', 'Revenue', 'Orders', 'Average Order Value'];
          break;
        case 'products':
          csvData = this.formatProductData(data.products);
          headers = ['Product ID', 'Name', 'Sales', 'Revenue', 'Views', 'Conversion Rate'];
          break;
        case 'inventory':
          csvData = this.formatInventoryData(data.inventory);
          headers = ['Product ID', 'Stock Level', 'Last Updated', 'Status'];
          break;
        case 'analytics':
          csvData = this.formatAnalyticsData(data.analytics);
          headers = ['Metric', 'Value', 'Change', 'Period'];
          break;
        default:
          throw new Error('Invalid export type');
      }

      return csvStringify(csvData, { header: true, columns: headers });
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }

  async importFromCSV(vendorId: string, dataType: string, fileBuffer: Buffer) {
    return new Promise((resolve, reject) => {
      const records: any[] = [];
      
      Readable.from(fileBuffer)
        .pipe(csvParse({ columns: true, skip_empty_lines: true }))
        .on('data', (record) => records.push(record))
        .on('end', async () => {
          try {
            await this.validateAndSaveImportedData(vendorId, dataType, records);
            resolve({ success: true, recordsProcessed: records.length });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  private async validateAndSaveImportedData(vendorId: string, dataType: string, records: any[]) {
    // Validate data format
    switch (dataType) {
      case 'products':
        await this.validateAndSaveProducts(vendorId, records);
        break;
      case 'inventory':
        await this.validateAndSaveInventory(vendorId, records);
        break;
      default:
        throw new Error('Unsupported import type');
    }
  }

  private formatSalesData(salesData: SalesMetrics) {
    const formattedData: any[] = [];
    salesData.daily.forEach(day => {
      formattedData.push({
        Date: day.date,
        Revenue: day.revenue,
        Orders: day.orders,
        'Average Order Value': day.averageOrderValue
      });
    });
    return formattedData;
  }

  private formatProductData(products: ProductPerformanceMetrics[]) {
    return products.map(product => ({
      'Product ID': product.id,
      'Name': product.name,
      'Sales': product.metrics.purchases,
      'Revenue': product.metrics.revenue,
      'Views': product.metrics.views,
      'Conversion Rate': product.metrics.conversionRate
    }));
  }

  private formatInventoryData(inventory: InventoryAlerts[]) {
    return inventory.map(item => ({
      'Product ID': item.productId,
      'Stock Level': item.currentStock,
      'Last Updated': new Date().toISOString(),
      'Status': item.type
    }));
  }

  private formatAnalyticsData(analytics: any) {
    return Object.entries(analytics).map(([metric, value]) => ({
      Metric: metric,
      Value: value,
      Change: 'N/A',
      Period: 'Current'
    }));
  }

  private async validateAndSaveProducts(vendorId: string, records: any[]) {
    const batch = firestoreAdmin.batch();
    records.forEach(record => {
      const productRef = firestoreAdmin
        .collection('vendors')
        .doc(vendorId)
        .collection('products')
        .doc(record['Product ID']);
      batch.update(productRef, {
        name: record.Name,
        metrics: {
          sales: parseInt(record.Sales),
          revenue: parseFloat(record.Revenue),
          views: parseInt(record.Views),
          conversionRate: parseFloat(record['Conversion Rate'])
        },
        lastUpdated: new Date()
      });
    });
    await batch.commit();
  }

  private async validateAndSaveInventory(vendorId: string, records: any[]) {
    const batch = firestoreAdmin.batch();
    records.forEach(record => {
      const inventoryRef = firestoreAdmin
        .collection('vendors')
        .doc(vendorId)
        .collection('inventory')
        .doc(record['Product ID']);
      batch.update(inventoryRef, {
        stockLevel: parseInt(record['Stock Level']),
        status: record.Status,
        lastUpdated: new Date()
      });
    });
    await batch.commit();
  }
}
