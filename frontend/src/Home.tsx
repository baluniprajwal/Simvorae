import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { ArrowUpRight, Play, ChevronDown } from 'lucide-react';
import { useCartStore } from './store/cartStore';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function Home() {
  const container = useRef<HTMLDivElement>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toggleCart, getCartCount } = useCartStore();

  // Fake Loading Progress
  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 15) + 5;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setTimeout(() => setIsLoaded(true), 400); // slight delay when at 100 before leaving
      }
      setProgress(currentProgress);
    }, 120);
    return () => clearInterval(interval);
  }, []);

  // Initialize Lenis Smooth Scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tickerCallback);

    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
    };
  }, []);

  // Main Animations
  useGSAP(() => {
    if (!isLoaded) return;

    const tl = gsap.timeline();

    // 1. Preloader out
    tl.to('.preloader', {
      duration: 1.2,
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
      ease: 'power4.inOut',
    });

    // 2. Hero Image Reveal
    tl.fromTo('.hero-img-inner',
      { scale: 1.4, opacity: 0, clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)' },
      { scale: 1, opacity: 1, clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', duration: 2, ease: 'power4.out' },
      '-=0.6'
    );

    // 3. Navbar fade in
    tl.fromTo('.nav-item', 
      { y: -20, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.1
      }, '-=1.5'
    );

    // 4. Hero Text Reveal (Chars/Words)
    tl.from('.hero-word span', {
      yPercent: 120,
      opacity: 0,
      rotationZ: 3,
      duration: 1.4,
      ease: 'power4.out',
      stagger: 0.04
    }, '-=1.6');
    
    tl.from('.hero-sub-text', {
      opacity: 0,
      x: -20,
      duration: 1,
      ease: 'power2.out'
    }, '-=1');

    // -- Scroll Animations --
    
    // Hero Image Parallax
    gsap.to('.hero-img-inner', {
      scrollTrigger: {
        trigger: '.hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
      yPercent: 25,
      ease: 'none'
    });

    // Marquee
    gsap.to('.marquee-track', {
      xPercent: -50,
      ease: 'none',
      duration: 20,
      repeat: -1,
    });

    // About Statement Reveal
    const aboutLines = gsap.utils.toArray('.about-line');
    aboutLines.forEach((line: any) => {
      gsap.from(line.querySelectorAll('span'), {
        scrollTrigger: {
          trigger: line,
          start: 'top 85%',
        },
        yPercent: 120,
        opacity: 0,
        rotationZ: 4,
        duration: 1.4,
        stagger: 0.04,
        ease: 'power4.out'
      });
    });

    // Collection Cards Inner Image Parallax
    const collectionImgs = gsap.utils.toArray('.collection-img-parallax');
    collectionImgs.forEach((img: any) => {
      gsap.fromTo(img, 
        { yPercent: -5 },
        {
          scrollTrigger: {
            trigger: img.parentElement,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
          yPercent: 5,
          ease: 'none'
        }
      );
    });

    // Featured Collection Reveals
    const items = gsap.utils.toArray('.collection-item');
    items.forEach((item: any, i) => {
      gsap.fromTo(item, 
        { y: 100, opacity: 0, clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)' },
        {
          scrollTrigger: {
            trigger: item,
            start: 'top 85%',
          },
          y: 0,
          opacity: 1,
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          duration: 1.6,
          ease: 'power3.out',
          delay: i % 2 === 0 ? 0 : 0.2
        }
      );
    });
    
    // Horizontal Slider
    const sliderWrapper = container.current?.querySelector('.horizontal-slider-wrapper') as HTMLElement;
    const slider = container.current?.querySelector('.horizontal-slider') as HTMLElement;
    if (sliderWrapper && slider) {
      const getScrollAmount = () => -(slider.scrollWidth - window.innerWidth);
      gsap.to(slider, {
        x: getScrollAmount,
        ease: 'none',
        scrollTrigger: {
          trigger: sliderWrapper,
          start: 'top top',
          end: () => "+=" + (slider.scrollWidth - window.innerWidth),
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        }
      });
    }

    // Campaign Section Reveal
    gsap.fromTo('.campaign-img-inner',
      { scale: 1.1 },
      { 
        scale: 1, 
        ease: 'none',
        scrollTrigger: {
          trigger: '.campaign-section',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      }
    );

  }, { scope: container, dependencies: [isLoaded] });

  // Helpers
  const splitText = (text: string) => {
    return text.split('').map((char, i) => (
      <span key={i} className="inline-block whitespace-pre">
        {char === ' ' ? '&nbsp;' : char}
      </span>
    ));
  };
  
const splitWords = (text: string) => {
    return text.split(' ').map((word, i) => (
      <span key={i} className="inline-block overflow-hidden mr-4 pb-2">
        <span className="inline-block">{word}</span>
      </span>
    ));
  };

  return (
    <div ref={container} className="bg-[#fcfbf9] text-[#1a1a1a] min-h-[100svh] font-sans relative">
      
      {/* NOISE OVERLAY */}
      <div className="pointer-events-none fixed inset-0 z-40 h-full w-full opacity-[0.035]" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")'}}></div>

      {/* PRELOADER */}
      <div className="preloader fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#1a1a1a] text-[#fcfbf9]">
        <div className="overflow-hidden mb-4">
          <div className="font-serif text-5xl md:text-7xl italic tracking-wider font-light" style={{ transform: isLoaded ? 'translateY(100%)' : 'translateY(0)', transition: 'transform 0.8s cubic-bezier(0.2,1,0.2,1)' }}>
            Simvorae
          </div>
        </div>
        <div className="w-48 h-[1px] bg-white/20 relative mt-4">
          <div className="absolute top-0 left-0 h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="mt-4 font-sans text-[10px] tracking-[0.3em] font-light opacity-50">
          {progress.toString().padStart(3, '0')}%
        </div>
      </div>

      <Navbar />

      {/* HERO SECTION */}
      <section className="hero-section relative min-h-[100svh] w-full flex flex-col items-center justify-end overflow-hidden px-3 md:px-6 pb-3 md:pb-6">
        <div className="absolute inset-0 w-full h-[98%] p-3 md:p-6 mt-1 md:mt-2">
          <div className="w-full h-full relative overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-stone-200">
            <img 
              className="hero-img-inner absolute inset-0 w-full h-full object-cover object-[center_30%] will-change-transform"
              src="https://images.unsplash.com/photo-1591561954557-26941169b49e?q=80&w=2600&auto=format&fit=crop" 
              alt="Luxury Handbag Editorial" 
            />
            {/* Dark contrast overlays */}
            <div className="absolute inset-0 bg-black/30 z-[1]"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-[2]"></div>
          </div>
        </div>

        {/* Hero Bottom Bar Info */}
        <div className="relative z-10 w-full flex flex-col md:flex-row justify-between items-center md:items-end pb-8 px-4 md:px-8 text-[#fcfbf9] pointer-events-none">
           <div className="hero-sub-text font-sans text-[10px] tracking-[0.25em] uppercase font-medium max-w-[200px] hidden md:block leading-relaxed mb-4">
             A study in<br/>proportions and<br/>timeless elegance.
           </div>
           
            {/* Center Text Block */}
            <div className="flex flex-col items-center justify-center text-center w-full md:w-auto mt-auto mb-12 md:mb-0">
              
              <div className="overflow-hidden leading-[0.85]">
                <h1 className="hero-word font-serif text-[clamp(3.75rem,13vw,8rem)] lg:text-[7rem] xl:text-[8vw] font-medium tracking-tighter whitespace-nowrap">
                  {splitText("ELEVATING")}
                </h1>
              </div>
              <div className="overflow-hidden leading-[0.85] flex flex-col md:flex-row md:items-center">
                <h1 className="hero-word font-serif text-[clamp(3.75rem,13vw,8rem)] lg:text-[7rem] xl:text-[8vw] font-medium tracking-tighter italic md:mr-[3vw] whitespace-nowrap">
                  {splitText("MODERN")}
                </h1>
                <h1 className="hero-word font-serif text-[clamp(3.75rem,13vw,8rem)] lg:text-[7rem] xl:text-[8vw] font-medium tracking-tighter whitespace-nowrap">
                  {splitText("HANDBAGS")}
                </h1>
              </div>
            </div>
           
           <div className="hero-sub-text hidden md:flex flex-col items-center gap-4 font-sans text-[10px] tracking-[0.2em] uppercase pointer-events-auto hover:opacity-70 transition-opacity mb-4">
              <span className="-rotate-90 origin-center mb-6">Scroll</span>
              <div className="w-[1px] h-16 bg-white/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[50%] bg-white animate-[subtleScroll_2s_ease-in-out_infinite]"></div>
              </div>
           </div>
        </div>
      </section>

      {/* PHILOSOPHY SECTION */}
      <section className="py-24 md:py-32 px-4 md:px-12 max-w-[1800px] mx-auto flex items-center min-h-[80vh]">
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-12 items-center">
          <div className="md:col-span-7 lg:col-span-7">
            <div className="flex items-center gap-6 mb-12 opacity-60">
              <div className="w-12 h-[1px] bg-[#1a1a1a]"></div>
              <p className="font-sans text-[10px] tracking-[0.25em] uppercase font-semibold">The Atelier</p>
            </div>
            
            <div className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[4.5rem] leading-[1.05] tracking-tight mb-8">
              <div className="about-line overflow-hidden pb-1">{splitWords("We believe in the quiet power")}</div>
              <div className="about-line overflow-hidden pb-1">{splitWords("of exceptional craftsmanship.")}</div>
              <div className="about-line overflow-hidden pb-1 sm:indent-8 md:indent-12 lg:indent-[3rem]">
                 {splitWords("Our collection is meticulously")}
              </div>
              <div className="about-line overflow-hidden pb-1 sm:indent-16 md:indent-24 lg:indent-[6rem]">
                 {splitWords("structured to carry your world,")}
              </div>
              <div className="about-line overflow-hidden pb-1">
                 {splitWords("striking a balance between ")}
                 <i className="text-stone-400 mr-2 md:mr-3 font-light">sculptural</i>
              </div>
              <div className="about-line overflow-hidden pb-1">
                 {splitWords("silhouettes and effortless utility.")}
              </div>
            </div>
            

          </div>

          <div className="md:col-span-5 lg:col-span-5 lg:pl-12 mt-8 md:mt-0 relative">
            <div className="aspect-[4/5] overflow-hidden rounded-[1.5rem] relative bg-stone-200">
              <img 
                src="https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=1200&auto=format&fit=crop" 
                alt="Leather Craftsmanship Detail" 
                className="collection-img-parallax w-full h-[120%] -top-[10%] left-0 absolute object-cover object-center transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,1,0.2,1)]"
              />
            </div>
            
            <div className="absolute -bottom-6 -left-6 md:-bottom-12 md:-left-12 bg-[#fcfbf9] p-6 lg:p-8 rounded-[1rem] shadow-xl border border-stone-100 max-w-[280px]">
              <div className="w-6 h-[1px] bg-stone-300 mb-4"></div>
              <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-stone-500 leading-loose">
                "Every stitch is a conscious decision. Every silhouette is an intention."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE SECTION */}
      <section className="py-16 md:py-24 overflow-hidden border-y border-[#1a1a1a]/10 bg-stone-100">
        <div className="marquee-track flex whitespace-nowrap font-serif text-6xl md:text-[6rem] opacity-70 text-stone-900">
          <span className="px-8 font-light">NEW YORK</span>
          <span className="px-8 italic text-stone-400">&mdash;</span>
          <span className="px-8 font-light">PARIS</span>
          <span className="px-8 italic text-stone-400">&mdash;</span>
          <span className="px-8 font-light">MILAN</span>
          <span className="px-8 italic text-stone-400">&mdash;</span>
          <span className="px-8 font-light">LONDON</span>
          <span className="px-8 italic text-stone-400">&mdash;</span>
          <span className="px-8 font-light">TOKYO</span>
          <span className="px-8 italic text-stone-400">&mdash;</span>
          <span className="px-8 font-light">NEW YORK</span>
          <span className="px-8 italic text-stone-400">&mdash;</span>
          <span className="px-8 font-light">PARIS</span>
          <span className="px-8 italic text-stone-400">&mdash;</span>
          <span className="px-8 font-light">MILAN</span>
          <span className="px-8 italic text-stone-400">&mdash;</span>
        </div>
      </section>

      {/* SIGNATURE SILHOUETTES */}
      <section className="py-24 md:py-32 px-4 md:px-12 max-w-[1800px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 md:mb-24 gap-8 px-2 md:px-6">
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.9] tracking-tighter">
            Signature <br/>
            <span className="italic text-stone-400 font-light ml-0 md:ml-16 block mt-2">Silhouettes.</span>
          </h2>
          <p className="font-sans text-[11px] tracking-[0.2em] uppercase mb-4 max-w-[300px] md:text-right text-stone-500 leading-loose">
            Discover iconic handbags that blend premium leatherwork with contemporary architectural forms.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 lg:items-stretch">
          {/* Main Featured Item */}
          <div className="collection-item group lg:col-span-6 flex flex-col relative cursor-pointer h-full">
            <Link to="/product/1" className="w-full flex-1 flex flex-col relative outline-none block h-full">
                <div className="overflow-hidden rounded-[1.5rem] relative bg-stone-100 flex-1 aspect-[4/5] lg:aspect-auto">
                  <img 
                    src="https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=1200&auto=format&fit=crop" 
                    alt="Classic Tote" 
                    className="w-full h-full absolute inset-0 object-cover object-center transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,1,0.2,1)] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                </div>
                <div className="flex justify-between items-start font-sans mt-6 px-2 lg:mt-8 pb-4 lg:pb-0">
                  <div>
                    <p className="text-[10px] tracking-[0.25em] uppercase mb-2 text-stone-500">01 &mdash; Classic Tote</p>
                    <h3 className="text-3xl font-serif tracking-tight text-[#1a1a1a]">The Drape Tote</h3>
                  </div>
                  <span className="text-sm font-light mt-1 text-[#1a1a1a]">₹68,000</span>
                </div>
            </Link>
          </div>

          {/* Right Side 2x2 Grid */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12 h-full">
            <Link to="/product/2" className="collection-item group flex flex-col h-full cursor-pointer">
                <div className="overflow-hidden rounded-[1.5rem] relative flex-1 aspect-[4/5] bg-stone-100">
                    <img 
                        src="https://images.unsplash.com/photo-1548036328-c928907cfcb7?q=80&w=1200&auto=format&fit=crop" 
                        alt="Hobo Shoulder Bag" 
                        className="w-full h-full absolute inset-0 object-cover object-center transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,1,0.2,1)] group-hover:scale-105"
                    />
                </div>
                <div className="flex justify-between items-start font-sans mt-4 px-2 pb-4 lg:pb-0">
                   <div>
                       <p className="text-[9px] tracking-[0.25em] uppercase mb-1 text-stone-500">Hobo Shoulder Bag</p>
                       <h3 className="text-lg font-serif tracking-tight text-[#1a1a1a]">Structured Hobo</h3>
                   </div>
                   <span className="text-sm font-light text-[#1a1a1a]">₹33,600</span>
                </div>
            </Link>

            <Link to="/product/3" className="collection-item group flex flex-col h-full cursor-pointer">
                <div className="overflow-hidden rounded-[1.5rem] relative flex-1 aspect-[4/5] bg-stone-100">
                    <img 
                        src="https://images.unsplash.com/photo-1591561954557-26941169b49e?q=80&w=1600&auto=format&fit=crop" 
                        alt="Crossbody Bag" 
                        className="w-full h-full absolute inset-0 object-cover object-[center_30%] transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,1,0.2,1)] group-hover:scale-105"
                    />
                </div>
                <div className="flex justify-between items-start font-sans mt-4 px-2 pb-4 lg:pb-0">
                   <div>
                       <p className="text-[9px] tracking-[0.25em] uppercase mb-1 text-stone-500">Crossbody Bag</p>
                       <h3 className="text-lg font-serif tracking-tight text-[#1a1a1a]">Woven Crossbody</h3>
                   </div>
                   <span className="text-sm font-light text-[#1a1a1a]">₹48,000</span>
                </div>
            </Link>

            <Link to="/product/10" className="collection-item group flex flex-col h-full cursor-pointer">
                <div className="overflow-hidden rounded-[1.5rem] relative flex-1 aspect-[4/5] bg-stone-100">
                    <img 
                        src="https://images.unsplash.com/photo-1581605405669-fcdf81165afa?q=80&w=800&auto=format&fit=crop" 
                        alt="Top Handle Bag" 
                        className="w-full h-full absolute inset-0 object-cover object-center transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,1,0.2,1)] group-hover:scale-105"
                    />
                </div>
                <div className="flex justify-between items-start font-sans mt-4 px-2 pb-4 lg:pb-0">
                   <div>
                       <p className="text-[9px] tracking-[0.25em] uppercase mb-1 text-stone-500">Top Handle Bag</p>
                       <h3 className="text-lg font-serif tracking-tight text-[#1a1a1a]">Mono Top-Handle</h3>
                   </div>
                   <span className="text-sm font-light text-[#1a1a1a]">₹2,56,000</span>
                </div>
            </Link>

            <Link to="/product/4" className="collection-item group flex flex-col h-full cursor-pointer">
                <div className="overflow-hidden rounded-[1.5rem] relative flex-1 aspect-[4/5] bg-stone-100">
                    <img 
                        src="https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?q=80&w=1200&auto=format&fit=crop" 
                        alt="Chain Clutch" 
                        className="w-full h-full absolute inset-0 object-cover object-center transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,1,0.2,1)] group-hover:scale-105"
                    />
                </div>
                <div className="flex justify-between items-start font-sans mt-4 px-2 pb-4 lg:pb-0">
                   <div>
                       <p className="text-[9px] tracking-[0.25em] uppercase mb-1 text-stone-500">Chain Clutch</p>
                       <h3 className="text-lg font-serif tracking-tight text-[#1a1a1a]">Classic Box Clutch</h3>
                   </div>
                   <span className="text-sm font-light text-[#1a1a1a]">₹96,000</span>
                </div>
            </Link>
          </div>
        </div>

        <div className="flex justify-center mt-24">
          <Link to="/shop" className="group inline-flex items-center gap-4 border border-[#1a1a1a] rounded-[2rem] px-8 py-4 hover:bg-[#1a1a1a] hover:text-[#fcfbf9] transition-colors duration-500">
             <span className="text-[10px] uppercase tracking-widest font-bold">Shop Full Collection</span>
             <ArrowUpRight size={16} strokeWidth={2} className="group-hover:rotate-45 transition-transform duration-300" />
          </Link>
        </div>
      </section>

      {/* THE ARCHIVE - EDITORIAL GRID */}
      <section className="py-24 md:py-32 px-4 md:px-12 max-w-[1800px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start mb-16 md:mb-24 gap-8">
            <div className="md:w-1/2">
                <div className="flex items-center gap-6 mb-8 opacity-60">
                    <div className="w-12 h-[1px] bg-[#1a1a1a]"></div>
                    <p className="font-sans text-[10px] tracking-[0.25em] uppercase font-semibold">The Archive</p>
                </div>
                <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[0.9] tracking-tighter">
                   Artisan<br/><span className="italic font-light text-stone-500">Crafted.</span>
                </h2>
            </div>
            <div className="md:w-1/3 md:pt-12">
                <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-stone-500 leading-loose">
                   A continuous study of premium leather and structural utility. Discover handbags designed to develop character and outlast passing seasons.
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 lg:gap-12">
            {/* Left Column */}
            <div className="lg:col-span-4 flex flex-col">
                <Link to="/product/4" className="collection-item group block h-full flex flex-col cursor-pointer">
                    <div className="overflow-hidden rounded-[1.5rem] relative aspect-[3/4] sm:aspect-square lg:aspect-auto flex-1 bg-stone-100 mb-6">
                        <img 
                            src="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=1200&auto=format&fit=crop" 
                            alt="Soft Calfskin Pouch" 
                            className="w-full h-full absolute inset-0 object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,1,0.2,1)] group-hover:scale-105"
                        />
                    </div>
                    <div className="flex justify-between items-start font-sans px-2 pb-6 lg:pb-0">
                       <div>
                           <p className="text-[9px] tracking-[0.25em] uppercase mb-1 text-stone-500">Archive &mdash; 01</p>
                           <h3 className="text-xl font-serif tracking-tight text-[#1a1a1a]">Soft Calfskin Pouch</h3>
                       </div>
                    </div>
                </Link>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-8 flex flex-col gap-6 md:gap-8 lg:gap-12">
                {/* Top Wide Image */}
                <Link to="/product/7" className="collection-item group block cursor-pointer">
                    <div className="overflow-hidden rounded-[1.5rem] relative aspect-[4/3] md:aspect-[21/9] bg-stone-100 mb-6">
                        <img 
                            src="https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1600&auto=format&fit=crop" 
                            alt="Calfskin Weekend" 
                            className="w-full h-full absolute inset-0 object-cover object-[center_30%] transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,1,0.2,1)] group-hover:scale-105"
                        />
                    </div>
                    <div className="flex justify-between items-start font-sans px-2">
                       <div>
                           <p className="text-[9px] tracking-[0.25em] uppercase mb-1 text-stone-500">Archive &mdash; 02</p>
                           <h3 className="text-xl font-serif tracking-tight text-[#1a1a1a]">Calfskin Weekend</h3>
                       </div>
                    </div>
                </Link>

                {/* Bottom Row inside Right Column */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 lg:gap-12 flex-1">
                    {/* Item 3 */}
                    <Link to="/product/8" className="collection-item group block flex flex-col h-full cursor-pointer">
                        <div className="overflow-hidden rounded-[1.5rem] relative aspect-square bg-stone-100 mb-6 flex-1">
                            <img 
                                src="https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800&auto=format&fit=crop" 
                                alt="Acetate Chain Mini" 
                                className="w-full h-full absolute inset-0 object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,1,0.2,1)] group-hover:scale-105"
                            />
                        </div>
                        <div className="flex justify-between items-start font-sans px-2 pb-6 sm:pb-0">
                           <div>
                               <p className="text-[9px] tracking-[0.25em] uppercase mb-1 text-stone-500">Archive &mdash; 03</p>
                               <h3 className="text-xl font-serif tracking-tight text-[#1a1a1a]">Acetate Chain Mini</h3>
                           </div>
                        </div>
                    </Link>

                    {/* Quote Box */}
                    <div className="p-8 md:p-12 bg-stone-100 rounded-[1.5rem] flex flex-col justify-between h-full min-h-[300px]">
                        <p className="font-serif text-2xl md:text-3xl tracking-tight leading-snug mb-12 text-[#1a1a1a]">
                            "The archive represents our commitment to timeless proportion and unrelenting quality."
                        </p>
                        <div>
                            <Link to="/archive" className="font-sans text-[10px] tracking-[0.2em] uppercase border-b border-stone-300 pb-1 hover:border-[#1a1a1a] transition-colors inline-block font-semibold">
                                View Complete Archive
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* CAMPAIGN SECTION */}
      <section className="campaign-section relative h-screen w-full overflow-hidden flex items-center justify-center p-4">
        <div className="absolute inset-4 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden">
          <img 
            className="campaign-img-inner absolute inset-0 w-full h-full object-cover object-center will-change-transform"
            src="https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=2000&auto=format&fit=crop" 
            alt="Handbag Campaign Image" 
          />
          <div className="absolute inset-0 bg-black/40 mix-blend-multiply"></div>
        </div>
        <div className="relative z-10 text-center text-[#fcfbf9] w-full px-6 flex flex-col items-center pointer-events-none">
          <p className="font-sans text-[10px] tracking-[0.3em] uppercase mb-8 md:mb-12 opacity-80 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2">Campaign 01</p>
          <h2 className="font-serif text-[clamp(3.25rem,10vw,7rem)] xl:text-[8rem] leading-[0.85] tracking-tighter md:max-w-4xl mx-auto break-words">
            DRESS<br/><span className="italic font-light">FOR THE</span><br/>LIFE YOU WANT.
          </h2>
        </div>
      </section>

      {/* PERMANENT COLLECTION (EDITORIAL GRID) */}
      <section className="py-24 md:py-32 bg-[#1a1a1a] text-[#fcfbf9] rounded-b-[2rem] md:rounded-b-[3rem]">
        <div className="px-4 md:px-12 max-w-[1800px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 md:mb-24 gap-8">
                <div>
                   <div className="flex items-center gap-6 mb-8 opacity-60">
                       <div className="w-12 h-[1px] bg-[#fcfbf9]"></div>
                       <p className="font-sans text-[10px] tracking-[0.25em] uppercase font-semibold text-[#fcfbf9]">Permanent Collection</p>
                   </div>
                   <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.9] tracking-tighter">
                       Everyday <span className="italic font-light text-stone-400">Carry.</span>
                   </h2>
                </div>
                <div className="max-w-[280px]">
                    <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-stone-400 leading-loose">
                        Foundation bags engineered to safely hold your essentials. From spacious totes to compact crossbodys.
                    </p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 md:gap-8 xl:h-[80vh]">
               {/* Left Big Item */}
               <Link to="/product/5" className="collection-item group relative block overflow-hidden rounded-[1.5rem] bg-stone-900 w-full lg:w-5/12 h-[52vh] md:h-[60vh] xl:h-full cursor-pointer">
                  <img src="https://images.unsplash.com/photo-1485231183945-fd66023fd5ca?q=80&w=1200&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" alt="Leather Carryall" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 transition-opacity group-hover:opacity-60"></div>
                  
                  <div className="absolute top-0 w-full p-6 lg:p-8 flex justify-between items-start z-10">
                     <span className="bg-[#fcfbf9] text-[#1a1a1a] text-[9px] uppercase tracking-widest px-4 py-2 rounded-full font-bold shadow-sm">Classic Tote</span>
                     <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center -translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                        <ArrowUpRight size={16} className="text-white" />
                     </div>
                  </div>

                  <div className="absolute bottom-0 w-full p-6 lg:p-8 z-10 flex flex-col md:flex-row md:justify-between md:items-end gap-2">
                     <div>
                        <p className="font-sans text-[10px] tracking-[0.25em] uppercase mb-2 text-stone-300">C-01</p>
                        <h3 className="font-serif text-3xl lg:text-4xl tracking-tight text-white mb-1">Leather Carryall</h3>
                     </div>
                     <p className="font-sans text-sm text-stone-300 font-light pb-1 md:pb-2">₹36,000</p>
                  </div>
               </Link>

               {/* Right Side Stacked layout */}
               <div className="w-full lg:w-7/12 flex flex-col gap-6 md:gap-8 h-full">
                   
                   {/* Top Wide Item */}
                   <Link to="/product/2" className="collection-item group relative block overflow-hidden rounded-[1.5rem] bg-stone-900 flex-1 min-h-[40vh] md:min-h-[45vh] xl:min-h-0 cursor-pointer">
                       <img src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1600&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover object-[center_30%] opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" alt="Structured Hobo" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 transition-opacity group-hover:opacity-60"></div>
                       
                       <div className="absolute top-0 w-full p-6 flex justify-between items-start z-10">
                         <span className="bg-[#fcfbf9]/10 backdrop-blur-md text-white text-[9px] uppercase tracking-widest px-4 py-2 rounded-full font-medium shadow-sm border border-white/10">Hobo Shoulder Bag</span>
                       </div>

                       <div className="absolute bottom-0 w-full p-6 z-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
                         <div>
                            <p className="font-sans text-[10px] tracking-[0.25em] uppercase mb-2 text-stone-300">C-02</p>
                            <h3 className="font-serif text-2xl lg:text-3xl tracking-tight text-white mb-1">Structured Hobo</h3>
                         </div>
                         <p className="font-sans text-sm text-stone-300 font-light sm:pb-1">₹33,600</p>
                       </div>
                   </Link>

                   {/* Bottom Split Items */}
                   <div className="flex flex-col sm:flex-row gap-6 md:gap-8 flex-1 min-h-[40vh] md:min-h-[45vh] xl:min-h-0">
                       <Link to="/product/6" className="collection-item group relative block overflow-hidden rounded-[1.5rem] bg-stone-900 flex-1 aspect-square sm:aspect-auto cursor-pointer">
                           <img src="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=1200&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover object-center opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" alt="Soft Calfskin Pouch" />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 z-0 transition-opacity group-hover:opacity-60"></div>
                           
                           <div className="absolute bottom-0 w-full p-5 md:p-6 z-10">
                              <p className="font-sans text-[9px] tracking-[0.25em] uppercase mb-1 text-stone-300">Hobo Shoulder Bag</p>
                              <div className="flex justify-between items-end">
                                  <h3 className="font-serif text-xl lg:text-3xl tracking-tight text-white pr-2">Soft Calfskin</h3>
                                  <p className="font-sans text-sm text-stone-300 font-light whitespace-nowrap mb-1">₹25,600</p>
                              </div>
                           </div>
                       </Link>

                       <Link to="/product/11" className="collection-item group relative block overflow-hidden rounded-[1.5rem] bg-stone-900 flex-1 aspect-square sm:aspect-auto cursor-pointer">
                           <img src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=1200&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover object-center opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" alt="Brutalist Minaudiere" />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 z-0 transition-opacity group-hover:opacity-60"></div>
                           
                           <div className="absolute bottom-0 w-full p-5 md:p-6 z-10">
                              <p className="font-sans text-[9px] tracking-[0.25em] uppercase mb-1 text-stone-300">Chain Clutch</p>
                              <div className="flex justify-between items-end">
                                  <h3 className="font-serif text-xl lg:text-3xl tracking-tight text-white pr-2">Minaudiere</h3>
                                  <p className="font-sans text-sm text-stone-300 font-light whitespace-nowrap mb-1">₹17,600</p>
                              </div>
                           </div>
                       </Link>
                   </div>
               </div>
            </div>
            
            <div className="flex justify-center mt-16 md:mt-24 pb-8">
                <Link to="/shop" className="group inline-flex items-center gap-4">
                    <span className="font-sans text-[10px] tracking-[0.2em] uppercase border-b border-stone-500 pb-2 text-stone-300 group-hover:text-[#fcfbf9] group-hover:border-[#fcfbf9] transition-colors inline-block font-semibold">
                        Explore Full Essentials
                    </span>
                    <ArrowUpRight size={14} className="text-stone-300 group-hover:text-[#fcfbf9] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Link>
            </div>
        </div>
      </section>

      {/* BACK TO TOP */}
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 z-[60] w-12 h-12 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-lg hover:border-[#1a1a1a] transition-all duration-300 group active:scale-95"
        aria-label="Back to top"
      >
        <ChevronDown size={20} className="rotate-180 transition-transform group-hover:-translate-y-1" />
      </button>

      <Footer />
    </div>
  );
}
