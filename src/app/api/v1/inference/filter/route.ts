import { NextResponse } from 'next/server';
import {
  validateAndCompileFilterAST,
  ASTSecurityViolationError,
  type RawASTClause,
} from '@/lib/commercemind-ast';
import {
  validateAndSanitizeEnvelope,
  EnvelopeValidationError,
} from '@/lib/commercemind-envelope';
import {
  getCircuitBreakerState,
  generateDeterministicCatalogFallback,
} from '@/lib/commercemind-client';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB limit

/**
 * Standard Security Headers
 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store, max-age=0',
};

/**
 * Sanitizes and strips sensitive error messages (stack traces, paths, DB names)
 */
function sanitizeErrorMessage(err: unknown): { code: string; message: string } {
  if (err instanceof ASTSecurityViolationError) {
    return {
      code: 'ASTSecurityViolationError',
      message: err.message.replace(/\[ASTSecurityViolation\]\s*/, ''),
    };
  }

  if (err instanceof EnvelopeValidationError) {
    return {
      code: 'EnvelopeValidationError',
      message: err.message.replace(/\[EnvelopeValidation\]\s*/, ''),
    };
  }

  // Generic sanitized error - never expose stack trace, sql syntax or internal file paths
  return {
    code: 'InternalProcessingError',
    message: 'An error occurred while evaluating the query',
  };
}

/**
 * POST /api/v1/inference/filter
 * Authoritative HTTP gateway for AST filter compilation and inference.
 *
 * Enforces:
 * - Content-Type: application/json (415 on mismatch)
 * - Maximum body size: 1MB (413 on overflow)
 * - Strict JSON syntax (400 on malformed JSON, never 500)
 * - Strict AST security allowlist (422 on injection attempt)
 * - Strict envelope validation (400/422 on envelope skew / tampering)
 * - Zero database errors or stack traces leaked in response
 * - Security headers: X-Content-Type-Options: nosniff
 */
async function filterHandler(req: AuthenticatedRequest) {
  // 1. Verify Content-Type (HTTP 415)
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json(
      {
        error: {
          code: 'UnsupportedMediaType',
          message: 'Content-Type must be application/json',
        },
      },
      { status: 415, headers: SECURITY_HEADERS }
    );
  }

  // 2. Read body with raw buffer size check (HTTP 413)
  let rawBodyText: string;
  try {
    const rawBuffer = await req.arrayBuffer();
    if (rawBuffer.byteLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        {
          error: {
            code: 'PayloadTooLarge',
            message: `Payload exceeds 1MB limit (${rawBuffer.byteLength} bytes)`,
          },
        },
        { status: 413, headers: SECURITY_HEADERS }
      );
    }
    rawBodyText = Buffer.from(rawBuffer).toString('utf-8');
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Error reading request body';
    return NextResponse.json(
      { error: { code: 'PayloadReadError', message: errMsg } },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  // 3. Null Byte Check (HTTP 400)
  if (rawBodyText.includes('\0') || rawBodyText.includes('\\u0000')) {
    return NextResponse.json(
      {
        error: {
          code: 'NullByteDetected',
          message: 'Null byte injection detected in body',
        },
      },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  // 4. Parse JSON safely (HTTP 400 on malformed, never 500)
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBodyText) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'MalformedJSON',
          message: 'Invalid JSON payload structure',
        },
      },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  // 5. Envelope Validation (if envelope metadata is supplied)
  if (body.schema_version || body.model_id || body.timestamp) {
    try {
      // Validate schema envelope
      if (!body.schema_version) {
        throw new EnvelopeValidationError('Missing required schema_version in envelope');
      }
      validateAndSanitizeEnvelope({
        schema_version: body.schema_version,
        model_id: body.model_id,
        prompt_version: body.prompt_version || '1.0.0',
        timestamp: body.timestamp,
        payload: (body.payload as Record<string, unknown>) || { filter_ast: body.filter_ast },
      });
    } catch (envErr: unknown) {
      const sanitized = sanitizeErrorMessage(envErr);
      return NextResponse.json(
        { error: sanitized },
        { status: 422, headers: SECURITY_HEADERS }
      );
    }
  }

  // 6. AST Filter Validation & Compilation (HTTP 422)
  if (body.filter_ast) {
    try {
      const rawAst = body.filter_ast as Record<string, unknown>;

      // Reject non-object or nested query injections ($or, $where at root)
      if (typeof rawAst !== 'object' || Array.isArray(rawAst) || rawAst === null) {
        throw new ASTSecurityViolationError('filter_ast must be an object');
      }

      if ('$or' in rawAst || '$where' in rawAst || '$and' in rawAst) {
        throw new ASTSecurityViolationError('MongoDB logical root operators ($or, $where, $and) are prohibited');
      }

      // Handle single clause or array of clauses
      const clausesToValidate: RawASTClause[] = Array.isArray(rawAst.clauses)
        ? (rawAst.clauses as RawASTClause[])
        : rawAst.field && rawAst.operator
        ? [rawAst as unknown as RawASTClause]
        : [];

      if (clausesToValidate.length === 0 && !rawAst.category) {
        throw new ASTSecurityViolationError('filter_ast must specify at least one valid field clause');
      }

      const compiledClauses = validateAndCompileFilterAST(clausesToValidate);

      return NextResponse.json(
        {
          success: true,
          compiled_ast: compiledClauses,
          timestamp: Date.now(),
        },
        { status: 200, headers: SECURITY_HEADERS }
      );
    } catch (astErr: unknown) {
      const sanitized = sanitizeErrorMessage(astErr);
      return NextResponse.json(
        { error: sanitized },
        { status: 422, headers: SECURITY_HEADERS }
      );
    }
  }

  // 7. Fallback / Mock Inference trigger (for timeout & resilience H-23 / H-25 verification)
  if (body.force_error) {
    return NextResponse.json(
      { error: { code: 'ForcedError', message: 'Simulated upstream failure' } },
      { status: 503, headers: SECURITY_HEADERS }
    );
  }

  if (body.force_slow_provider || getCircuitBreakerState() === 'OPEN') {
    const queryStr = typeof body.query === 'string' ? body.query : 'Product search';
    const fallback = generateDeterministicCatalogFallback(queryStr);
    return NextResponse.json(
      {
        success: true,
        fallback: true,
        circuit_state: getCircuitBreakerState(),
        data: {
          ...fallback,
          confidence: 0.3,
          provenance: 'deterministic_fallback',
        },
      },
      { status: 200, headers: SECURITY_HEADERS }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Inference request validated successfully',
    },
    { status: 200, headers: SECURITY_HEADERS }
  );
}

export const POST = withAuth(filterHandler, ['customer', 'vendor', 'admin']);
