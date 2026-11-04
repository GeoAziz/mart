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
    const cleanField = clause.field.trim();
    if (!ALLOWLISTED_AST_FIELDS.has(cleanField)) {
      throw new ASTSecurityViolationError(`Disallowed or unknown AST field: "${cleanField}"`);
    }

    // 2. Validate Operator
    if (!clause.operator || typeof clause.operator !== 'string') {
      throw new ASTSecurityViolationError('Missing or non-string AST operator');
    }
    const cleanOp = clause.operator.trim().toLowerCase();
    if (!ALLOWLISTED_AST_OPERATORS.has(cleanOp)) {
      throw new ASTSecurityViolationError(`Disallowed AST operator: "${cleanOp}"`);
    }

    // 3. Validate Value Typing
    const val = clause.value;
    if (val === undefined || val === null) {
      throw new ASTSecurityViolationError(`AST clause for field "${cleanField}" cannot have null/undefined value`);
    }

    if (['in', 'nin'].includes(cleanOp)) {
      if (!Array.isArray(val) || val.length === 0) {
        throw new ASTSecurityViolationError(`Operator "${cleanOp}" requires a non-empty array value`);
      }
      for (const item of val) {
        if (typeof item !== 'string' && typeof item !== 'number') {
          throw new ASTSecurityViolationError(`Array elements for "${cleanOp}" must be string or number`);
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

