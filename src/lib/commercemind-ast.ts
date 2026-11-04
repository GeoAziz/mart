export class ASTSecurityViolationError extends Error {
  constructor(message: string) {
    super(`[ASTSecurityViolation] ${message}`);
    this.name = 'ASTSecurityViolationError';
  }
}

export const ALLOWLISTED_AST_FIELDS = new Set([
  'category',
  'subcategory',
  'price',
  'attributes.size',
  'attributes.color',
  'attributes.material',
  'attributes.style',
  'attributes.fit',
  'attributes.occasion',
]);

export const ALLOWLISTED_AST_OPERATORS = new Set([
  'eq',
  'neq',
  'in',
  'nin',
  'contains',
  'gte',
  'gt',
  'lte',
  'lt',
]);

export interface RawASTClause {
  field: string;
  operator: string;
  value: unknown;
}

export interface ValidatedASTClause {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'contains' | 'gte' | 'gt' | 'lte' | 'lt';
  value: string | number | boolean | Array<string | number>;
}

/**
 * Validates and compiles a Filter AST.
 * Enforces strict allowlists against SQL/NoSQL injection.
 * Throws ASTSecurityViolationError on any disallowed field or operator.
 */
export function validateAndCompileFilterAST(clauses: RawASTClause[]): ValidatedASTClause[] {
  const validated: ValidatedASTClause[] = [];

  for (const clause of clauses) {
    // 1. Validate Field
    if (!clause.field || typeof clause.field !== 'string') {
      throw new ASTSecurityViolationError('Missing or non-string AST field identifier');
    }
    // Reject fields containing whitespace, newlines, control characters, or prototype pollution attempts
    if (/[\s\r\n\t\0]/.test(clause.field) || clause.field.includes('__proto__') || clause.field.includes('constructor')) {
      throw new ASTSecurityViolationError(`Malformed or dangerous field identifier: "${clause.field}"`);
    }
    // Strict exact case match - uppercase/mixed-case like 'PRICE' is rejected
    const cleanField = clause.field;
    if (!ALLOWLISTED_AST_FIELDS.has(cleanField)) {
      throw new ASTSecurityViolationError(`Disallowed or unknown AST field: "${cleanField}"`);
    }

    // 2. Validate Operator
    if (!clause.operator || typeof clause.operator !== 'string') {
      throw new ASTSecurityViolationError('Missing or non-string AST operator');
    }
    const cleanOp = clause.operator.trim();
    if (!ALLOWLISTED_AST_OPERATORS.has(cleanOp)) {
      throw new ASTSecurityViolationError(`Disallowed AST operator: "${cleanOp}"`);
    }

    // 3. Validate Value Typing
    const val = clause.value;
    if (val === undefined || val === null) {
      throw new ASTSecurityViolationError(`AST clause for field "${cleanField}" cannot have null/undefined value`);
    }

    // Reject non-finite numbers (Infinity, -Infinity, NaN)
    if (typeof val === 'number' && !Number.isFinite(val)) {
      throw new ASTSecurityViolationError(`Numeric value for field "${cleanField}" must be a finite number`);
    }

    // Ensure numeric fields only receive numeric comparisons
    if (cleanField === 'price' && !['in', 'nin'].includes(cleanOp) && typeof val !== 'number') {
      throw new ASTSecurityViolationError(`Field "price" requires numeric value, received: ${typeof val}`);
    }

    if (['in', 'nin'].includes(cleanOp)) {
      if (!Array.isArray(val) || val.length === 0) {
        throw new ASTSecurityViolationError(`Operator "${cleanOp}" requires a non-empty array value`);
      }
      // Array bomb protection: maximum 100 elements
      if (val.length > 100) {
        throw new ASTSecurityViolationError(`Array size exceeds maximum limit of 100 items (got ${val.length})`);
      }
      for (const item of val) {
        if (typeof item !== 'string' && typeof item !== 'number') {
          throw new ASTSecurityViolationError(`Array elements for "${cleanOp}" must be string or number`);
        }
        if (typeof item === 'number' && !Number.isFinite(item)) {
          throw new ASTSecurityViolationError(`Array element for "${cleanOp}" must be finite number`);
        }
      }
    } else {
      if (typeof val !== 'string' && typeof val !== 'number' && typeof val !== 'boolean') {
        throw new ASTSecurityViolationError(`Scalar operator "${cleanOp}" requires string, number, or boolean value`);
      }
    }

    validated.push({
      field: cleanField,
      operator: cleanOp as ValidatedASTClause['operator'],
      value: val as ValidatedASTClause['value'],
    });
  }

  return validated;
}

