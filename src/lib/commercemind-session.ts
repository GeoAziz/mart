import type {
  CommerceMindShoppingInterpretation,
} from '@/lib/types';
import {
  validateAndCompileFilterAST,
  type ValidatedASTClause,
  type RawASTClause,
} from '@/lib/commercemind-ast';

export interface AccumulatedConstraints {
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  min_price: number | null;
  max_price: number | null;
  currency: 'KES' | 'USD';
  attributes: Record<string, string | number | boolean | Array<string | number>>;
  negative_materials: string[];
  semantic_tokens: string[];
  turn_count: number;
  last_query: string;
}

// In-memory session constraint cache with 30-minute TTL
interface CachedSession {
  constraints: AccumulatedConstraints;
  expiresAt: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000;
const sessionStore = new Map<string, CachedSession>();

/**
 * Retrieves existing session constraints or initializes fresh state
 */
export function getSessionConstraints(sessionId: string): AccumulatedConstraints {
  const cached = sessionStore.get(sessionId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.constraints;
  }

  return {
    category: null,
    subcategory: null,
    brand: null,
    min_price: null,
    max_price: null,
    currency: 'KES',
    attributes: {},
    negative_materials: [],
    semantic_tokens: [],
    turn_count: 0,
    last_query: '',
  };
}

/**
 * Persists session constraints with TTL
 */
export function saveSessionConstraints(sessionId: string, constraints: AccumulatedConstraints): void {
  sessionStore.set(sessionId, {
    constraints,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
}

/**
 * Merges multi-turn conversational constraints.
 * Turns refine or override specific dimensions without wiping existing context.
 */
export function mergeSessionConstraints(
  current: AccumulatedConstraints,
  interpretation: CommerceMindShoppingInterpretation,
  rawQuery: string
): AccumulatedConstraints {
  const updated: AccumulatedConstraints = {
    ...current,
    turn_count: current.turn_count + 1,
    last_query: rawQuery,
    attributes: { ...current.attributes },
    negative_materials: [...current.negative_materials],
    semantic_tokens: Array.from(
      new Set([...current.semantic_tokens, ...interpretation.semantic_search_tokens])
    ),
  };

  // 1. Category / Subcategory refinement
  if (interpretation.filter_ast.category) {
    updated.category = interpretation.filter_ast.category;
  }
  if (interpretation.filter_ast.subcategory) {
    updated.subcategory = interpretation.filter_ast.subcategory;
  }

  // 2. Budget updates (e.g. "actually under 4k" updates max_price)
  if (interpretation.budget_constraint.max_limit?.amount) {
    updated.max_price = interpretation.budget_constraint.max_limit.amount;
  }
  if (interpretation.budget_constraint.min_limit?.amount) {
    updated.min_price = interpretation.budget_constraint.min_limit.amount;
  }
  if (interpretation.budget_constraint.currency) {
    updated.currency = interpretation.budget_constraint.currency;
  }

  // 3. Attribute clauses (e.g. size, color, brand)
  for (const clause of interpretation.filter_ast.clauses || []) {
    if (clause.field === 'brand' && typeof clause.value === 'string') {
      updated.brand = clause.value;
    } else if (clause.operator === 'nin' && clause.field === 'attributes.material') {
      if (Array.isArray(clause.value)) {
        for (const item of clause.value) {
          const s = String(item).toLowerCase();
          if (!updated.negative_materials.includes(s)) {
            updated.negative_materials.push(s);
          }
        }
      }
    } else if (clause.field.startsWith('attributes.')) {
      const attrKey = clause.field.replace('attributes.', '');
      updated.attributes[attrKey] = clause.value;
    }
  }

  return updated;
}

/**
 * Compiles accumulated session constraints into a validated Filter AST
 */
export function compileSessionToAST(constraints: AccumulatedConstraints): ValidatedASTClause[] {
  const rawClauses: RawASTClause[] = [];

  if (constraints.category) {
    rawClauses.push({ field: 'category', operator: 'eq', value: constraints.category });
  }

  if (constraints.subcategory) {
    rawClauses.push({ field: 'subcategory', operator: 'eq', value: constraints.subcategory });
  }

  if (constraints.brand) {
    rawClauses.push({ field: 'brand', operator: 'eq', value: constraints.brand });
  }

  if (constraints.max_price !== null) {
    rawClauses.push({ field: 'price', operator: 'lte', value: constraints.max_price });
  }

  if (constraints.min_price !== null) {
    rawClauses.push({ field: 'price', operator: 'gte', value: constraints.min_price });
  }

  for (const [key, val] of Object.entries(constraints.attributes)) {
    rawClauses.push({
      field: `attributes.${key}`,
      operator: Array.isArray(val) ? 'in' : 'eq',
      value: val,
    });
  }

  if (constraints.negative_materials.length > 0) {
    rawClauses.push({
      field: 'attributes.material',
      operator: 'nin',
      value: constraints.negative_materials,
    });
  }

  return validateAndCompileFilterAST(rawClauses);
}

