type SearchableProduct = {
  name: string;
  category: string;
  description?: string;
  material: string;
  color: string;
};

// Mirrors the server's product search (case-insensitive match on name, category, description,
// material or colour) so the category counts can describe the results actually on screen.
export function matchesSearch(product: SearchableProduct, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return [product.name, product.category, product.description, product.material, product.color]
    .some((field) => String(field || '').toLowerCase().includes(needle));
}

// Category buttons with counts. While searching, counts cover only the matching products, so
// "All (1)" matches the single bag on screen instead of the whole catalog.
export function getCategoryCounts<T extends SearchableProduct>(products: T[], categoryNames: string[], query: string) {
  const matching = products.filter((product) => matchesSearch(product, query));

  return [
    { name: 'All', count: matching.length },
    ...categoryNames.map((name) => ({
      name,
      count: matching.filter((product) => product.category === name).length,
    })),
  ];
}
