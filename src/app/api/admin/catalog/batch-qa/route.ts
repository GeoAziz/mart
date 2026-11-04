import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import {
  parseCSVToCatalogRows,
  processBatchCatalogQA,
} from '@/lib/commercemind-batch-qa';
import { firestoreAdmin as db } from '@/lib/firebase-admin';

/**
 * POST /api/admin/catalog/batch-qa
 * Admin endpoint for idempotent, resumable bulk catalog QA.
 *
 * Requirements:
 * - Admin-role gated.
 * - Parses CSV and performs per-row validation.
 * - Distinguishes legitimate variants from true duplicates.
 * - Flags suspicious claims for human moderation.
 * - Generates comprehensive administrative audit report.
 */
async function handler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const { csvContent, jobId, autoPublish = false } = body;

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "csvContent" in request payload' },
        { status: 400 }
      );
    }

    const rows = parseCSVToCatalogRows(csvContent);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV content contains no valid data rows or headers' },
        { status: 400 }
      );
    }

    const report = processBatchCatalogQA(rows, {
      jobId,
      defaultVendorId: req.userProfile.uid,
    });

    // If autoPublish is requested, persist valid rows non-destructively to Firestore
    if (autoPublish) {
      const batch = db.batch();
      const validItems = report.processedItems.filter((i) => i.status === 'valid');

      for (const item of validItems) {
        const docRef = db.collection('products').doc();
        batch.set(docRef, {
          name: item.data.name,
          category: item.data.category,
          subcategory: item.data.subcategory || 'General',
          price: item.data.price,
          stock: item.data.stock,
          description: item.data.description,
          sku: item.data.sku,
          vendorId: item.data.vendorId,
          status: 'pending_approval', // Requires approval before storefront visibility
          dateAdded: new Date(),
          updatedAt: new Date(),
          commercemind: {
            version: '1.0',
            enrichedAt: new Date().toISOString(),
            raw_vendor_input: item.data.description || item.data.name,
            productType: item.data.name,
            attributes: item.data.attributes,
            qualityScore: item.quality.score,
            qualityGrade: item.quality.grade,
          },
        });
      }

      if (validItems.length > 0) {
        await batch.commit();
      }
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Error processing catalog batch QA';
    console.error('[Batch QA Route Error]:', errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler, 'admin');
