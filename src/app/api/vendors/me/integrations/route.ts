import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { ExportService } from '@/lib/services/export-service';
const exportService = new ExportService();
import { integrationService } from '@/lib/services/integration-service';
import { reportingService } from '@/lib/services/reporting-service';

// Handler for data export
async function exportDataHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const vendorId = authenticatedUser.uid;

  try {
    const { dataType, format } = await req.json();
    const exportData = await exportService.exportToCSV(vendorId, dataType);
    
    return new NextResponse(exportData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=export-${dataType}-${new Date().toISOString()}.csv`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

// Handler for data import
async function importDataHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const vendorId = authenticatedUser.uid;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const dataType = formData.get('dataType') as string;

    if (!file || !dataType) {
      return NextResponse.json({ error: 'Missing file or data type' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const result = await exportService.importFromCSV(vendorId, dataType, Buffer.from(buffer));
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

// Handler for third-party integration connection
async function connectIntegrationHandler(req: AuthenticatedRequest) {
  try {
    const { serviceType, credentials } = await req.json();
    const result = await integrationService.connectThirdPartyAnalytics(serviceType, credentials);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Integration connection error:', error);
    return NextResponse.json({ error: 'Connection failed' }, { status: 500 });
  }
}

// Handler for integration disconnection
async function disconnectIntegrationHandler(req: AuthenticatedRequest) {
  try {
    const { serviceType } = await req.json();
    const result = await integrationService.disconnectService(serviceType);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Integration disconnection error:', error);
    return NextResponse.json({ error: 'Disconnection failed' }, { status: 500 });
  }
}

// Handler for report generation
async function generateReportHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const vendorId = authenticatedUser.uid;

  try {
    const { templateId, dateRange } = await req.json();
    const filter = {
      vendors: [vendorId],
      templateId,
      dateRange
    };
    const report = await reportingService.generateReport(filter);
    
    return NextResponse.json(report);
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 });
  }
}

// Export route handlers
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const { type } = Object.fromEntries(new URL(req.url).searchParams);

  switch (type) {
    case 'export':
      return exportDataHandler(req);
    case 'import':
      return importDataHandler(req);
    case 'connect':
      return connectIntegrationHandler(req);
    case 'disconnect':
      return disconnectIntegrationHandler(req);
    case 'report':
      return generateReportHandler(req);
    default:
      return NextResponse.json({ error: 'Invalid operation type' }, { status: 400 });
  }
}, ['vendor', 'admin']);
