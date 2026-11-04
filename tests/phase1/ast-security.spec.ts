import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateAndCompileFilterAST,
  ASTSecurityViolationError,
  type RawASTClause,
} from '@/lib/commercemind-ast';
import { dbSpy } from './helpers/db-spy';
import {
  FIELD_INJECTIONS,
  OP_INJECTIONS,
  VALUE_ATTACKS,
  MALICIOUS_VALID_SHAPE,
  VALID_AST,
} from './fixtures/security.fixtures';

describe('S1 — AST Security Suite (21 Cases)', () => {
  beforeEach(() => {
    dbSpy.reset();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Field Injection Vectors (Cases S1-01 to S1-10)
  // ---------------------------------------------------------------------------
  describe('Field Injection Vectors (10 cases)', () => {
    it('S1-01 rejects SQL injection in field name ("price; DROP TABLE products; --")', () => {
      const clause: RawASTClause = { field: FIELD_INJECTIONS[0], operator: 'eq', value: 100 };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-02 rejects trailing SQL comment in field name ("price--")', () => {
      const clause: RawASTClause = { field: FIELD_INJECTIONS[1], operator: 'eq', value: 100 };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-03 rejects unauthorized sensitive column traversal ("user.password")', () => {
      const clause: RawASTClause = { field: FIELD_INJECTIONS[2], operator: 'eq', value: 'secret' };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-04 rejects prototype pollution vector ("__proto__.isAdmin")', () => {
      const clause: RawASTClause = { field: FIELD_INJECTIONS[3], operator: 'eq', value: true };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-05 rejects constructor override vector ("attributes.__proto__.constructor")', () => {
      const clause: RawASTClause = { field: FIELD_INJECTIONS[4], operator: 'eq', value: 'evil' };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-06 rejects uppercase unnormalized field name ("PRICE")', () => {
      const clause: RawASTClause = { field: FIELD_INJECTIONS[5], operator: 'gte', value: 500 };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-07 rejects Cyrillic homoglyph character in field name ("prіce")', () => {
      const clause: RawASTClause = { field: FIELD_INJECTIONS[6], operator: 'lte', value: 1000 };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-08 rejects control characters and newlines in field name ("price\\n\\t")', () => {
      const clause: RawASTClause = { field: FIELD_INJECTIONS[7], operator: 'eq', value: 500 };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-09 rejects null field name', () => {
      const clause: RawASTClause = { field: FIELD_INJECTIONS[8], operator: 'eq', value: 100 };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-10 rejects empty string field name', () => {
      const clause: RawASTClause = { field: FIELD_INJECTIONS[9], operator: 'eq', value: 100 };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });
  });

  // ---------------------------------------------------------------------------
  // Operator Injection Vectors (Cases S1-11 to S1-15)
  // ---------------------------------------------------------------------------
  describe('Operator Injection Vectors (5 cases)', () => {
    it('S1-11 rejects ReDoS regex operator ("regex")', () => {
      const clause: RawASTClause = { field: 'category', operator: OP_INJECTIONS[0], value: '.*' };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-12 rejects MongoDB query operator ("$gt")', () => {
      const clause: RawASTClause = { field: 'price', operator: OP_INJECTIONS[1], value: 100 };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-13 rejects MongoDB logical operator ("$or")', () => {
      const clause: RawASTClause = { field: 'category', operator: OP_INJECTIONS[2], value: 'Fashion' };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-14 rejects arbitrary JS execution operator ("$where")', () => {
      const clause: RawASTClause = { field: 'price', operator: OP_INJECTIONS[3], value: '1==1' };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-15 rejects unauthorized SQL keyword operator ("MATCH")', () => {
      const clause: RawASTClause = { field: 'category', operator: OP_INJECTIONS[4], value: 'Shoes' };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });
  });

  // ---------------------------------------------------------------------------
  // Value / Type Confusion & DoS Vectors (Cases S1-16 to S1-20)
  // ---------------------------------------------------------------------------
  describe('Value & Type Confusion Vectors (5 cases)', () => {
    it('S1-16 rejects nested object / query selector inside value ({"$ne": null})', () => {
      const clause: RawASTClause = { ...VALUE_ATTACKS[0] };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-17 rejects non-finite numeric values (Infinity / NaN)', () => {
      const clause: RawASTClause = { ...VALUE_ATTACKS[1] };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-18 rejects string operator "contains" applied to numeric column "price"', () => {
      const clause: RawASTClause = { ...VALUE_ATTACKS[2] };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-19 rejects "in" operator with scalar non-array value', () => {
      const clause: RawASTClause = { ...VALUE_ATTACKS[3] };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });

    it('S1-20 rejects array bomb attack (> 100 items)', () => {
      const clause: RawASTClause = { ...VALUE_ATTACKS[4] };
      expect(() => validateAndCompileFilterAST([clause])).toThrow(ASTSecurityViolationError);
      dbSpy.assertZeroCalls();
    });
  });

  // ---------------------------------------------------------------------------
  // Parameterization Verification (Case S1-21)
  // ---------------------------------------------------------------------------
  describe('Reverse Test & Bound Parameterization (1 case)', () => {
    it('S1-21 accepts malicious SQL payload when placed strictly inside value as bound data', () => {
      // GIVEN a legitimate allowlisted field and operator with malicious text inside value
      const clause: RawASTClause = { ...MALICIOUS_VALID_SHAPE };

      // WHEN we compile the AST
      const compiled = validateAndCompileFilterAST([clause]);

      // THEN it does NOT throw, compiling it safely as a parameterized literal
      expect(compiled).toHaveLength(1);
      expect(compiled[0].field).toBe('category');
      expect(compiled[0].operator).toBe('eq');
      expect(compiled[0].value).toBe("'; DROP TABLE products; --");

      // Verify legitimate clean AST compiles properly as baseline
      const validCompiled = validateAndCompileFilterAST([VALID_AST]);
      expect(validCompiled).toHaveLength(1);
      expect(validCompiled[0].value).toBe(1000);
    });
  });
});

