import { Link } from 'react-router-dom';
import { socialLinks } from '../lib/socialLinks';
import { BUSINESS } from '../lib/business';
import BrandWordmark from './BrandWordmark';

export default function Footer() {
  return (
    <footer className="bg-[#1a1a1a] text-[#fcfbf9] overflow-hidden relative pt-24 md:pt-28 pb-6 px-6 md:px-12 flex flex-col justify-end mt-4 rounded-t-[2rem] md:rounded-t-[3rem]">
      <div className="footer-content relative z-10 w-full pointer-events-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 mb-20 md:mb-28 max-w-screen-2xl mx-auto">
          <div className="md:col-span-5 flex flex-col justify-between text-center md:text-left">
            <div>
              <Link to="/" aria-label="Simvorae home" className="mb-7 inline-block cursor-pointer transition-opacity hover:opacity-70"><BrandWordmark /></Link>
              <p className="font-sans text-[13px] tracking-wide text-stone-400 max-w-sm mx-auto md:mx-0 leading-loose">
                Elevating the everyday through meticulous craftsmanship and timeless design.
              </p>
            </div>
            {/* Business identity in the footer: Razorpay reviewers look for it on every page. */}
            <div className="mt-10 font-sans text-[11px] leading-loose tracking-wide text-stone-400">
              <p>{BUSINESS.legalName}</p>
              <p>{BUSINESS.address}</p>
              <p>{BUSINESS.careEmail}</p>
            </div>
          </div>
          
          <div className="md:col-span-2 md:col-start-8">
            <h4 className="font-sans text-[9px] tracking-[0.2em] uppercase mb-8 md:mb-12 text-stone-600">Navigation</h4>
            <ul className="flex flex-col gap-5 md:gap-6 font-serif text-xl md:text-2xl font-light">
              <li><Link to="/shop" className="inline-block max-w-full cursor-pointer transition-[color,transform] duration-200 hover:translate-x-2 hover:text-stone-300 motion-reduce:transition-none">Shop</Link></li>
              <li><Link to="/about" className="inline-block max-w-full cursor-pointer transition-[color,transform] duration-200 hover:translate-x-2 hover:text-stone-300 motion-reduce:transition-none">About Us</Link></li>
            </ul>
          </div>
          
          <div className="md:col-span-2 md:col-start-11">
            <h4 className="font-sans text-[9px] tracking-[0.2em] uppercase mb-8 md:mb-12 text-stone-600">Support</h4>
            <ul className="flex flex-col gap-5 md:gap-6 font-serif text-xl md:text-2xl font-light">
              <li><Link to="/contact" className="inline-block max-w-full cursor-pointer transition-[color,transform] duration-200 hover:translate-x-2 hover:text-stone-300 motion-reduce:transition-none">Contact Us</Link></li>
              <li><Link to="/shipping-delivery" className="inline-block max-w-full cursor-pointer transition-[color,transform] duration-200 hover:translate-x-2 hover:text-stone-300 motion-reduce:transition-none">Shipping and Delivery</Link></li>
              <li><Link to="/cancellation-returns-refunds" className="inline-block max-w-full cursor-pointer transition-[color,transform] duration-200 hover:translate-x-2 hover:text-stone-300 motion-reduce:transition-none">Cancellation and Refunds</Link></li>
              <li><Link to="/contact" className="inline-block max-w-full cursor-pointer transition-[color,transform] duration-200 hover:translate-x-2 hover:text-stone-300 motion-reduce:transition-none">Grievance Redressal</Link></li>
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
      
      {/* Decorative watermark uses the same lettering as the main logo. */}
      <div className="text-[#fcfbf9]/5 select-none pointer-events-none self-center mt-12 mb-[-2vw]">
        <BrandWordmark decorative />
      </div>
    </footer>
  );
}
