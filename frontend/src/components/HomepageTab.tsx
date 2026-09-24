import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Check, Eye, EyeOff, Plus, Search, Sliders, X } from 'lucide-react';
import api from '../lib/api';
import type { ProductStoreItem } from '../store/productStore';
import { useToast } from '../contexts/ToastContext';

type SectionKey = 'signatureSilhouettes' | 'artisanCrafted' | 'everydayCarry';
type HomepageSections = Record<SectionKey, string[]>;
type SectionSettings = { enabled: boolean; title: string; subtitle: string; description: string };
type HomepageSettings = Record<SectionKey, SectionSettings>;
type HomepageResponse = { sections: HomepageSections; settings: HomepageSettings };

const sectionDefinitions: Array<{ key: SectionKey; adminTitle: string; eyebrow: string; layout: string; slots: number }> = [
  { key: 'signatureSilhouettes', adminTitle: 'Signature Silhouettes', eyebrow: 'Section 01', layout: 'Editorial product grid', slots: 5 },
  { key: 'artisanCrafted', adminTitle: 'The Archive', eyebrow: 'Section 02', layout: 'Asymmetric archive layout', slots: 3 },
  { key: 'everydayCarry', adminTitle: 'Permanent Collection', eyebrow: 'Section 03', layout: 'Dark collection layout', slots: 4 },
];

const emptySections = (): HomepageSections => ({ signatureSilhouettes: [], artisanCrafted: [], everydayCarry: [] });
const defaultSettings = (): HomepageSettings => ({
  signatureSilhouettes: { enabled: true, title: 'Signature', subtitle: 'Silhouettes.', description: 'Discover iconic handbags that blend premium leatherwork with contemporary architectural forms.' },
  artisanCrafted: { enabled: true, title: 'Artisan', subtitle: 'Crafted.', description: 'A continuous study of premium leather and structural utility. Discover handbags designed to develop character and outlast passing seasons.' },
  everydayCarry: { enabled: true, title: 'Everyday', subtitle: 'Carry.', description: 'Foundation bags engineered to safely hold your essentials. From spacious totes to compact crossbodys.' },
});
const formatPrice = (price: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);

const slotGridClass: Record<SectionKey, string> = {
  signatureSilhouettes: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-12',
  artisanCrafted: 'grid-cols-1 md:grid-cols-12',
  everydayCarry: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-12',
};

function getSlotCardClass(section: SectionKey, slot: number) {
  if (section === 'signatureSilhouettes') {
    return slot === 0 ? 'xl:col-span-6 xl:row-span-2' : 'xl:col-span-3';
  }
  if (section === 'artisanCrafted') {
    return slot === 0 ? 'md:col-span-5 md:row-span-2' : 'md:col-span-7';
  }
  if (slot === 0) return 'xl:col-span-5 xl:col-start-1 xl:row-span-2 xl:row-start-1';
  if (slot === 1) return 'xl:col-span-7 xl:col-start-6 xl:row-start-1';
  if (slot === 2) return 'xl:col-span-3 xl:col-start-6 xl:row-start-2';
  return 'xl:col-span-4 xl:col-start-9 xl:row-start-2';
}

function getSlotImageClass(section: SectionKey, slot: number) {
  if (section === 'artisanCrafted' && slot > 0) return 'aspect-[16/9]';
  if (section === 'everydayCarry' && slot === 1) return 'aspect-[16/9]';
  return 'aspect-[4/5]';
}

function ProductSelectorModal({ products, sectionName, slot, currentProductId, usedProductIds, onClose, onConfirm }: {
  products: ProductStoreItem[];
  sectionName: string;
  slot: number;
  currentProductId: string;
  usedProductIds: Set<string>;
  onClose: () => void;
  onConfirm: (productId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedId, setSelectedId] = useState(currentProductId);

  useEffect(() => {
    const rootElement = document.documentElement;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = rootElement.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const scrollY = window.scrollY;

    document.body.style.overflow = 'hidden';
    rootElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    rootElement.dataset.scrollLocked = 'true';
    window.dispatchEvent(new Event('simvorae-scroll-lock-change'));

    return () => {
      document.body.style.overflow = previousOverflow;
      rootElement.style.overflow = previousRootOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      delete rootElement.dataset.scrollLocked;
      window.dispatchEvent(new Event('simvorae-scroll-lock-change'));
      window.scrollTo(0, scrollY);
    };
  }, []);

  const categories = ['All', ...Array.from(new Set(products.map((product) => product.category)))];
  const query = search.trim().toLowerCase();
  const filteredProducts = products.filter((product) => (
    (category === 'All' || product.category === category)
    && `${product.name} ${product.category} ${product.material} ${product.color}`.toLowerCase().includes(query)
  ));
  const selectedProduct = products.find((product) => product.id === selectedId);

  return (
    <div data-lenis-prevent className="fixed inset-0 z-[120] flex items-center justify-center overscroll-contain p-4 md:p-6">
      <motion.button type="button" aria-label="Close product selector" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#1a1a1a]/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 10 }} transition={{ duration: 0.2 }} className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden border border-stone-200 bg-[#fcfbf9] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white p-6">
          <div><span className="mb-1 block font-sans text-[9px] uppercase tracking-widest text-stone-500">{sectionName} &bull; Slot {String(slot + 1).padStart(2, '0')}</span><h3 className="font-serif text-2xl text-[#1a1a1a]">Select Showcase Product</h3></div>
          <button type="button" onClick={onClose} className="p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-[#1a1a1a]" aria-label="Close"><X size={18} /></button>
        </div>
        <div data-lenis-prevent className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto overscroll-contain lg:grid-cols-12 lg:overflow-hidden">
          <div className="flex min-h-[420px] flex-col border-b border-stone-200 bg-white p-6 lg:col-span-7 lg:border-b-0 lg:border-r">
            <div className="mb-4 flex shrink-0 flex-col gap-3">
              <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, material or color" className="w-full border border-stone-200 bg-white py-2.5 pl-9 pr-4 font-sans text-[11px] outline-none focus:border-[#1a1a1a]" /></div>
              <div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap border px-3 py-1.5 font-sans text-[9px] uppercase tracking-widest transition-colors ${category === item ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white' : 'border-stone-200 bg-white text-stone-500 hover:border-stone-400'}`}>{item}</button>)}</div>
            </div>
            <div data-lenis-prevent className="flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
              {filteredProducts.map((product) => {
                const isCurrent = product.id === currentProductId;
                const isSelected = product.id === selectedId;
                const isUsedElsewhere = usedProductIds.has(product.id) && !isCurrent;
                return (
                  <button type="button" key={product.id} disabled={!product.isActive || isUsedElsewhere} onClick={() => setSelectedId(product.id)} className={`flex w-full items-center justify-between border p-3 text-left transition-colors ${isSelected ? 'border-[#1a1a1a] bg-stone-50 ring-1 ring-[#1a1a1a]' : 'border-stone-200 bg-white hover:border-stone-400'} disabled:cursor-not-allowed disabled:opacity-50`}>
                    <div className="flex min-w-0 items-center gap-3"><div className="h-14 w-12 shrink-0 overflow-hidden border border-stone-200 bg-stone-100">{product.image && <img src={product.image} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="truncate font-serif text-[13px] text-[#1a1a1a]">{product.name}</h4>{isCurrent && <span className="border border-stone-200 bg-stone-100 px-1.5 py-0.5 font-sans text-[8px] uppercase tracking-widest text-stone-500">Current</span>}{isUsedElsewhere && <span className="border border-stone-200 bg-stone-100 px-1.5 py-0.5 font-sans text-[8px] uppercase tracking-widest text-stone-500">Other Slot</span>}{!product.isActive && <span className="border border-stone-200 bg-stone-100 px-1.5 py-0.5 font-sans text-[8px] uppercase tracking-widest text-stone-500">Hidden</span>}</div><p className="mt-1 truncate font-sans text-[10px] text-stone-500">{product.category} &bull; {product.material} &bull; {product.color}</p><p className="mt-1 font-sans text-[10px] text-[#1a1a1a]">{formatPrice(product.price)} &bull; Stock {product.stockQuantity}</p></div></div>
                    <span className={`ml-3 flex h-5 w-5 shrink-0 items-center justify-center border ${isSelected ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white' : 'border-stone-300 bg-white'}`}>{isSelected && <Check size={12} strokeWidth={3} />}</span>
                  </button>
                );
              })}
              {filteredProducts.length === 0 && <div className="py-12 text-center font-sans text-[11px] text-stone-400">No products match these filters.</div>}
            </div>
          </div>
          <div className="flex flex-col justify-between bg-stone-50 p-6 lg:col-span-5 lg:overflow-y-auto">
            <div><span className="mb-2 block font-sans text-[9px] uppercase tracking-widest text-stone-500">Slot Preview</span>{selectedProduct ? <div className="border border-stone-200 bg-white p-3"><div className="mb-3 aspect-[4/5] overflow-hidden bg-stone-100"><img src={selectedProduct.image} alt={selectedProduct.name} className="h-full w-full object-cover" /></div><div className="flex items-start justify-between gap-3"><div><p className="font-sans text-[9px] uppercase tracking-widest text-stone-400">{selectedProduct.category}</p><h5 className="mt-1 font-serif text-base text-[#1a1a1a]">{selectedProduct.name}</h5><p className="mt-1 font-sans text-[10px] text-stone-500">{selectedProduct.material} &bull; {selectedProduct.color}</p></div><span className="whitespace-nowrap font-sans text-[11px] text-[#1a1a1a]">{formatPrice(selectedProduct.price)}</span></div></div> : <div className="border border-dashed border-stone-300 bg-white p-8 text-center font-sans text-[11px] text-stone-400">Select a product from the catalog.</div>}</div>
            <div className="mt-6 flex justify-end gap-3 border-t border-stone-200 pt-5"><button type="button" onClick={onClose} className="border border-stone-200 bg-white px-4 py-2.5 font-sans text-[9px] uppercase tracking-widest text-stone-600 hover:bg-stone-50">Cancel</button><button type="button" disabled={!selectedId} onClick={() => onConfirm(selectedId)} className="bg-[#1a1a1a] px-5 py-2.5 font-sans text-[9px] uppercase tracking-widest text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40">Select Product</button></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function HomepageTab({ products, onAddProduct }: { products: ProductStoreItem[]; onAddProduct: () => void }) {
  const { showError, showSuccess } = useToast();
  const [sections, setSections] = useState<HomepageSections>(emptySections());
  const [settings, setSettings] = useState<HomepageSettings>(defaultSettings());
  const [activeSection, setActiveSection] = useState<SectionKey>('signatureSilhouettes');
  const [isEditingHeadings, setIsEditingHeadings] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api.get<HomepageResponse>('/api/products/admin/homepage')
      .then(({ data }) => {
        if (!isMounted) return;
        setSections(data.sections);
        setSettings(data.settings);
      })
      .catch((error) => {
        if (isMounted) showError(error.response?.data?.message || 'Homepage showcase could not be loaded.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, [showError]);

  const definition = sectionDefinitions.find((item) => item.key === activeSection) ?? sectionDefinitions[0];
  const activeSettings = settings[activeSection];

  const updateSlot = (slot: number, productId: string) => {
    setSections((current) => {
      const next = [...current[activeSection]];
      next[slot] = productId;
      return { ...current, [activeSection]: next };
    });
  };

  const updateSetting = <Key extends keyof SectionSettings>(key: Key, value: SectionSettings[Key]) => {
    setSettings((current) => ({ ...current, [activeSection]: { ...current[activeSection], [key]: value } }));
  };

  const saveHomepage = async () => {
    try {
      setIsSaving(true);
      const { data } = await api.put<HomepageResponse>('/api/products/admin/homepage', { sections, settings });
      setSections(data.sections);
      setSettings(data.settings);
      setIsEditingHeadings(false);
      showSuccess('Homepage showcase updated.');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Homepage showcase could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 [&_a]:cursor-pointer [&_button:not(:disabled)]:cursor-pointer">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1a1a1a] md:text-4xl">Homepage Showcase</h1>
          <p className="mt-2 font-sans text-[10px] uppercase tracking-widest text-stone-500">Control storefront sections, headings and featured product placement.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onAddProduct} className="flex items-center gap-2 border border-stone-200 bg-white px-5 py-3 font-sans text-[9px] uppercase tracking-widest transition-colors hover:bg-stone-50"><Plus size={12} /> Add Product</button>
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 border border-stone-200 bg-white px-5 py-3 font-sans text-[9px] uppercase tracking-widest transition-colors hover:bg-stone-50">View Storefront <ArrowUpRight size={12} /></a>
          <button type="button" disabled={isLoading || isSaving} onClick={() => void saveHomepage()} className="bg-[#1a1a1a] px-6 py-3 font-sans text-[9px] uppercase tracking-widest text-[#fcfbf9] transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? 'Saving' : 'Save Changes'}</button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {sectionDefinitions.map((item) => {
          const selected = item.key === activeSection;
          const sectionSettings = settings[item.key];
          return (
            <button type="button" key={item.key} onClick={() => { setActiveSection(item.key); setIsEditingHeadings(false); }} className={`relative border bg-white p-6 text-left transition-colors ${selected ? 'border-[#1a1a1a] ring-1 ring-[#1a1a1a]' : 'border-stone-200 hover:border-stone-400'}`}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <span className="font-sans text-[9px] uppercase tracking-widest text-stone-500">{item.eyebrow}</span>
                <span className={`border px-2 py-1 font-sans text-[8px] uppercase tracking-widest ${sectionSettings.enabled ? 'border-green-100 bg-green-50 text-green-700' : 'border-stone-200 bg-stone-100 text-stone-500'}`}>{sectionSettings.enabled ? 'Active' : 'Hidden'}</span>
              </div>
              <h2 className="font-serif text-xl text-[#1a1a1a]">{item.adminTitle}</h2>
              <p className="mt-2 font-sans text-[10px] text-stone-500">{item.layout} &bull; {item.slots} products</p>
            </button>
          );
        })}
      </div>

      <section className="border border-stone-200 bg-white">
        <div className="flex flex-col gap-5 border-b border-stone-100 bg-stone-50/50 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 font-sans text-[9px] uppercase tracking-widest text-stone-400">{definition.eyebrow} &bull; {definition.layout}</p>
            <h2 className="font-serif text-2xl text-[#1a1a1a]">{activeSettings.title} <span className="italic text-stone-400">{activeSettings.subtitle}</span></h2>
            <p className="mt-2 max-w-2xl font-sans text-[10px] leading-relaxed text-stone-500">{activeSettings.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setIsEditingHeadings((current) => !current)} className="flex items-center gap-2 border border-stone-200 bg-white px-4 py-2.5 font-sans text-[9px] uppercase tracking-widest transition-colors hover:border-stone-400"><Sliders size={12} /> {isEditingHeadings ? 'Close Form' : 'Edit Headings'}</button>
            <button type="button" onClick={() => updateSetting('enabled', !activeSettings.enabled)} className={`flex items-center gap-2 border px-4 py-2.5 font-sans text-[9px] uppercase tracking-widest transition-colors ${activeSettings.enabled ? 'border-green-100 bg-green-50 text-green-700' : 'border-stone-200 bg-stone-100 text-stone-500'}`}>
              {activeSettings.enabled ? <Eye size={12} /> : <EyeOff size={12} />}{activeSettings.enabled ? 'Visible on Home' : 'Hidden from Home'}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isEditingHeadings && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-b border-stone-100">
              <div className="grid gap-5 p-6 md:grid-cols-2">
                <label className="font-sans text-[9px] uppercase tracking-widest text-stone-500">Primary Title<input value={activeSettings.title} maxLength={80} onChange={(event) => updateSetting('title', event.target.value)} className="mt-2 w-full border border-stone-200 bg-white p-3 font-sans text-[11px] normal-case tracking-normal text-[#1a1a1a] outline-none focus:border-[#1a1a1a]" /></label>
                <label className="font-sans text-[9px] uppercase tracking-widest text-stone-500">Accent Title<input value={activeSettings.subtitle} maxLength={80} onChange={(event) => updateSetting('subtitle', event.target.value)} className="mt-2 w-full border border-stone-200 bg-white p-3 font-sans text-[11px] normal-case tracking-normal text-[#1a1a1a] outline-none focus:border-[#1a1a1a]" /></label>
                <label className="font-sans text-[9px] uppercase tracking-widest text-stone-500 md:col-span-2">Description<textarea value={activeSettings.description} maxLength={240} rows={3} onChange={(event) => updateSetting('description', event.target.value)} className="mt-2 w-full resize-none border border-stone-200 bg-white p-3 font-sans text-[11px] normal-case leading-relaxed tracking-normal text-[#1a1a1a] outline-none focus:border-[#1a1a1a]" /></label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><p className="font-sans text-[9px] uppercase tracking-widest text-stone-400">Showcase Slots</p><h3 className="mt-1 font-serif text-xl text-[#1a1a1a]">Product Placement</h3></div>
            <span className="font-sans text-[9px] uppercase tracking-widest text-stone-400">{definition.slots} required</span>
          </div>
          <div className={`grid gap-5 ${slotGridClass[activeSection]}`}>
            {Array.from({ length: definition.slots }, (_, slot) => {
              const selectedId = sections[activeSection][slot] || '';
              const product = products.find((item) => item.id === selectedId);
              return (
                <article key={slot} className={`flex flex-col border border-stone-200 bg-white p-4 transition-colors hover:border-stone-400 ${getSlotCardClass(activeSection, slot)}`}>
                  <div className="mb-3 flex items-center justify-between gap-3"><span className="font-sans text-[9px] uppercase tracking-widest text-stone-500">Slot {String(slot + 1).padStart(2, '0')}</span>{slot === 0 && <span className="bg-stone-100 px-2 py-1 font-sans text-[8px] uppercase tracking-widest text-stone-500">Lead</span>}</div>
                  <div className={`mb-4 overflow-hidden bg-stone-100 ${getSlotImageClass(activeSection, slot)}`}>{product?.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-sans text-[10px] text-stone-400">Choose a product</div>}</div>
                  <div className="min-h-20 flex-1">
                    <h4 className="font-serif text-base text-[#1a1a1a]">{product?.name || 'Unassigned'}</h4>
                    <p className="mt-1 font-sans text-[10px] text-stone-500">{product ? `${product.category} · ${product.material} · ${product.color}` : 'Select an active catalog product'}</p>
                    {product && <div className="mt-2 flex items-center justify-between gap-3 font-sans text-[10px]"><span>{formatPrice(product.price)}</span><span className="text-stone-400">Stock {product.stockQuantity}</span></div>}
                  </div>
                  <button type="button" disabled={isLoading} onClick={() => setActiveSlot(slot)} className="mt-4 w-full border border-stone-200 bg-white px-3 py-2.5 font-sans text-[9px] uppercase tracking-widest transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50">Change Product</button>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <AnimatePresence>
        {activeSlot !== null && (
          <ProductSelectorModal
            key={`${activeSection}-${activeSlot}`}
            products={products}
            sectionName={definition.adminTitle}
            slot={activeSlot}
            currentProductId={sections[activeSection][activeSlot] || ''}
            usedProductIds={new Set(sections[activeSection])}
            onClose={() => setActiveSlot(null)}
            onConfirm={(productId) => {
              updateSlot(activeSlot, productId);
              setActiveSlot(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
