import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RECENT_SEARCHES_KEY, clearRecentSearches, readRecentSearches, rememberSearch } from './recentSearches';

beforeEach(() => localStorage.removeItem(RECENT_SEARCHES_KEY));
afterEach(() => { vi.restoreAllMocks(); localStorage.removeItem(RECENT_SEARCHES_KEY); });

describe('recent searches', () => {
  it('remembers only five submitted searches, most recent first', () => {
    for (const query of ['one', 'two', 'three', 'four', 'five', 'six']) rememberSearch(query);
    expect(readRecentSearches()).toEqual(['six', 'five', 'four', 'three', 'two']);
  });

  it('trims and deduplicates case-insensitively', () => {
    rememberSearch('tote');
    rememberSearch('black');
    rememberSearch(' Tote ');
    expect(readRecentSearches()).toEqual(['Tote', 'black']);
  });

  it('ignores blank or oversized terms', () => {
    rememberSearch(' ');
    rememberSearch('a'.repeat(201));
    expect(readRecentSearches()).toEqual([]);
  });

  it('handles malformed or unexpected saved data safely', () => {
    localStorage.setItem(RECENT_SEARCHES_KEY, '{');
    expect(readRecentSearches()).toEqual([]);
    localStorage.setItem(RECENT_SEARCHES_KEY, '{}');
    expect(readRecentSearches()).toEqual([]);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([null, 4, '', '  ', 'tote', {}]));
    expect(readRecentSearches()).toEqual(['tote']);
  });

  it('does not throw when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readRecentSearches()).toEqual([]);
    expect(() => rememberSearch('tote')).not.toThrow();
    expect(() => clearRecentSearches()).not.toThrow();
  });

  it('clears history', () => {
    rememberSearch('tote');
    clearRecentSearches();
    expect(readRecentSearches()).toEqual([]);
  });
});
