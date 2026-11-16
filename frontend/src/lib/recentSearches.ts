export const RECENT_SEARCHES_KEY = 'simvorae_recent_searches';
const MAX_RECENT_SEARCHES = 5;

export function readRecentSearches(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter((item): item is string => typeof item === 'string' && !!item.trim() && item.length <= 200)
      .map((item) => item.trim()).slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

export function rememberSearch(value: string) {
  const query = value.trim();
  if (!query || query.length > 200) return;
  const previous = readRecentSearches().filter((item) => item.toLowerCase() !== query.toLowerCase());
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([query, ...previous].slice(0, MAX_RECENT_SEARCHES)));
  } catch {
    // Searching must still work when browser storage is unavailable.
  }
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // The overlay can still clear its visible history for this visit.
  }
}
