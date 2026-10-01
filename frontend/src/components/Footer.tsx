import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { socialLinks } from '../lib/socialLinks';
import { BUSINESS } from '../lib/business';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  useGSAP(() => {
    gsap.from('.footer-content', {
      scrollTrigger: {
        trigger: footerRef.current,
        start: 'top bottom',
        end: 'bottom bottom',
        scrub: true,
      },
      yPercent: -40,
      ease: 'none'
    });
  }, { scope: footerRef });

  return (
    <footer ref={footerRef} className="bg-[#1a1a1a] text-[#fcfbf9] overflow-hidden relative pt-32 pb-6 px-6 md:px-12 flex flex-col justify-end mt-4 rounded-t-[2rem] md:rounded-t-[3rem]">
      <div className="footer-content relative z-10 w-full pointer-events-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-8 mb-32 md:mb-48 max-w-screen-2xl mx-auto">
          <div className="md:col-span-5 flex flex-col justify-between">
            <div>
              <h2 className="font-serif text-5xl md:text-6xl italic tracking-wider mb-8 font-light">Simvorae</h2>
              <p className="font-sans text-[13px] tracking-wide text-stone-400 max-w-sm leading-loose">
                Elevating the everyday through meticulous craftsmanship and timeless design.
              </p>
            </div>
            {/* Business identity in the footer: Razorpay reviewers look for it on every page. */}
            <div className="mt-16 font-sans text-[11px] leading-loose tracking-wide text-stone-500">
              <p>{BUSINESS.legalName}</p>
              <p>{BUSINESS.address}</p>
              <p>{BUSINESS.careEmail}</p>
            </div>
          </div>
          
          <div className="md:col-span-2 md:col-start-8">
            <h4 className="font-sans text-[9px] tracking-[0.2em] uppercase mb-8 md:mb-12 text-stone-600">Navigation</h4>
            <ul className="flex flex-col gap-5 md:gap-6 font-serif text-xl md:text-2xl font-light">
              <li><Link to="/shop" className="hover:italic hover:text-stone-300 transition-all inline-block hover:translate-x-2 cursor-pointer">Shop</Link></li>
              <li><Link to="/about" className="hover:italic hover:text-stone-300 transition-all inline-block hover:translate-x-2 cursor-pointer">About Us</Link></li>
            </ul>
          </div>
          
          <div className="md:col-span-2 md:col-start-11">
            <h4 className="font-sans text-[9px] tracking-[0.2em] uppercase mb-8 md:mb-12 text-stone-600">Support</h4>
            <ul className="flex flex-col gap-5 md:gap-6 font-serif text-xl md:text-2xl font-light">
              <li><Link to="/contact" className="hover:italic hover:text-stone-300 transition-all inline-block hover:translate-x-2 cursor-pointer">Contact Us</Link></li>
              <li><Link to="/shipping-delivery" className="hover:italic hover:text-stone-300 transition-all inline-block hover:translate-x-2 cursor-pointer">Shipping and Delivery</Link></li>
              <li><Link to="/cancellation-returns-refunds" className="hover:italic hover:text-stone-300 transition-all inline-block hover:translate-x-2 cursor-pointer">Cancellation and Refunds</Link></li>
              <li><Link to="/contact" className="hover:italic hover:text-stone-300 transition-all inline-block hover:translate-x-2 cursor-pointer">Grievance Redressal</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center pt-8 border-t border-white/10 max-w-screen-2xl mx-auto font-sans text-[9px] tracking-[0.2em] uppercase text-stone-600 gap-8">
          <p>&copy; {new Date().getFullYear()} Simvorae Fashion. <br className="md:hidden"/>All rights reserved.</p>
          
          <div className="flex flex-wrap gap-x-8 gap-y-3 relative z-10 w-full md:w-auto justify-between md:justify-end">
            <Link to="/terms" className="hover:text-white transition-colors cursor-pointer">Terms and Conditions</Link>
            <Link to="/privacy" className="hover:text-white transition-colors cursor-pointer">Privacy Policy</Link>
            {socialLinks.map((link) => (
              <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors relative group overflow-hidden cursor-pointer">
                <span className="inline-block group-hover:-translate-y-full transition-transform duration-300">{link.label}</span>
                <span className="inline-block absolute left-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
      
      {/* Massive Background Text */}
      <div className="font-serif text-[16vw] leading-[0.75] tracking-tighter italic text-[#fcfbf9]/5 select-none pointer-events-none self-center mt-12 mb-[-4vw]">
        SIMVORAE
      </div>
    </footer>
  );
}
