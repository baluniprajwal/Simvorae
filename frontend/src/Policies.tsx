import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

type PolicySection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

function PolicyPage({
  title,
  introduction,
  sections,
  children,
}: {
  title: string;
  introduction: string;
  sections: PolicySection[];
  children?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fcfbf9] font-sans text-[#1a1a1a]">
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-6 pb-24 pt-36 md:px-12 md:pb-36 md:pt-48">
        <motion.header
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.2, 1, 0.2, 1] }}
          className="border-b border-[#1a1a1a] pb-12 md:pb-16"
        >
          <p className="mb-7 text-[9px] uppercase tracking-[0.3em] text-stone-400">Customer Information</p>
          <h1 className="max-w-5xl font-serif text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-tighter">{title}</h1>
          <p className="mt-8 max-w-2xl text-[13px] font-normal leading-7 text-stone-500 md:text-sm">{introduction}</p>
        </motion.header>

        <div className="grid grid-cols-1 gap-12 pt-12 md:grid-cols-12 md:gap-16 md:pt-20">
          <aside className="md:col-span-3">
            <p className="sticky top-32 text-[9px] uppercase tracking-[0.25em] text-stone-400">Simvorae Policies</p>
          </aside>
          <div className="space-y-14 md:col-span-8 md:col-start-5">
            {sections.map((section, index) => (
              <section key={section.title} className="border-b border-stone-200 pb-12 last:border-0">
                <div className="mb-6 flex items-start gap-5">
                  <span className="pt-1 text-[9px] tracking-widest text-stone-400">{String(index + 1).padStart(2, '0')}</span>
                  <h2 className="font-serif text-2xl leading-tight md:text-3xl">{section.title}</h2>
                </div>
                <div className="space-y-4 pl-10 text-[12px] font-normal leading-7 text-stone-600 md:text-[13px]">
                  {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.items && (
                    <ul className="space-y-3">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="mt-[0.7rem] h-px w-3 shrink-0 bg-stone-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function CancellationReturnsPolicy() {
  return (
    <PolicyPage
      title="Cancellation, Return, Exchange and Refund Policy"
      introduction="Every order is prepared with care and attention to detail. This policy explains when an order may be cancelled, returned, exchanged or refunded."
      sections={[
        {
          title: 'Order Cancellation',
          items: [
            'Customers may request cancellation within 24 hours of placing an order, provided the order has not already been dispatched.',
            'Once an order has been dispatched, cancellation may no longer be possible and the applicable return process will apply.',
            'Cancellation requests should include the order number and be submitted through the order page or Customer Care.',
          ],
        },
        {
          title: 'Returns',
          items: [
            'Eligible products may be returned within 7 days of delivery.',
            'Products must be unused, unworn and in their original condition, with original packaging, tags and accessories where applicable.',
            'Products showing signs of use, damage, alteration, washing, wear or missing original packaging may be declined for return.',
            'Customized, personalized, hygiene-sensitive products and products identified as non-returnable on their product page are not eligible for return.',
          ],
        },
        {
          title: 'Exchanges',
          items: [
            'Eligible products may be exchanged within 7 days of delivery, subject to availability.',
            'If the requested replacement is unavailable, Simvorae may offer an alternative resolution or a refund under this policy.',
          ],
        },
        {
          title: 'Damaged, Defective or Incorrect Products',
          items: [
            'Contact Customer Care within 48 hours of delivery if an item is damaged, defective or incorrect.',
            'Include the order number and clear photographs or video of the product and packaging so the issue can be assessed.',
          ],
        },
        {
          title: 'Refunds',
          items: [
            'Approved refunds are initiated after the returned product is received and inspected.',
            'Refunds are generally processed within 5-7 business days after approval. Bank or payment-provider processing times may vary.',
            'Where applicable, refunds are made to the original payment method.',
          ],
        },
        {
          title: 'Return Shipping',
          items: [
            'For damaged, defective or incorrect products, Simvorae will provide an appropriate resolution and cover return shipping where applicable.',
            'For change-of-mind returns, applicable return shipping costs may be charged or deducted where permitted and communicated to the customer.',
          ],
        },
      ]}
    />
  );
}

export function ShippingDeliveryPolicy() {
  return (
    <PolicyPage
      title="Shipping and Delivery Policy"
      introduction="Simvorae aims to deliver every order securely and within a reasonable timeframe while maintaining the quality of the customer experience."
      sections={[
        {
          title: 'Order Processing and Dispatch',
          items: [
            'Orders are generally processed and dispatched within 1-3 business days after successful payment confirmation.',
            'Orders placed on weekends or public holidays may be processed on the next business day.',
            'Made-to-order, customized or special items may require additional processing time, which will be communicated where applicable.',
          ],
        },
        {
          title: 'Delivery Timeline',
          items: [
            'Standard delivery is generally expected within 3-7 business days after dispatch, depending on destination and courier service.',
            'Remote locations, peak sale periods, public holidays, weather conditions or courier disruptions may result in additional delivery time.',
          ],
        },
        {
          title: 'Shipping Charges',
          items: [
            'Shipping charges, if applicable, are displayed during checkout before payment is completed.',
            'Promotional free-shipping offers are subject to the terms displayed with the promotion.',
          ],
        },
        {
          title: 'Tracking',
          items: [
            'Where tracking is available, tracking information is shared after dispatch.',
            'Customers should ensure their phone number, email address and delivery address are accurate at checkout.',
          ],
        },
        {
          title: 'Delivery Issues',
          items: [
            'If a parcel is delayed, marked delivered but not received, or returned due to an incorrect or incomplete address, contact Customer Care promptly.',
            'Additional delivery charges may apply to address-related re-shipping where applicable.',
          ],
        },
        {
          title: 'Unforeseen Delays',
          items: [
            'Simvorae is not responsible for delays caused by events beyond its reasonable control, including natural events, public disruptions, courier interruptions or regulatory restrictions.',
            'Simvorae will make reasonable efforts to assist customers in resolving delivery issues.',
          ],
        },
      ]}
    />
  );
}

export function TermsConditionsPolicy() {
  return (
    <PolicyPage
      title="Terms and Conditions"
      introduction="By accessing this website or purchasing Simvorae products, you agree to comply with these Terms and Conditions. Please read them before using the website or placing an order."
      sections={[
        { title: 'Website Use', items: ['Customers must use the website lawfully and provide accurate information when placing an order or creating an account.', 'Simvorae may restrict access where misuse, fraud or unlawful activity is reasonably suspected.'] },
        { title: 'Products and Product Information', items: ['Simvorae makes reasonable efforts to ensure product descriptions, images, colours, sizes and specifications are accurate.', 'Minor variations may occur due to photography, screen settings, materials and manufacturing characteristics.'] },
        { title: 'Pricing and Availability', items: ['Prices and product availability may change without prior notice, subject to applicable law.', 'If a material pricing or listing error is identified, Simvorae may contact the customer to confirm the order or provide an appropriate resolution.'] },
        { title: 'Orders and Payments', items: ['An order is confirmed after successful payment authorization and order confirmation, subject to product availability.', 'Payments may be processed through third-party payment providers. Their applicable terms may also apply.'] },
        { title: 'Cancellation, Returns and Refunds', paragraphs: ["Cancellation, return, exchange and refund requests are governed by Simvorae's Cancellation, Return, Exchange and Refund Policy."] },
        { title: 'Intellectual Property', items: ['The Simvorae name, branding, logos, website content, product imagery, text, graphics and other original materials are owned by Simvorae or its licensors and protected by applicable law.', 'Website content may not be reproduced, copied, modified or commercially exploited without prior written permission, except as permitted by law.'] },
        { title: 'Changes to Terms', paragraphs: ['Simvorae may update website content, policies, products or services from time to time. The latest published version applies from its effective date.'] },
        { title: 'Governing Law and Jurisdiction', paragraphs: ['These Terms and Conditions are governed by the laws applicable in India. Disputes are subject to the jurisdiction of the competent courts under applicable law.'] },
      ]}
    />
  );
}

export function PrivacyPolicy() {
  return (
    <PolicyPage
      title="Privacy Policy"
      introduction="Simvorae respects customer privacy and is committed to handling personal information responsibly. This policy explains the information we collect and how it may be used."
      sections={[
        { title: 'Information We May Collect', items: ['Name, billing and shipping address, email address, phone number and order information.', 'Payment-related information necessary to process an order. When a third-party provider handles payment, Simvorae does not store complete card details.', 'Website usage information such as device, browser, IP address, cookies and similar technical information, where applicable.'] },
        { title: 'How We Use Information', items: ['To process and fulfil orders and payments.', 'To provide customer support and communicate about orders, returns, delivery or service issues.', 'To improve website functionality, customer experience, products and services.', 'To comply with applicable legal, tax, accounting and regulatory requirements.'] },
        { title: 'Third-Party Service Providers', items: ['Relevant information may be shared with trusted payment, courier, logistics, technology and customer-support providers when necessary to deliver the requested service.', 'Such sharing is limited to what is reasonably necessary for the relevant purpose.'] },
        { title: 'Cookies', paragraphs: ['The website may use cookies and similar technologies to maintain functionality, remember preferences, understand usage and improve the customer experience.'] },
        { title: 'Data Security', items: ['Simvorae takes reasonable administrative and technical measures to protect customer information from unauthorized access, misuse or disclosure.', 'No online transmission or storage system can be guaranteed to be completely secure.'] },
        { title: 'Customer Privacy Requests', paragraphs: ['For questions, correction requests or privacy concerns, contact Customer Care through the Contact Us page.'] },
        { title: 'Policy Updates', paragraphs: ['This Privacy Policy may be updated periodically. The latest version published on the website applies from its effective date.'] },
      ]}
    />
  );
}

export function ContactGrievancePolicy() {
  return (
    <PolicyPage
      title="Contact Us / Grievance Redressal"
      introduction="Our customer-care team is available to help with orders, delivery, returns, exchanges and other concerns."
      sections={[
        {
          title: 'Customer Care',
          items: [
            'Brand: Simvorae',
            'Email: contact@simvorae.com',
            'Support hours: Monday-Saturday, 10:00 AM-6:00 PM IST',
            'Typical response time: within 24-48 business hours.',
          ],
        },
        {
          title: 'Grievance Redressal',
          paragraphs: ['For complaints that remain unresolved through Customer Care, request escalation in the same email thread. The designated grievance contact details will be published after confirmation by the business owner.'],
        },
        {
          title: 'How to Raise a Concern',
          items: ['Include your name, order number where applicable, contact information and a concise description of the issue.', 'Simvorae will review the concern and make reasonable efforts to respond and resolve it within applicable legal and operational timelines.'],
        },
      ]}
    >
      <a href="mailto:contact@simvorae.com" className="inline-flex border-b border-[#1a1a1a] pb-1 text-[10px] uppercase tracking-[0.2em] transition-opacity hover:opacity-50">
        Email Customer Care
      </a>
    </PolicyPage>
  );
}
