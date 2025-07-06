export interface CategoryMetric {
  id: string;
  categoryId: string;
  categoryName: string;
  value: number;
  trend: number;
  units: string;
  period: string;
}

export class ReportingService {
  async saveTemplate(template: any): Promise<void> {
    // Implementation
  }
  
  async saveFilterPreset(preset: any): Promise<void> {
    // Implementation
  }
  
  async getFilterPresets(): Promise<any[]> {
    // Implementation
    return [];
  }
  
  async getReportTemplates(): Promise<any[]> {
    // Implementation
    return [];
  }
}
