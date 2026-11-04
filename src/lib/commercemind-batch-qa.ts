import crypto from 'crypto';
import type { CommerceMindListingQuality } from '@/lib/types';
import { calculateListingQuality } from '@/lib/commercemind-quality';

export interface RawCatalogRow {
  rowNumber: number;
  sku?: string;
  name?: string;
  category?: string;
  subcategory?: string;
  price?: string | number;
  stock?: string | number;
  description?: string;
  color?: string;
  size?: string;
  material?: string;
  tags?: string;
  vendorId?: string;
}

export interface RowValidationError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface DuplicateDetectionResult {
  rowNumber: number;
  name: string;
  duplicateOfRow: number;
  isVariant: boolean;
  variantDetails?: {
    color?: string;
    size?: string;
  };
}

export interface SuspiciousClaimFlag {
  rowNumber: number;
  name: string;
  detectedTokens: string[];
  excerpt: string;
  actionRequired: 'human_review';
}

export interface ProcessedCatalogItem {
  rowId: string;
  rowNumber: number;
  status: 'valid' | 'invalid' | 'duplicate' | 'flagged_for_review';
  data: {
    sku: string;
    name: string;
    category: string;
    subcategory?: string;
    price: number;
    stock: number;
    description: string;
    attributes: Record<string, string>;
    tags: string[];
    vendorId: string;
  };
  quality: CommerceMindListingQuality;
  errors: RowValidationError[];
  suspiciousClaims: string[];
}

export interface BatchQAReport {
  jobId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  legitimateVariants: number;
  flaggedForReviewRows: number;
  errors: RowValidationError[];
  duplicates: DuplicateDetectionResult[];
  flaggedClaims: SuspiciousClaimFlag[];
  processedItems: ProcessedCatalogItem[];
  completedAt: string;
}

// Suspicious claim patterns requiring human moderation
const SUSPICIOUS_CLAIM_PATTERNS = [
  /\b(miracle cure|guaranteed cure|cures cancer|cure covid)\b/i,
  /\b(100% authentic rolex|guaranteed genuine replica|pure replica)\b/i,
  /\b(get rich quick|guaranteed return|crypto doubling)\b/i,
  /\b(unregistered medicine|prescription-free antibiotic)\b/i,
];

/**
 * Normalizes title for fingerprint comparison
 */
function normalizeFingerprint(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Computes deterministic row signature for idempotency
 */
export function computeRowIdempotencyKey(vendorId: string, row: RawCatalogRow): string {
  const identifier = row.sku?.trim() || `row_${row.rowNumber}_${row.name?.trim() || ''}`;
  return crypto
    .createHash('sha256')
    .update(`${vendorId}:${identifier}`)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Parses raw CSV text into structured catalog rows safely
 */
export function parseCSVToCatalogRows(csvContent: string): RawCatalogRow[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) return [];

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
  const rows: RawCatalogRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parser handling quotes
    const rawTokens: string[] = [];
    let current = '';
    let inQuotes = false;
    const line = lines[i];

    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        rawTokens.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    rawTokens.push(current.trim().replace(/^["']|["']$/g, ''));

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rawTokens[idx] || '';
    });

    rows.push({
      rowNumber: i + 1,
      sku: rowObj['sku'] || undefined,
      name: rowObj['name'] || rowObj['title'],
      category: rowObj['category'],
      subcategory: rowObj['subcategory'],
      price: rowObj['price'],
      stock: rowObj['stock'] || rowObj['quantity'],
      description: rowObj['description'],
      color: rowObj['color'],
      size: rowObj['size'],
      material: rowObj['material'],
      tags: rowObj['tags'],
      vendorId: rowObj['vendor_id'] || rowObj['vendorid'],
    });
  }

  return rows;
}

/**
 * Executes Resumable, Idempotent Batch Catalog QA
 */
export function processBatchCatalogQA(
  rows: RawCatalogRow[],
  options: {
    jobId?: string;
    defaultVendorId?: string;
    processedRowIds?: Set<string>;
  } = {}
): BatchQAReport {
  const jobId = options.jobId || `qa_job_${Date.now()}`;
  const defaultVendorId = options.defaultVendorId || 'system_vendor';
  const processedSet = options.processedRowIds || new Set<string>();

  const errors: RowValidationError[] = [];
  const duplicates: DuplicateDetectionResult[] = [];
  const flaggedClaims: SuspiciousClaimFlag[] = [];
  const processedItems: ProcessedCatalogItem[] = [];

  // Variant-aware product index: fingerprint -> Map<variantSignature, rowNumber>
  const productClusterIndex = new Map<
    string,
    { baseRow: number; variants: Map<string, number> }
  >();

  let legitimateVariantsCount = 0;

  for (const row of rows) {
    const rowVendorId = row.vendorId || defaultVendorId;
    const rowId = computeRowIdempotencyKey(rowVendorId, row);

    // Idempotency: Skip already processed rows
    if (processedSet.has(rowId)) {
      continue;
    }
    processedSet.add(rowId);

    const rowErrors: RowValidationError[] = [];

    // 1. Mandatory Field Validation
    if (!row.name || row.name.trim().length === 0) {
      rowErrors.push({ rowNumber: row.rowNumber, field: 'name', message: 'Product name is required' });
    }
    if (!row.category || row.category.trim().length === 0) {
      rowErrors.push({ rowNumber: row.rowNumber, field: 'category', message: 'Category is required' });
    }

    const priceNum = typeof row.price === 'number' ? row.price : parseFloat(row.price || 'NaN');
    if (isNaN(priceNum) || priceNum <= 0) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        field: 'price',
        message: 'Price must be a valid positive number',
      });
    }

    const stockNum = typeof row.stock === 'number' ? row.stock : parseInt(row.stock || '0', 10);
    if (isNaN(stockNum) || stockNum < 0) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        field: 'stock',
        message: 'Stock quantity cannot be negative',
      });
    }

    // 2. Suspicious Claims Detection
    const detectedTokens: string[] = [];
    const textBlob = `${row.name || ''} ${row.description || ''}`;
    for (const pattern of SUSPICIOUS_CLAIM_PATTERNS) {
      const match = textBlob.match(pattern);
      if (match) {
        detectedTokens.push(match[0].toLowerCase());
      }
    }

    let isFlaggedForReview = false;
    if (detectedTokens.length > 0) {
      isFlaggedForReview = true;
      flaggedClaims.push({
        rowNumber: row.rowNumber,
        name: row.name || 'Untitled',
        detectedTokens,
        excerpt: textBlob.slice(0, 100),
        actionRequired: 'human_review',
      });
    }

    // 3. Variant-Aware Duplicate Detection
    let isDuplicate = false;
    const baseFingerprint = `${normalizeFingerprint(row.name || '')}_${normalizeFingerprint(row.category || '')}`;
    const variantKey = `${(row.color || '').toLowerCase()}_${(row.size || '').toLowerCase()}`;

    if (row.name && row.category) {
      const existingCluster = productClusterIndex.get(baseFingerprint);
      if (!existingCluster) {
        const variantMap = new Map<string, number>();
        variantMap.set(variantKey, row.rowNumber);
        productClusterIndex.set(baseFingerprint, {
          baseRow: row.rowNumber,
          variants: variantMap,
        });
      } else {
        // Same base name and category exists
        if (existingCluster.variants.has(variantKey)) {
          // Exact duplicate with identical color & size
          isDuplicate = true;
          const originalRow = existingCluster.variants.get(variantKey)!;
          duplicates.push({
            rowNumber: row.rowNumber,
            name: row.name,
            duplicateOfRow: originalRow,
            isVariant: false,
          });
        } else {
          // Legitimate product variant with differing color or size
          legitimateVariantsCount++;
          existingCluster.variants.set(variantKey, row.rowNumber);
          duplicates.push({
            rowNumber: row.rowNumber,
            name: row.name,
            duplicateOfRow: existingCluster.baseRow,
            isVariant: true,
            variantDetails: {
              color: row.color,
              size: row.size,
            },
          });
        }
      }
    }

    // 4. Listing Quality Score
    const tagList = (row.tags || '')
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const quality = calculateListingQuality({
      title: row.name || '',
      category: row.category,
      description: row.description,
      tags: tagList,
    });

    // 5. Final Status Classification
    let finalStatus: ProcessedCatalogItem['status'] = 'valid';
    if (rowErrors.length > 0) {
      finalStatus = 'invalid';
      errors.push(...rowErrors);
    } else if (isDuplicate) {
      finalStatus = 'duplicate';
    } else if (isFlaggedForReview) {
      finalStatus = 'flagged_for_review';
    }

    processedItems.push({
      rowId,
      rowNumber: row.rowNumber,
      status: finalStatus,
      data: {
        sku: row.sku || `SKU_${rowId.substring(0, 8).toUpperCase()}`,
        name: row.name || '',
        category: row.category || '',
        subcategory: row.subcategory,
        price: isNaN(priceNum) ? 0 : priceNum,
        stock: isNaN(stockNum) ? 0 : stockNum,
        description: row.description || '',
        attributes: {
          ...(row.color ? { color: row.color } : {}),
          ...(row.size ? { size: row.size } : {}),
          ...(row.material ? { material: row.material } : {}),
        },
        tags: tagList,
        vendorId: rowVendorId,
      },
      quality,
      errors: rowErrors,
      suspiciousClaims: detectedTokens,
    });
  }

  const validRows = processedItems.filter((i) => i.status === 'valid').length;
  const invalidRows = processedItems.filter((i) => i.status === 'invalid').length;
  const duplicateRows = processedItems.filter((i) => i.status === 'duplicate').length;
  const flaggedForReviewRows = processedItems.filter((i) => i.status === 'flagged_for_review').length;

  return {
    jobId,
    totalRows: rows.length,
    validRows,
    invalidRows,
    duplicateRows,
    legitimateVariants: legitimateVariantsCount,
    flaggedForReviewRows,
    errors,
    duplicates,
    flaggedClaims,
    processedItems,
    completedAt: new Date().toISOString(),
  };
}
