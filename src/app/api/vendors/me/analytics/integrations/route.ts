import { NextRequest, NextResponse } from 'next/server';
import { integrationService } from '@/lib/services/analytics/integration-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, format, startDate, endDate, data, provider, credentials, config } = body;

    switch (action) {
      case 'export':
        const exportedData = await integrationService.exportData(
          format,
          new Date(startDate),
          new Date(endDate)
        );
        return NextResponse.json({ success: true, data: exportedData });

      case 'import':
        const imported = await integrationService.importData(data, provider);
        return NextResponse.json({ success: imported });

      case 'connect':
        const connection = await integrationService.connectToThirdParty(provider, credentials);
        return NextResponse.json({ success: true, connection });

      case 'customReport':
        const report = await integrationService.createCustomReport(config);
        return NextResponse.json({ success: true, report });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Integration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
