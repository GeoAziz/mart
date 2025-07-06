import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { reportingService } from '@/lib/services/reporting-service';

// Handler for creating report templates
async function createTemplateHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const vendorId = authenticatedUser.uid;

  try {
    const templateData = await req.json();
    const template = await reportingService.createReportTemplate(vendorId, templateData);
    return NextResponse.json(template);
  } catch (error) {
    console.error('Template creation error:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

// Handler for fetching report templates
async function getTemplatesHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const vendorId = authenticatedUser.uid;

  try {
    const templates = await reportingService.getReportTemplates(vendorId);
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Template fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// Handler for saving filter presets
async function savePresetHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const vendorId = authenticatedUser.uid;

  try {
    const { name, filters } = await req.json();
    const preset = await reportingService.saveFilterPreset(vendorId, name, filters);
    return NextResponse.json(preset);
  } catch (error) {
    console.error('Preset save error:', error);
    return NextResponse.json({ error: 'Failed to save preset' }, { status: 500 });
  }
}

// Handler for fetching filter presets
async function getPresetsHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const vendorId = authenticatedUser.uid;

  try {
    const presets = await reportingService.getFilterPresets(vendorId);
    return NextResponse.json(presets);
  } catch (error) {
    console.error('Preset fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
  }
}

// GET route for fetching templates and presets
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const { type } = Object.fromEntries(new URL(req.url).searchParams);

  switch (type) {
    case 'templates':
      return getTemplatesHandler(req);
    case 'presets':
      return getPresetsHandler(req);
    default:
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
  }
}, ['vendor', 'admin']);

// POST route for creating templates and presets
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const { type } = Object.fromEntries(new URL(req.url).searchParams);

  switch (type) {
    case 'template':
      return createTemplateHandler(req);
    case 'preset':
      return savePresetHandler(req);
    default:
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
  }
}, ['vendor', 'admin']);
