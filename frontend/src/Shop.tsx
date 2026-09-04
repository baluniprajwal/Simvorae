import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { fetchJson } from './lib/api';
import { useToast } from './contexts/ToastContext';
import type {
  Product,
  ProductFiltersResponse,
  ProductsResponse,
} from './types/product';

gsap.registerPlugin(ScrollTrigger);

const prices = ['All', 'Under Rs. 40,000', 'Rs. 40,000 - Rs. 80,000', 'Over Rs. 80,000'];
const sortOptions = ['Featured', 'Price: Low to High', 'Price: High to Low'];

const splitWords = (text: string) => {
  return text.split(' ').map((word, index) => (
    <span key={index} className="inline-block mr-[0.25em] translate-y-full opacity-0">
      {word}
    </span>
  ));
};

function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative z-30 inline-block text-left" onMouseLeave={() => setIsOpen(false)}>
      <button
        type="button"
        className="filter-item cursor-pointer transition-all duration-500 ease-out border relative py-2 md:py-2.5 px-4 md:px-5 rounded-full overflow-hidden flex items-center justify-center gap-2 group border-stone-300/60 bg-[#fcfbf9] text-stone-500 hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
      >
        <span className="relative z-10 flex items-center gap-1">
          {label}: <span className="text-[#1a1a1a]">{value}</span>
          <ChevronDown
            size={12}
            strokeWidth={2}
            className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      <div
        className={`absolute top-full left-0 mt-2 w-48 origin-top-left rounded-[1rem] bg-[#fcfbf9] border border-stone-200 shadow-xl transition-all duration-300 overflow-hidden ${
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="py-2 flex flex-col max-h-64 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`text-left px-5 py-3 text-[9px] uppercase tracking-widest transition-colors hover:bg-stone-100 ${
                value === option ? 'text-[#1a1a1a] font-bold bg-stone-50' : 'text-stone-500'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  const container = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activePrice, setActivePrice] = useState('All');
  const [activeColor, setActiveColor] = useState('All');
  const [activeMaterial, setActiveMaterial] = useState('All');
  const [sortOrder, setSortOrder] = useState('Featured');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const { showError } = useToast();

  const categories = [
    { name: 'All', count: allProducts.length },
    ...availableCategories.map((name) => ({
      name,
      count: allProducts.filter((product) => product.category === name).length,
    })),
  ];

  const colors = ['All', ...availableColors];
  const materials = ['All', ...availableMaterials];

  const clearFilters = () => {
    setActiveCategory('All');
    setActivePrice('All');
    setActiveColor('All');
    setActiveMaterial('All');
    setSortOrder('Featured');
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadFilterData() {
      try {
        const [filtersResponse, allProductsResponse] = await Promise.all([
          fetchJson<ProductFiltersResponse>('/api/products/filters'),
          fetchJson<ProductsResponse>('/api/products'),
        ]);

        if (ignore) return;

        setAvailableCategories(filtersResponse.filters.categories);
        setAvailableColors(filtersResponse.filters.colors);
        setAvailableMaterials(filtersResponse.filters.materials);
        setAllProducts(allProductsResponse.products);
      } catch (error) {
        if (ignore) return;
        showError(error instanceof Error ? error.message : 'Failed to load catalog filters.');
      }
    }

    loadFilterData();

    return () => {
      ignore = true;
    };
  }, [showError]);

  useEffect(() => {
    let ignore = false;

    async function loadProducts() {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();

        if (searchQuery) params.set('search', searchQuery);
        if (activeCategory !== 'All') params.set('category', activeCategory);
        if (activeColor !== 'All') params.set('color', activeColor);
        if (activeMaterial !== 'All') params.set('material', activeMaterial);

        if (activePrice === 'Under Rs. 40,000') {
          params.set('maxPrice', '39999');
        } else if (activePrice === 'Rs. 40,000 - Rs. 80,000') {
          params.set('minPrice', '40000');
          params.set('maxPrice', '80000');
        } else if (activePrice === 'Over Rs. 80,000') {
          params.set('minPrice', '80001');
        }

        if (sortOrder === 'Price: Low to High') {
          params.set('sort', 'price_asc');
        } else if (sortOrder === 'Price: High to Low') {
          params.set('sort', 'price_desc');
        } else {
          params.set('sort', 'featured');
        }

        const response = await fetchJson<ProductsResponse>(`/api/products?${params.toString()}`);

        if (ignore) return;
        setProducts(response.products);
      } catch (error) {
        if (ignore) return;
        showError(error instanceof Error ? error.message : 'Failed to load products.');
        setProducts([]);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      ignore = true;
    };
  }, [activeCategory, activeColor, activeMaterial, activePrice, sortOrder, searchQuery, showError]);

  useGSAP(() => {
    const tl = gsap.timeline();

    tl.fromTo(
      '.nav-item',
      { y: -20, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        stagger: 0.1,
        ease: 'power3.out',
      },
    );

    tl.to(
      '.hero-title span',
      {
        y: 0,
        opacity: 1,
        duration: 1.2,
        stagger: 0.05,
        ease: 'power4.out',
      },
      '-=0.8',
    );

    tl.fromTo(
      '.filter-item',
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.05,
        ease: 'power3.out',
      },
      '-=1',
    );
  }, { scope: container });

  useGSAP(() => {
    if (!gridRef.current || isLoading) return;
    const cards = gsap.utils.toArray('.product-card');
    if (cards.length === 0) return;

    gsap.fromTo(
      cards,
      { y: 60, opacity: 0, scale: 0.98 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.85,
        stagger: 0.05,
        ease: 'power3.out',
        overwrite: true,
      },
    );
  }, [products, isLoading]);

  return (
    <div ref={container} className="bg-[#fcfbf9] text-[#1a1a1a] min-h-screen font-sans relative">
      <div
        className="pointer-events-none fixed inset-0 z-40 h-full w-full opacity-[0.035] mix-blend-overlay"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}
      />

      <Navbar />

      <section className="pt-32 md:pt-40 pb-12 md:pb-16 px-6 md:px-12 max-w-[1800px] mx-auto flex flex-col items-center relative z-40">
        <h1 className="hero-title font-serif text-[15vw] sm:text-[12vw] md:text-[8rem] lg:text-[10rem] leading-[0.85] tracking-tighter text-center mb-10 md:mb-12 overflow-hidden">
          {searchQuery ? splitWords(`Search: ${searchQuery}`) : splitWords('The Catalog')}
        </h1>

        <div className="flex flex-col gap-6 w-full items-center relative z-50">
          <div className="md:hidden w-full flex justify-center pb-4">
            <button
              onClick={() => setIsMobileFiltersOpen(true)}
              className="flex items-center gap-2 px-8 py-3 rounded-full border border-stone-300 font-sans text-[10px] uppercase tracking-widest font-semibold hover:border-[#1a1a1a] transition-colors"
            >
              <SlidersHorizontal size={14} />
              <span>Filters & Sort</span>
            </button>
          </div>

          <div className="hidden md:flex flex-col gap-6 w-full items-center">
            <div
              className="filters-container flex flex-wrap justify-center gap-3 md:gap-4 font-sans text-[9px] md:text-[10px] uppercase tracking-widest font-semibold w-full max-w-4xl relative z-20"
              style={{ minHeight: '60px' }}
            >
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`filter-item transition-colors duration-500 ease-out border relative py-3 px-6 rounded-full overflow-hidden flex items-center justify-center gap-2 group ${
                    activeCategory === cat.name
                      ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#fcfbf9]'
                      : 'border-stone-300/60 bg-transparent text-stone-500 hover:border-[#1a1a1a] hover:text-[#1a1a1a]'
                  }`}
                >
                  <div className="relative z-10 flex items-center gap-2">
                    <span>{cat.name}</span>
                    <span
                      className={`text-[9px] transition-colors duration-300 ${
                        activeCategory === cat.name
                          ? 'text-white/60'
                          : 'text-stone-400 group-hover:text-[#1a1a1a]/60'
                      }`}
                    >
                      ({cat.count})
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="filters-container flex flex-wrap justify-center gap-3 md:gap-4 font-sans text-[9px] md:text-[10px] uppercase tracking-widest font-semibold w-full relative z-30 pb-4">
              <FilterDropdown label="Price" options={prices} value={activePrice} onChange={setActivePrice} />
              <FilterDropdown label="Color" options={colors} value={activeColor} onChange={setActiveColor} />
              <FilterDropdown label="Material" options={materials} value={activeMaterial} onChange={setActiveMaterial} />

              <div className="w-[1px] h-6 bg-stone-300 mx-2 self-center" />

              <FilterDropdown label="Sort" options={sortOptions} value={sortOrder} onChange={setSortOrder} />
            </div>
          </div>
        </div>
      </section>

      <div
        className={`md:hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${
          isMobileFiltersOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileFiltersOpen(false)}
      />
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-[101] bg-[#fcfbf9] rounded-t-[2rem] overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.2,1,0.2,1)] ${
          isMobileFiltersOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex flex-col h-full max-h-[90vh]">
          <div className="flex justify-between items-center p-6 border-b border-stone-200">
            <h3 className="font-serif text-2xl">Filters & Sort</h3>
            <button
              onClick={() => setIsMobileFiltersOpen(false)}
              className="p-2 -mr-2 bg-stone-100 rounded-full text-stone-500 hover:text-[#1a1a1a] transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto p-6 flex flex-col gap-8 flex-1">
            <div>
              <h4 className="font-sans text-[10px] tracking-widest uppercase font-semibold text-stone-500 mb-4">Category</h4>
              <div className="flex flex-col gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`text-left flex justify-between items-center py-2 border-b transition-colors ${
                      activeCategory === cat.name
                        ? 'border-[#1a1a1a] text-[#1a1a1a] font-medium'
                        : 'border-stone-200 text-stone-500'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-[10px] opacity-60">({cat.count})</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-sans text-[10px] tracking-widest uppercase font-semibold text-stone-500 mb-4">Price</h4>
              <div className="flex flex-wrap gap-2">
                {prices.map((price) => (
                  <button
                    key={price}
                    onClick={() => setActivePrice(price)}
                    className={`px-4 py-2 border rounded-full text-xs transition-colors ${
                      activePrice === price
                        ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                        : 'border-stone-300 text-stone-600'
                    }`}
                  >
                    {price}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-sans text-[10px] tracking-widest uppercase font-semibold text-stone-500 mb-4">Color</h4>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setActiveColor(color)}
                    className={`px-4 py-2 border rounded-full text-xs transition-colors ${
                      activeColor === color
                        ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                        : 'border-stone-300 text-stone-600'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-sans text-[10px] tracking-widest uppercase font-semibold text-stone-500 mb-4">Sort By</h4>
              <div className="flex flex-col gap-2">
                {sortOptions.map((order) => (
                  <button
                    key={order}
                    onClick={() => setSortOrder(order)}
                    className={`text-left py-2 border-b transition-colors ${
                      sortOrder === order
                        ? 'border-[#1a1a1a] text-[#1a1a1a] font-medium'
                        : 'border-stone-200 text-stone-500'
                    }`}
                  >
                    {order}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-stone-200 bg-[#fcfbf9] flex gap-4">
            <button
              onClick={clearFilters}
              className="flex-1 py-4 border border-stone-300 rounded-[2rem] font-sans text-[10px] uppercase tracking-widest font-semibold hover:border-[#1a1a1a] transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setIsMobileFiltersOpen(false)}
              className="flex-[2] py-4 bg-[#1a1a1a] text-white rounded-[2rem] font-sans text-[10px] uppercase tracking-widest font-semibold hover:bg-black transition-colors"
            >
              View {products.length} Results
            </button>
          </div>
        </div>
      </div>

      <section className="px-6 md:px-12 pb-32 md:pb-48 max-w-[1800px] mx-auto min-h-screen">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-16 gap-x-8 md:gap-y-24 md:gap-x-12">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="rounded-[1rem] md:rounded-[1.5rem] aspect-[3/4] mb-6 bg-stone-200/70" />
                <div className="space-y-3 px-2">
                  <div className="h-6 w-3/4 bg-stone-200/70 rounded" />
                  <div className="h-4 w-1/2 bg-stone-200/70 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-16 gap-x-8 md:gap-y-24 md:gap-x-12">
            {products.map((product) => (
              <Link
                to={`/product/${product.slug}`}
                key={product._id}
                className="product-card group cursor-pointer relative flex flex-col block border-none outline-none"
              >
                <div className="overflow-hidden rounded-[1rem] md:rounded-[1.5rem] aspect-[3/4] mb-6 relative bg-stone-100/50 block">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,1,0.2,1)] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-[#1a1a1a]/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none z-10 mix-blend-multiply" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none z-10" />

                  <div className="absolute bottom-8 left-8 opacity-0 group-hover:opacity-100 transition-all duration-[0.8s] ease-out translate-y-8 group-hover:translate-y-0 text-white font-sans text-[10px] tracking-widest uppercase z-20 flex items-center gap-4">
                    <span>View Piece</span>
                    <div className="w-8 h-[1px] bg-white transition-all duration-700 ease-out group-hover:w-16" />
                  </div>
                </div>

                <div className="flex flex-col gap-3 font-sans px-2 transition-transform duration-700 ease-out group-hover:translate-x-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl md:text-2xl font-serif tracking-tight pr-4">{product.name}</h3>
                    <span className="text-[13px] font-light mt-1 whitespace-nowrap text-stone-600">
                      Rs. {product.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-4 h-[1px] bg-stone-300 transition-all duration-500 group-hover:w-8 group-hover:bg-[#1a1a1a]" />
                      <p className="text-[9px] tracking-[0.25em] uppercase transition-colors duration-500 text-stone-400 group-hover:text-[#1a1a1a]">
                        {product.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 mt-1">
                      <span className="text-[8px] tracking-widest uppercase text-stone-400">{product.material}</span>
                      <span className="w-1 h-1 rounded-full bg-stone-300" />
                      <span className="text-[8px] tracking-widest uppercase text-stone-400">{product.color}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && products.length === 0 && (
          <div className="w-full h-[30vh] flex flex-col items-center justify-center font-sans">
            <p className="text-stone-400 text-[10px] tracking-[0.25em] uppercase mb-4">No products found</p>
            <button
              onClick={clearFilters}
              className="text-[#1a1a1a] cursor-pointer text-[10px] tracking-widest uppercase border-b border-[#1a1a1a] pb-1 hover:text-stone-500 hover:border-stone-500 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </section>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 z-[60] w-12 h-12 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-xl hover:border-[#1a1a1a] transition-all duration-300 group active:scale-95"
        aria-label="Back to top"
      >
        <ChevronDown size={20} className="rotate-180 transition-transform group-hover:-translate-y-1" />
      </button>

      <Footer />
    </div>
  );
}
