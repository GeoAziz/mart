export const VALID_AST = { field: 'price', operator: 'gte', value: 1000 } as const;

export const FIELD_INJECTIONS = [
  'price; DROP TABLE products; --',
  'price--',
  'user.password',
  '__proto__.isAdmin',
  'attributes.__proto__.constructor',
  'PRICE',
  'pr\u0456ce', // Cyrillic і (homoglyph attack)
  'price\n\t',
  null as unknown as string,
  '',
] as const;

export const OP_INJECTIONS = ['regex', '$gt', '$or', '$where', 'MATCH', 'LIKE', 'DROP'] as const;

export const VALUE_ATTACKS = [
  { field: 'price', operator: 'eq', value: { $ne: null } },
  { field: 'price', operator: 'gte', value: Infinity },
  { field: 'price', operator: 'contains', value: 'cheap' },
  { field: 'category', operator: 'in', value: 'Footwear' }, // non-array for in
  { field: 'price', operator: 'in', value: Array(100_000).fill(0) }, // array bomb
] as const;

export const MALICIOUS_VALID_SHAPE = {
  field: 'category',
  operator: 'eq',
  value: "'; DROP TABLE products; --", // Value is treated as data, safe when parameterized
} as const;
