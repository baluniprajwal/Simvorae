import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { ChevronDown } from 'lucide-react';
import { useCartStore } from './store/cartStore';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { fetchJson } from './lib/api';
import type { Product as ProductType, ProductDetailResponse } from './types/product';

gsap.registerPlugin(ScrollTrigger);

const AccordionItem = ({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className="border-b border-[#1a1a1a]/10 cursor-pointer overflow-hidden transition-all duration-300"
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="py-5 flex justify-between items-center group select-none">
        <span className="text-[16px] md:text-[18px] font-medium transition-colors group-hover:text-[#1a1a1a]/70">
          {title}
        </span>
        <ChevronDown
          strokeWidth={1.5}
          className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        />
      </div>
      <div
        className={`text-sm font-light text-stone-600 transition-all duration-500 ease-in-out ${
          isOpen ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="cursor-default" onClick={(event) => event.stopPropagation()}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default function Product() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductType | null>(null);
  const [similarProducts, setSimilarProducts] = useState<ProductType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAdded, setIsAdded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const { addItem } = useCartStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const productImages = product?.images?.length ? product.images.map((image) => image.url) : [];
  const keyFeatures = product?.keyFeatures?.length
    ? product.keyFeatures
    : ['Fits 15" Laptop', 'Multiple Functional Pockets', 'Zipper Closure'];

  useEffect(() => {
    let ignore = false;

    async function loadProduct() {
      try {
        setIsLoading(true);
        setErrorMessage('');
        setActiveImageIndex(0);

        const response = await fetchJson<ProductDetailResponse>(`/api/products/${id}`);

        if (ignore) return;

        setProduct(response.product);
        setSimilarProducts(response.similarProducts);
      } catch (error) {
        if (ignore) return;
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load product.');
        setProduct(null);
        setSimilarProducts([]);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    if (id) {
      loadProduct();
    }

    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }

    let animationFrameId = requestAnimationFrame(raf);
    window.scrollTo(0, 0);

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
    };
  }, [id]);

  useEffect(() => {
    if (!product) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      tl.fromTo(
        '.product-gallery-container',
        { autoAlpha: 0, scale: 1.05, clipPath: 'inset(5% 5% 5% 5%)' },
        {
          autoAlpha: 1,
          scale: 1,
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.5,
          stagger: 0.1,
          ease: 'expo.out',
        },
      );

      tl.fromTo(
        '.reveal-text',
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.05, ease: 'expo.out' },
        '-=1.3',
      );

      gsap.utils.toArray('.product-gallery-parallax-wrapper').forEach((wrapper: any) => {
        gsap.fromTo(
          wrapper,
          { yPercent: -2.5 },
          {
            yPercent: 2.5,
            ease: 'none',
            scrollTrigger: {
              trigger: wrapper.parentElement,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          },
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, [product, id]);

  const handleAddToCart = () => {
    if (!product) return;

    addItem({
      id: String(product.legacyId ?? product._id),
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    });

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] text-[#1a1a1a] font-sans">
        <Navbar />
        <main className="pt-24 md:pt-28 px-6 md:px-12 max-w-[1600px] mx-auto min-h-screen">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 xl:gap-18 mb-24 md:mb-32 animate-pulse">
            <div className="w-full lg:w-[48%] aspect-[4/5] bg-stone-200/70 rounded-[1rem]" />
            <div className="w-full lg:w-[42%] xl:max-w-[560px] space-y-6 pt-6">
              <div className="h-4 w-40 bg-stone-200/70 rounded" />
              <div className="h-16 w-3/4 bg-stone-200/70 rounded" />
              <div className="h-8 w-32 bg-stone-200/70 rounded" />
              <div className="h-24 w-full bg-stone-200/70 rounded" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfbf9] text-[#1a1a1a]">
        <div className="text-center">
          <h1 className="font-serif text-4xl mb-4">{errorMessage || 'Product Not Found'}</h1>
          <button
            onClick={() => navigate('/shop')}
            className="border-b border-[#1a1a1a] pb-1 uppercase tracking-widest text-xs font-sans"
          >
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="bg-[#fcfbf9] text-[#1a1a1a] min-h-screen font-sans">
      <div
        className="pointer-events-none fixed inset-0 z-40 h-full w-full opacity-[0.035] mix-blend-overlay"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}
      />

      <Navbar />

      <main className="pt-24 md:pt-28 px-6 md:px-12 max-w-[1600px] mx-auto min-h-screen">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 xl:gap-18 mb-24 md:mb-32 relative items-start justify-center">
          <div className="w-full lg:w-[48%] flex flex-col lg:flex-row gap-4 lg:gap-6 xl:gap-8 lg:sticky lg:top-28 h-fit">
            <div className="order-2 lg:order-1 flex lg:flex-col gap-3 md:gap-4 overflow-x-auto lg:overflow-y-auto pb-4 lg:pb-0 px-1 lg:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {productImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-16 lg:w-20 aspect-[4/5] overflow-hidden bg-[#e5e4e2]/50 rounded-lg flex-shrink-0 transition-all duration-300 border focus:outline-none ${
                    activeImageIndex === idx ? 'opacity-100 border-[#1a1a1a] shadow-sm' : 'opacity-40 border-transparent hover:opacity-100'
                  }`}
                >
                  <img src={img} className="w-full h-full object-cover mix-blend-multiply" alt={`${product.name} - Thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>

            <div className="order-1 lg:order-2 product-gallery-container relative w-full flex-1 aspect-[4/5] overflow-hidden bg-[#e5e4e2]/50 md:rounded-[1rem]">
              <div className="product-gallery-parallax-wrapper absolute inset-x-0 w-full h-[105%] -top-[2.5%]">
                <div
                  className="flex w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.2,1,0.2,1)] will-change-transform"
                  style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
                >
                  {productImages.map((img, idx) => (
                    <img
                      key={idx}
                      ref={idx === 0 ? imageRef : null}
                      src={img}
                      className="w-full h-full flex-shrink-0 object-cover mix-blend-multiply"
                      alt={`${product.name} - View ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[42%] xl:max-w-[560px] flex flex-col pt-6 lg:pt-0 h-fit">
            <div className="reveal-text flex flex-col items-start mb-10">
              <p className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-6 font-semibold">
                {String(product.legacyId).padStart(2, '0')} &mdash; {product.category}
              </p>
              <h1 className="font-serif text-[clamp(3.25rem,11vw,4.5rem)] leading-[0.9] tracking-tighter mb-6 max-w-lg">
                {product.name}
              </h1>
              <p className="font-sans text-2xl md:text-3xl font-light text-[#1a1a1a]">
                Rs. {product.price.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="reveal-text w-full h-[1px] bg-[#1a1a1a]/10 mb-10" />

            <div className="reveal-text mb-10">
              <p className="text-base md:text-[16px] leading-[1.8] text-stone-600 font-sans font-light max-w-lg">
                {product.description}
              </p>
            </div>

            <div className="reveal-text flex flex-col gap-4 max-w-xl mb-12">
              <button
                className={`w-full cursor-pointer py-5 md:py-6 text-[10px] tracking-[0.2em] uppercase font-bold transition-all duration-500 flex items-center justify-center group ${
                  isAdded
                    ? 'bg-[#b6c7a7] border border-[#b6c7a7] text-[#1a1a1a]'
                    : 'bg-[#1a1a1a] text-[#fcfbf9] hover:bg-transparent hover:text-[#1a1a1a] border border-[#1a1a1a]'
                }`}
                onClick={handleAddToCart}
              >
                {isAdded ? 'Added to Bag' : 'Add to Bag'}
              </button>
              <p className="text-[9px] uppercase tracking-widest text-stone-400 text-center mt-3">
                Free worldwide shipping and returns.
              </p>
            </div>

            <div className="reveal-text mb-12">
              <h3 className="text-[16px] md:text-[18px] font-medium mb-6">Key Features</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm font-light text-[#1a1a1a] list-disc pl-5">
                {keyFeatures.map((feature) => (
                  <li key={feature} className="pl-2">{feature}</li>
                ))}
              </ul>
            </div>

            <div className="reveal-text spec-grid font-sans border-t border-[#1a1a1a]/10 mb-16 max-w-xl">
              <AccordionItem title="Why You'll Love It?" defaultOpen={true}>
                <p>
                  {product.whyLoveIt || 'Designed with meticulous attention to detail, this piece seamlessly blends elevated aesthetics with everyday utility. The refined craftsmanship ensures it will become a staple in your collection.'}
                </p>
              </AccordionItem>
              <AccordionItem title="Details & Dimensions">
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Material</span>
                    <span className="font-medium text-[#1a1a1a]">{product.material}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Color</span>
                    <span className="font-medium text-[#1a1a1a]">{product.color}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Category</span>
                    <span className="font-medium text-[#1a1a1a]">{product.category}</span>
                  </div>
                  {product.dimensions && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Dimensions</span>
                      <span className="font-medium text-[#1a1a1a]">{product.dimensions}</span>
                    </div>
                  )}
                  {product.packageDetails && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Length</span>
                        <span className="font-medium text-[#1a1a1a]">{product.packageDetails.lengthCm} cm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Breadth</span>
                        <span className="font-medium text-[#1a1a1a]">{product.packageDetails.breadthCm} cm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Height</span>
                        <span className="font-medium text-[#1a1a1a]">{product.packageDetails.heightCm} cm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Weight</span>
                        <span className="font-medium text-[#1a1a1a]">{product.packageDetails.weightKg} kg</span>
                      </div>
                    </>
                  )}
                </div>
              </AccordionItem>
              <AccordionItem title="Shipping & Returns">
                <p>{product.shippingReturns || 'Complimentary express shipping on all orders. Returns are accepted within 30 days of delivery in their original condition.'}</p>
              </AccordionItem>
              <AccordionItem title="More Information">
                <p>{product.moreInformation || 'Each item is crafted in limited numbers to preserve its exclusivity. Contact our concierge for personalized styling advice.'}</p>
              </AccordionItem>
            </div>
          </div>
        </div>
      </main>

      {similarProducts.length > 0 && (
        <section className="py-24 px-6 md:px-12 max-w-[1300px] mx-auto border-t border-stone-200">
          <h2 className="font-serif text-3xl mb-12 tracking-tight">Similar Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {similarProducts.map((simProd) => (
              <Link
                to={`/product/${simProd.legacyId ?? simProd.slug}`}
                key={simProd._id}
                className="product-card group cursor-pointer relative flex flex-col block border-none outline-none"
              >
                <div className="overflow-hidden rounded-[1rem] md:rounded-[1.5rem] aspect-[3/4] mb-6 relative bg-stone-100/50 block">
                  <img
                    src={simProd.image}
                    alt={simProd.name}
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
                    <h3 className="text-xl md:text-2xl font-serif tracking-tight pr-4">{simProd.name}</h3>
                    <span className="text-[13px] font-light mt-1 whitespace-nowrap text-stone-600">
                      Rs. {simProd.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-4 h-[1px] bg-stone-300 transition-all duration-500 group-hover:w-8 group-hover:bg-[#1a1a1a]" />
                      <p className="text-[9px] tracking-[0.25em] uppercase transition-colors duration-500 text-stone-400 group-hover:text-[#1a1a1a]">
                        {simProd.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 mt-1">
                      <span className="text-[8px] tracking-widest uppercase text-stone-400">{simProd.material}</span>
                      <span className="w-1 h-1 rounded-full bg-stone-300" />
                      <span className="text-[8px] tracking-widest uppercase text-stone-400">{simProd.color}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      <Footer />
    </div>
  );
}
