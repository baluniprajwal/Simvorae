import { X, Minus, Plus } from 'lucide-react';
import { useCartStore } from './store/cartStore';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from './contexts/ToastContext';

export default function Cart() {
  const { items, isOpen, toggleCart, removeItem, updateQuantity, getCartTotal, getCartCount } = useCartStore();
  const navigate = useNavigate();
  const { showError } = useToast();

  // Prevent scrolling when cart is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/40 z-[990] backdrop-blur-sm transition-opacity duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleCart}
      />
      
      {/* Cart Drawer - Added pt-0 so we can control padding explicitly, avoiding interference from general mobile nav paddings */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[550px] bg-[#fcfbf9] z-[991] shadow-2xl flex flex-col transform transition-transform duration-500 ease-[cubic-bezier(0.2,1,0.2,1)] ${isOpen ? 'translate-x-0' : 'translate-x-[100%]'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 md:p-8 border-b border-[#1a1a1a]/10">
          <h2 className="font-serif text-2xl tracking-tight">Your Bag ({getCartCount()})</h2>
          <button 
            onClick={toggleCart}
            className="p-2 hover:bg-[#1a1a1a]/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-500">
              <p className="text-sm font-light mb-6">Your bag is empty.</p>
              <button 
                onClick={toggleCart}
                className="text-[10px] tracking-widest uppercase font-bold text-[#1a1a1a] border-b border-[#1a1a1a] pb-1 hover:text-stone-500 hover:border-stone-500 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6 p-6 md:p-8">
              {items.map((item) => (
                <div key={item.id} className="flex gap-6">
                  {/* Image */}
                  <Link to={`/product/${item.id}`} onClick={toggleCart} className="w-24 aspect-[4/5] overflow-hidden bg-stone-100 rounded-md">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover mix-blend-multiply" />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 flex flex-col py-1">
                    <div className="flex justify-between items-start mb-1">
                      <Link to={`/product/${item.id}`} onClick={toggleCart} className="font-medium text-base hover:text-stone-500 transition-colors">
                        {item.name}
                      </Link>
                      <span className="font-medium">₹{item.price.toLocaleString('en-IN')}</span>
                    </div>
                    
                    <div className="flex-1"></div>

                    <div className="flex items-center justify-between">
                      {/* Quantity Control */}
                      <div className="flex items-center border border-[#1a1a1a]/20 rounded-md">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-3 py-1.5 hover:bg-[#1a1a1a]/5 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm w-6 text-center font-medium">{item.quantity}</span>
                        <button 
                          onClick={() => {
                            if (item.stockQuantity && item.quantity >= item.stockQuantity) {
                              showError(`Only ${item.stockQuantity} available for ${item.name}.`);
                              return;
                            }

                            updateQuantity(item.id, item.quantity + 1);
                          }}
                          className="px-3 py-1.5 hover:bg-[#1a1a1a]/5 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button 
                        onClick={() => removeItem(item.id)}
                        className="text-[10px] uppercase tracking-widest text-stone-400 hover:text-[#1a1a1a] transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 md:p-8 bg-stone-50 border-t border-[#1a1a1a]/10">
            <div className="flex justify-between items-center mb-6 text-lg font-medium">
              <span>Subtotal</span>
              <span>₹{getCartTotal().toLocaleString('en-IN')}</span>
            </div>
            <p className="text-xs text-stone-500 mb-6 font-light">Taxes and shipping calculated at checkout.</p>
            <button onClick={() => { toggleCart(); navigate('/checkout'); }} className="w-full py-5 bg-[#1a1a1a] text-[#fcfbf9] text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-black transition-colors">
              Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
