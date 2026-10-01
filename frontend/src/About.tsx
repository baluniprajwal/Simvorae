import { Link } from 'react-router-dom';
import { PolicyPage } from './Policies';
import { BUSINESS } from './lib/business';
import { usePageTitle } from './lib/usePageTitle';

// Only facts the store itself supports belong here; Razorpay reviews this page against the
// business details on the account.
export default function About() {
  usePageTitle('About Us');

  return (
    <PolicyPage
      title="About Us"
      sideLabel="About Simvorae"
      introduction={`${BUSINESS.brand} is a premium and luxury handbag brand from India, selling directly to customers through this website.`}
      sections={[
        {
          title: 'Who We Are',
          items: [
            `${BUSINESS.brand} is operated by ${BUSINESS.legalName}.`,
            `Registered business address: ${BUSINESS.address}`,
          ],
        },
        {
          title: 'What We Sell',
          items: [
            'Premium handbags, offered through the Shop page of this website.',
            'Each product page shows the price, material and colour of the piece, and whether it is in stock.',
          ],
        },
        {
          title: 'Pricing and Payment',
          items: [
            'All prices are listed in Indian Rupees (INR) on the Shop and product pages.',
            'The total amount payable is shown at checkout before payment is made. Shipping is currently complimentary across India.',
            'Prices shown in other currencies are estimates for convenience only; payment is charged in INR.',
            'Payments are processed securely by Razorpay using UPI, cards, net banking or wallets. We do not store card details.',
          ],
        },
        {
          title: 'Delivery and Returns',
          items: [
            'Orders are generally dispatched within 1–3 business days and delivered within 3–7 business days after dispatch.',
            'Orders may be cancelled within 24 hours of purchase if they have not been dispatched.',
            'Eligible products may be returned or exchanged within 7 days of delivery.',
          ],
        },
        {
          title: 'Contact',
          items: [
            `Email: ${BUSINESS.careEmail}`,
            `Phone / WhatsApp: ${BUSINESS.phone}`,
            `Support Hours: ${BUSINESS.supportHours}`,
          ],
        },
      ]}
    >
      <div className="flex flex-wrap gap-x-8 gap-y-4 text-[10px] uppercase tracking-[0.2em]">
        <Link to="/shop" className="border-b border-[#1a1a1a] pb-1 transition-opacity hover:opacity-50">Shop the Collection</Link>
        <Link to="/shipping-delivery" className="border-b border-[#1a1a1a] pb-1 transition-opacity hover:opacity-50">Shipping and Delivery</Link>
        <Link to="/cancellation-returns-refunds" className="border-b border-[#1a1a1a] pb-1 transition-opacity hover:opacity-50">Cancellation and Refunds</Link>
        <Link to="/contact" className="border-b border-[#1a1a1a] pb-1 transition-opacity hover:opacity-50">Contact Us</Link>
      </div>
    </PolicyPage>
  );
}
