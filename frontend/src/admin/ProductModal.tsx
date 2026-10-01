import { type ChangeEvent, type DragEvent, type FormEvent, useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import type { ProductFormState } from './types';

export default function ProductModal({
  mode,
  form,
  onClose,
  onSubmit,
  onChange,
  onImageFilesAdd,
  onImageRemove,
  isUploading,
}: {
  mode: 'add' | 'edit';
  form: ProductFormState;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (field: keyof ProductFormState, value: string | number | string[] | boolean) => void;
  onImageFilesAdd: (files: FileList) => void;
  onImageRemove: (index: number) => void;
  isUploading: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    if (files?.length) {
      onImageFilesAdd(files);
    }
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files?.length) {
      onImageFilesAdd(files);
    }
  };

  const setCoverImage = (index: number) => {
    const nextImages = [...form.images];
    const [selectedImage] = nextImages.splice(index, 1);
    if (selectedImage) {
      onChange('images', [selectedImage, ...nextImages]);
    }
  };

  return (
    <div
      data-lenis-prevent
      onWheel={(event) => event.preventDefault()}
      onTouchMove={(event) => event.preventDefault()}
      className="fixed inset-0 z-[200] flex items-center justify-center overscroll-contain bg-[#1a1a1a]/60 p-4 backdrop-blur-sm md:p-8"
    >
      <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden border border-stone-200 bg-[#fcfbf9]">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white p-6">
          <h3 className="font-serif text-2xl text-[#1a1a1a]">{mode === 'add' ? 'Add New Product' : 'Edit Product'}</h3>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-full p-2 transition-colors hover:bg-stone-100">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div
          data-lenis-prevent
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
          className="admin-scrollbar flex-1 overscroll-contain overflow-y-auto p-6 md:p-8"
        >
          <form id="productForm" onSubmit={onSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <section className="space-y-4 border border-stone-200 bg-white p-6">
                <h4 className="mb-4 border-b border-stone-100 pb-2 font-sans text-[10px] font-semibold uppercase tracking-widest text-stone-400">Basic Information</h4>

                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Product Name</label>
                  <input required type="text" value={form.name} onChange={(event) => onChange('name', event.target.value)} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="e.g. The Drape Tote" />
                </div>

                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Description</label>
                  <textarea rows={4} value={form.description} onChange={(event) => onChange('description', event.target.value)} className="w-full resize-none border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="Product details..." />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Collection Category</label>
                    <input required type="text" value={form.category} onChange={(event) => onChange('category', event.target.value)} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="e.g. Classic Tote" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Material Grade</label>
                    <input type="text" value={form.material} onChange={(event) => onChange('material', event.target.value)} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="e.g. Full-grain Calfskin" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Surface Color</label>
                    <input type="text" value={form.color} onChange={(event) => onChange('color', event.target.value)} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="e.g. Obsidian Black" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Retail Price (INR)</label>
                    <input required type="number" min="0" value={form.price} onChange={(event) => onChange('price', Number(event.target.value))} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="e.g. 25000" />
                  </div>
                </div>
              </section>

              <section className="space-y-4 border border-stone-200 bg-white p-6">
                <h4 className="mb-4 border-b border-stone-100 pb-2 font-sans text-[10px] font-semibold uppercase tracking-widest text-stone-400">Shiprocket Package Details</h4>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Length (cm)</label>
                    <input required type="number" min="0.1" step="0.1" value={form.packageLengthCm} onChange={(event) => onChange('packageLengthCm', Number(event.target.value))} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Breadth (cm)</label>
                    <input required type="number" min="0.1" step="0.1" value={form.packageBreadthCm} onChange={(event) => onChange('packageBreadthCm', Number(event.target.value))} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Height (cm)</label>
                    <input required type="number" min="0.1" step="0.1" value={form.packageHeightCm} onChange={(event) => onChange('packageHeightCm', Number(event.target.value))} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Weight (kg)</label>
                    <input required type="number" min="0.01" step="0.01" value={form.packageWeightKg} onChange={(event) => onChange('packageWeightKg', Number(event.target.value))} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" />
                  </div>
                </div>
              </section>

              <section className="space-y-4 border border-stone-200 bg-white p-6">
                <h4 className="mb-4 border-b border-stone-100 pb-2 font-sans text-[10px] font-semibold uppercase tracking-widest text-stone-400">Product Detail Content</h4>

                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Key Features</label>
                  <textarea rows={3} value={form.keyFeaturesText} onChange={(event) => onChange('keyFeaturesText', event.target.value)} className="w-full resize-none border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder={'Enter key features (one per line)...'} />
                </div>

                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Why You'll Love It?</label>
                  <textarea rows={3} value={form.whyLoveIt} onChange={(event) => onChange('whyLoveIt', event.target.value)} className="w-full resize-none border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="Explain what makes this product special..." />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Dimensions</label>
                    <input type="text" value={form.dimensions} onChange={(event) => onChange('dimensions', event.target.value)} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="e.g. 38 x 29 x 14 cm" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">More Information</label>
                    <input type="text" value={form.moreInformation} onChange={(event) => onChange('moreInformation', event.target.value)} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="Limited edition, care notes..." />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Shipping and Returns</label>
                  <textarea rows={2} value={form.shippingReturns} onChange={(event) => onChange('shippingReturns', event.target.value)} className="w-full resize-none border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" />
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section className="space-y-4 border border-stone-200 bg-white p-6">
                <h4 className="mb-4 border-b border-stone-100 pb-2 font-sans text-[10px] font-semibold uppercase tracking-widest text-stone-400">Inventory and Status</h4>

                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Product Visibility</label>
                  <select value={form.isActive ? 'active' : 'hidden'} onChange={(event) => onChange('isActive', event.target.value === 'active')} className="w-full cursor-pointer border border-stone-200 bg-white p-3 text-[12px] outline-none focus:border-[#1a1a1a]">
                    <option value="active">Active in storefront</option>
                    <option value="hidden">Hidden from storefront</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Stock Quantity</label>
                    <input required type="number" min="0" value={form.stockQuantity} onChange={(event) => onChange('stockQuantity', Number(event.target.value))} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Low Stock Alert</label>
                    <input required type="number" min="0" value={form.lowStockThreshold} onChange={(event) => onChange('lowStockThreshold', Number(event.target.value))} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" />
                  </div>
                </div>
              </section>

              <section className="space-y-4 border border-stone-200 bg-white p-6">
                <h4 className="mb-4 border-b border-stone-100 pb-2 font-sans text-[10px] font-semibold uppercase tracking-widest text-stone-400">Product Images</h4>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-6 text-center transition-colors ${
                    isDragging ? 'border-[#1a1a1a] bg-stone-50' : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <UploadCloud size={24} strokeWidth={1.5} className="mb-2 text-stone-400" />
                  <span className="font-sans text-[11px] font-medium text-[#1a1a1a]">{isUploading ? 'Uploading images...' : 'Click to upload images'}</span>
                  <span className="mt-1 font-sans text-[10px] text-stone-400">JPG, PNG, WebP up to 5MB</span>
                  <input type="file" multiple accept="image/*" onChange={handleImageFileChange} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                </div>

                {form.images.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {form.images.map((imageUrl, index) => (
                      <div key={`${imageUrl}-${index}`} className={`group relative aspect-[3/4] overflow-hidden border bg-stone-100 ${index === 0 ? 'border-[#1a1a1a]' : 'border-transparent'}`}>
                        <img src={imageUrl} className="h-full w-full object-cover" alt={`Gallery preview ${index + 1}`} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          {index !== 0 && (
                            <button type="button" onClick={() => setCoverImage(index)} className="cursor-pointer rounded-sm bg-white px-2 py-1 text-[8px] uppercase tracking-widest text-[#1a1a1a] hover:bg-stone-200">
                              Set Cover
                            </button>
                          )}
                          <button type="button" onClick={() => onImageRemove(index)} className="cursor-pointer rounded-sm bg-red-600 p-1.5 text-white hover:bg-red-700">
                            <X size={12} />
                          </button>
                        </div>
                        {index === 0 && (
                          <div className="absolute left-1 top-1 rounded-sm bg-[#1a1a1a] px-1.5 py-0.5 text-[7px] uppercase tracking-widest text-white">
                            Cover
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </form>
        </div>

        <div className="flex shrink-0 justify-end gap-4 border-t border-stone-200 bg-white p-6">
          <button type="button" onClick={onClose} className="cursor-pointer border border-stone-200 px-6 py-3 text-[9px] uppercase tracking-widest text-[#1a1a1a] transition-colors hover:bg-stone-50">
            Cancel
          </button>
          <button form="productForm" type="submit" className="cursor-pointer bg-[#1a1a1a] px-6 py-3 text-[9px] uppercase tracking-widest text-white transition-colors hover:bg-stone-800">
            {mode === 'add' ? 'Publish Product' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

