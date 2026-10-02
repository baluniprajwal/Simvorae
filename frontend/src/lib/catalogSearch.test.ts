import { describe, expect, it } from 'vitest';
import { getCategoryCounts, matchesSearch } from './catalogSearch';

const products = [
  { name: 'The Drape Tote', category: 'Tote', material: 'Calfskin', color: 'Black', description: '' },
  { name: 'Mini Clutch', category: 'Clutch', material: 'Satin', color: 'Ivory', description: 'An evening piece' },
  { name: 'Weekender', category: 'Travel', material: 'Canvas', color: 'Tan', description: 'Roomy enough to use as a tote' },
];

describe('catalog search counts', () => {
  it('counts only matching products while a search is active', () => {
    expect(getCategoryCounts(products, ['Tote', 'Clutch', 'Travel'], 'tote')).toEqual([
      { name: 'All', count: 2 },
      { name: 'Tote', count: 1 },
      { name: 'Clutch', count: 0 },
      { name: 'Travel', count: 1 },
    ]);
  });

  it('counts the whole catalog when there is no search', () => {
    expect(getCategoryCounts(products, ['Tote', 'Clutch', 'Travel'], '  ')[0]).toEqual({ name: 'All', count: 3 });
  });

  it('matches name, category, description, material and colour without caring about case', () => {
    expect(matchesSearch(products[1], 'IVORY')).toBe(true);
    expect(matchesSearch(products[1], 'evening')).toBe(true);
    expect(matchesSearch(products[1], 'tote')).toBe(false);
  });
});
