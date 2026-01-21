/**
 * Data Integrity Diagnostic Script
 * Checks what's actually in Firestore and reports issues
 */

import 'dotenv/config';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

interface DiagnosticReport {
  collections: Record<string, CollectionDiagnostics>;
  issues: string[];
  warnings: string[];
  stats: {
    totalDocuments: number;
    timestamp: string;
  };
}

interface CollectionDiagnostics {
  docCount: number;
  sampleDocs: Record<string, any>[];
  schemaInconsistencies: string[];
  missingFields: string[];
}

async function diagnoseData(): Promise<void> {
  console.log('🔍 Starting Data Integrity Diagnostic...\n');

  const report: DiagnosticReport = {
    collections: {},
    issues: [],
    warnings: [],
    stats: {
      totalDocuments: 0,
      timestamp: new Date().toISOString(),
    },
  };

  try {
    // Check key collections
    const collectionsToCheck = ['users', 'products', 'categories', 'orders', 'ledger_entries', 'cms'];

    for (const collName of collectionsToCheck) {
      console.log(`📦 Checking collection: ${collName}...`);
      
      const snapshot = await firestoreAdmin.collection(collName).limit(5).get();
      const countResult = await firestoreAdmin.collection(collName).count().get();
      const docCount = countResult.data().count;
      
      report.stats.totalDocuments += docCount;
      
      const sampleDocs: Record<string, any>[] = [];
      const schemaInconsistencies: string[] = [];
      const missingFields: string[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        sampleDocs.push({ id: doc.id, ...data });

        // Check timestamp fields
        ['createdAt', 'updatedAt', 'dateAdded'].forEach((field) => {
          if (field in data) {
            const value = data[field];
            if (value instanceof Timestamp) {
              // Good - Firestore native
            } else if (value instanceof Date) {
              schemaInconsistencies.push(
                `${collName}/${doc.id}: Field "${field}" is JavaScript Date, should be Firestore Timestamp`
              );
            } else if (typeof value === 'string') {
              schemaInconsistencies.push(
                `${collName}/${doc.id}: Field "${field}" is string, should be Firestore Timestamp`
              );
            }
          }
        });

        // Check for common required fields
        if (collName === 'products') {
          const requiredFields = ['name', 'price', 'category', 'vendorId', 'imageUrl'];
          requiredFields.forEach((field) => {
            if (!(field in data) || data[field] === undefined || data[field] === null) {
              missingFields.push(`${collName}/${doc.id}: Missing or null field "${field}"`);
            }
          });
        }

        if (collName === 'orders') {
          const requiredFields = ['userId', 'items', 'totalPrice', 'status', 'createdAt'];
          requiredFields.forEach((field) => {
            if (!(field in data) || data[field] === undefined || data[field] === null) {
              missingFields.push(`${collName}/${doc.id}: Missing or null field "${field}"`);
            }
          });
        }
      });

      report.collections[collName] = {
        docCount,
        sampleDocs,
        schemaInconsistencies,
        missingFields,
      };

      console.log(`  ✓ ${collName}: ${docCount} documents`);
      if (schemaInconsistencies.length > 0) {
        console.log(`  ⚠️  Schema issues: ${schemaInconsistencies.length}`);
        report.warnings.push(...schemaInconsistencies);
      }
      if (missingFields.length > 0) {
        console.log(`  ❌ Missing fields: ${missingFields.length}`);
        report.issues.push(...missingFields);
      }
    }

    // Check referential integrity
    console.log('\n🔗 Checking Referential Integrity...');
    await checkReferentialIntegrity(report);

    // Print report
    console.log('\n' + '='.repeat(80));
    console.log('DIAGNOSTIC REPORT');
    console.log('='.repeat(80));
    console.log(`Total Documents: ${report.stats.totalDocuments}`);
    console.log(`Timestamp: ${report.stats.timestamp}`);

    if (report.issues.length > 0) {
      console.log(`\n❌ CRITICAL ISSUES (${report.issues.length}):`);
      report.issues.slice(0, 10).forEach((issue) => console.log(`  - ${issue}`));
      if (report.issues.length > 10) {
        console.log(`  ... and ${report.issues.length - 10} more`);
      }
    }

    if (report.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${report.warnings.length}):`);
      report.warnings.slice(0, 10).forEach((warning) => console.log(`  - ${warning}`));
      if (report.warnings.length > 10) {
        console.log(`  ... and ${report.warnings.length - 10} more`);
      }
    }

    if (report.issues.length === 0 && report.warnings.length === 0) {
      console.log('\n✅ No critical issues found!');
    }

    console.log('='.repeat(80));
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  }
}

async function checkReferentialIntegrity(report: DiagnosticReport): Promise<void> {
  // Check that products reference existing vendors
  const productsCol = report.collections.products;
  const usersCol = report.collections.users;

  if (productsCol && productsCol.sampleDocs.length > 0 && usersCol && usersCol.sampleDocs.length > 0) {
    const vendorIds = new Set(usersCol.sampleDocs.filter((u) => u.role === 'vendor').map((u) => u.id));

    for (const product of productsCol.sampleDocs) {
      if (product.vendorId && !vendorIds.has(product.vendorId)) {
        report.issues.push(`Product ${product.id} references non-existent vendor ${product.vendorId}`);
      }
    }
  }

  // Check that orders reference existing users
  const ordersCol = report.collections.orders;
  if (ordersCol && ordersCol.sampleDocs.length > 0 && usersCol && usersCol.sampleDocs.length > 0) {
    const userIds = new Set(usersCol.sampleDocs.map((u) => u.id));

    for (const order of ordersCol.sampleDocs) {
      if (order.userId && !userIds.has(order.userId)) {
        report.issues.push(`Order ${order.id} references non-existent user ${order.userId}`);
      }
    }
  }
}

diagnoseData().catch(console.error);
