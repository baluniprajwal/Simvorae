import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Lenis from 'lenis';

export default function About() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    
    const animationFrameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
    };
  }, []);

  return (
    <div ref={container} className="bg-[#fcfbf9] text-[#1a1a1a] min-h-screen font-sans">
      <Navbar />
      
      <main className="pt-40 md:pt-56 pb-24 md:pb-32 px-6 md:px-12 max-w-[1400px] mx-auto min-h-screen flex flex-col justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.2, 1, 0.2, 1] }}
          className="flex flex-col md:flex-row gap-16 md:gap-32 items-start"
        >
          <div className="flex-1">
            <h1 className="font-serif text-[4rem] md:text-[6rem] leading-[0.9] tracking-tighter mb-8 md:mb-12">
              Our Story
            </h1>
            <p className="text-xl md:text-2xl text-stone-600 font-light leading-relaxed mb-8 md:max-w-xl">
              Simvorae was born from a desire to blend architectural form with the fluid grace of modern life. We believe a handbag is not merely an accessory, but a structural companion.
            </p>
            <p className="text-base md:text-lg text-stone-500 font-light leading-relaxed md:max-w-xl mb-12">
              Our commitment to craftsmanship ensures that every curve, stitch, and fold is a testament to our relentless pursuit of perfection. Using only the finest materials sourced responsibly, Simvorae creations are designed to stand the test of time, maturing beautifully with every journey.
            </p>
            <div className="flex gap-12 text-[10px] uppercase tracking-widest font-bold">
              <div>
                <span className="block text-2xl font-serif font-light mb-2">2018</span>
                <span className="text-stone-400">FOUNDED</span>
              </div>
              <div className="w-[1px] h-12 bg-stone-300"></div>
              <div>
                <span className="block text-2xl font-serif font-light mb-2">MILAN</span>
                <span className="text-stone-400">STUDIO</span>
              </div>
            </div>
          </div>
          
          <div className="flex-[0.8] w-full mt-8 md:mt-0 relative">
            <div className="aspect-[3/4] w-full bg-stone-200 rounded-[2rem] overflow-hidden">
               <img 
                 src="https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&q=80" 
                 alt="Artisan at work" 
                 className="w-full h-full object-cover"
               />
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
