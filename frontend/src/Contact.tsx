import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Lenis from 'lenis';

export default function Contact() {
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
      
      <main className="pt-32 md:pt-40 lg:pt-48 pb-24 md:pb-32 px-6 md:px-12 max-w-[1400px] mx-auto min-h-screen flex flex-col justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.2, 1, 0.2, 1] }}
          className="grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-20 lg:gap-32 items-start"
        >
          <div>
            <h1 className="font-serif text-[clamp(3.25rem,10vw,6rem)] leading-[0.9] tracking-tighter mb-8 max-w-sm">
              Get in Touch
            </h1>
            <p className="text-lg md:text-xl text-stone-600 font-light leading-relaxed mb-12 max-w-md">
              We invite inquiries regarding collections, bespoke services, and brand collaborations.
            </p>
            
            <div className="flex flex-col gap-10">
              <div>
                <h3 className="text-[10px] uppercase tracking-widest font-bold mb-3 text-stone-400">Client Services</h3>
                <a href="mailto:contact@simvorae.com" className="text-xl md:text-2xl font-serif hover:italic transition-all">contact@simvorae.com</a>
              </div>
              
              <div>
                <h3 className="text-[10px] uppercase tracking-widest font-bold mb-3 text-stone-400">Press</h3>
                <a href="mailto:press@simvorae.com" className="text-xl md:text-2xl font-serif hover:italic transition-all">press@simvorae.com</a>
              </div>
              
              <div>
                <h3 className="text-[10px] uppercase tracking-widest font-bold mb-3 text-stone-400">Atelier</h3>
                <p className="text-base md:text-lg text-stone-600 leading-relaxed font-light">
                  Via Monte Napoleone 12<br/>
                  20121 Milano MI<br/>
                  Italy
                </p>
              </div>
            </div>
          </div>
          
          <div className="w-full mt-8 md:mt-0">
            <form className="flex flex-col gap-8 w-full max-w-lg ml-auto">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="NAME"
                  className="w-full bg-transparent border-b border-stone-300 py-4 text-sm tracking-widest uppercase focus:outline-none focus:border-[#1a1a1a] transition-colors placeholder:text-stone-400 font-bold"
                />
              </div>
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="EMAIL"
                  className="w-full bg-transparent border-b border-stone-300 py-4 text-sm tracking-widest uppercase focus:outline-none focus:border-[#1a1a1a] transition-colors placeholder:text-stone-400 font-bold"
                />
              </div>
              <div className="relative">
                <textarea 
                  placeholder="MESSAGE"
                  rows={4}
                  className="w-full bg-transparent border-b border-stone-300 py-4 text-sm tracking-widest uppercase focus:outline-none focus:border-[#1a1a1a] transition-colors placeholder:text-stone-400 font-bold resize-none"
                />
              </div>
              
              <button type="button" className="group mt-4 flex items-center justify-between w-full border border-[#1a1a1a] rounded-full px-8 py-5 hover:bg-[#1a1a1a] transition-colors duration-500">
                <span className="text-[10px] tracking-[0.2em] uppercase font-bold group-hover:text-[#fcfbf9] transition-colors">Send Inquiry</span>
                <span className="w-8 h-[1px] bg-[#1a1a1a] group-hover:bg-[#fcfbf9] group-hover:w-16 transition-all duration-500" />
              </button>
            </form>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
