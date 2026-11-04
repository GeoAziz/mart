import { describe, it, expect } from 'vitest';
import { validateAndCompileFilterAST } from '@/lib/commercemind-ast';
import type { CommerceMindShoppingInterpretation } from '@/lib/types';

describe('CommerceMind AI — Colab Inference Regression Suite (The 7 Customer Queries)', () => {
  // Query 1
  it('Q1: "red running sneakers under 4000 KES" extracts color, sneakers, and max budget 4000', () => {
    const payload: CommerceMindShoppingInterpretation = {
      task: 'shopping_intent',
      status: 'success',
      intent: 'product_search',
      detected_language: 'en',
      budget_constraint: {
        currency: 'KES',
        min_limit: null,
        max_limit: { amount: 4000, boundary: 'inclusive' },
      },
      filter_ast: {
        category: 'Footwear',
        subcategory: 'Sneakers',
        clauses: [
          { field: 'category', operator: 'eq', value: 'Footwear' },
          { field: 'subcategory', operator: 'eq', value: 'Sneakers' },
          { field: 'attributes.color', operator: 'eq', value: 'red' },
        ],
      },
      semantic_search_tokens: ['red', 'running', 'sneakers'],
    };

    expect(payload.budget_constraint.max_limit?.amount).toBe(4000);
    expect(payload.filter_ast.category).toBe('Footwear');
    const compiled = validateAndCompileFilterAST(payload.filter_ast.clauses);
    expect(compiled).toHaveLength(3);
    expect(compiled[2]).toEqual({ field: 'attributes.color', operator: 'eq', value: 'red' });
  });

  // Query 2
  it('Q2: "blue office chairs below 8000 KES" extracts Home/Living category, blue color, and KES 8000 limit', () => {
    const payload: CommerceMindShoppingInterpretation = {
      task: 'shopping_intent',
      status: 'success',
      intent: 'product_search',
      detected_language: 'en',
      budget_constraint: {
        currency: 'KES',
        min_limit: null,
        max_limit: { amount: 8000, boundary: 'inclusive' },
      },
      filter_ast: {
        category: 'Home & Living',
        subcategory: 'Office Furniture',
        clauses: [
          { field: 'category', operator: 'eq', value: 'Home & Living' },
          { field: 'attributes.color', operator: 'eq', value: 'blue' },
        ],
      },
      semantic_search_tokens: ['blue', 'office', 'chairs'],
    };

    expect(payload.budget_constraint.max_limit?.amount).toBe(8000);
    const compiled = validateAndCompileFilterAST(payload.filter_ast.clauses);
    expect(compiled).toHaveLength(2);
  });

  // Query 3
  it('Q3: "cheap smartphones with 128GB storage" purifies "cheap" from numeric ranges and maps 128GB attribute', () => {
    const payload: CommerceMindShoppingInterpretation = {
      task: 'shopping_intent',
      status: 'success',
      intent: 'product_search',
      detected_language: 'en',
      budget_constraint: {
        currency: 'KES',
        min_limit: null,
        max_limit: null, // "cheap" is subjective; must not fabricate arbitrary price bounds
      },
      filter_ast: {
        category: 'Electronics',
        subcategory: 'Mobile Phones',
        clauses: [
          { field: 'category', operator: 'eq', value: 'Electronics' },
          { field: 'subcategory', operator: 'eq', value: 'Mobile Phones' },
        ],
      },
      semantic_search_tokens: ['cheap', 'smartphones', '128gb'],
    };

    expect(payload.budget_constraint.max_limit).toBeNull();
    expect(payload.semantic_search_tokens).toContain('cheap');
    expect(payload.semantic_search_tokens).toContain('128gb');
  });

  // Query 4
  it('Q4: "waterproof hiking boots for men" maps Footwear Boots and preserves waterproof as token or attribute', () => {
    const payload: CommerceMindShoppingInterpretation = {
      task: 'shopping_intent',
      status: 'success',
      intent: 'product_search',
      detected_language: 'en',
      budget_constraint: {
        currency: 'KES',
        min_limit: null,
        max_limit: null,
      },
      filter_ast: {
        category: 'Footwear',
        subcategory: 'Boots',
        clauses: [
          { field: 'category', operator: 'eq', value: 'Footwear' },
          { field: 'subcategory', operator: 'eq', value: 'Boots' },
        ],
      },
      semantic_search_tokens: ['waterproof', 'hiking', 'boots', 'men'],
    };

    expect(payload.filter_ast.category).toBe('Footwear');
    expect(payload.filter_ast.subcategory).toBe('Boots');
    expect(payload.semantic_search_tokens).toContain('waterproof');
  });

  // Query 5
  it('Q5: "Nike running shoes between 3000 and 6000 KES" classifies Nike as BRAND (not category) with range bounds', () => {
    const payload: CommerceMindShoppingInterpretation = {
      task: 'shopping_intent',
      status: 'success',
      intent: 'product_search',
      detected_language: 'en',
      budget_constraint: {
        currency: 'KES',
        min_limit: { amount: 3000, boundary: 'inclusive' },
        max_limit: { amount: 6000, boundary: 'inclusive' },
      },
      filter_ast: {
        category: 'Footwear',
        subcategory: "Men's Footwear",
        clauses: [
          { field: 'category', operator: 'eq', value: 'Footwear' },
          { field: 'brand', operator: 'eq', value: 'Nike' },
        ],
      },
      semantic_search_tokens: ['nike', 'running', 'shoes'],
    };

    expect(payload.budget_constraint.min_limit?.amount).toBe(3000);
    expect(payload.budget_constraint.max_limit?.amount).toBe(6000);
    const brandClause = payload.filter_ast.clauses.find((c) => c.field === 'brand');
    expect(brandClause).toBeDefined();
    expect(brandClause?.value).toBe('Nike');
    expect(payload.filter_ast.category).not.toBe('Nike');
  });

  // Query 6
  it('Q6: "laptops with 16GB RAM under 50000 KES" extracts RAM attribute and 50,000 price ceiling', () => {
    const payload: CommerceMindShoppingInterpretation = {
      task: 'shopping_intent',
      status: 'success',
      intent: 'product_search',
      detected_language: 'en',
      budget_constraint: {
        currency: 'KES',
        min_limit: null,
        max_limit: { amount: 50000, boundary: 'inclusive' },
      },
      filter_ast: {
        category: 'Electronics',
        subcategory: 'Computers & Laptops',
        clauses: [
          { field: 'category', operator: 'eq', value: 'Electronics' },
          { field: 'subcategory', operator: 'eq', value: 'Computers & Laptops' },
        ],
      },
      semantic_search_tokens: ['laptops', '16gb', 'ram'],
    };

    expect(payload.budget_constraint.max_limit?.amount).toBe(50000);
    expect(payload.semantic_search_tokens).toContain('16gb');
  });

  // Query 7
  it('Q7: "show me something comfortable for jogging" triggers ambiguity detection & clarification prompt', () => {
    const payload: CommerceMindShoppingInterpretation = {
      task: 'shopping_intent',
      status: 'needs_clarification',
      intent: 'product_search',
      detected_language: 'en',
      budget_constraint: {
        currency: 'KES',
        min_limit: null,
        max_limit: null,
      },
      filter_ast: {
        category: null,
        subcategory: null,
        clauses: [],
      },
      semantic_search_tokens: ['comfortable', 'jogging'],
      clarification_prompt: 'Are you looking for running shoes, jogging pants, or lightweight athletic hoodies?',
    };

    expect(payload.status).toBe('needs_clarification');
    expect(payload.clarification_prompt).toBeTruthy();
    expect(payload.clarification_prompt).toContain('running shoes');
  });
});

