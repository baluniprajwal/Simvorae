import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { BUSINESS } from './lib/business';

export type PolicySection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

export function PolicyPage({
  title,
  introduction,
  sections,
  children,
  sideLabel = 'Simvorae Policies',
}: {
  title: string;
  introduction: string;
  sections: PolicySection[];
  children?: ReactNode;
  sideLabel?: string;
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
            <p className="sticky top-32 text-[9px] uppercase tracking-[0.25em] text-stone-400">{sideLabel}</p>
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
      introduction="At Simvorae, every order is prepared with care and attention to detail. We want your experience with us to be as exceptional as the product itself. This policy explains when an order may be canceled, returned, exchanged or refunded."
      sections={[
        {
          title: 'Order Cancellation',
          items: [
            'Customers may request cancellation within 24 hours of placing an order, provided the order has not already been dispatched.',
            'Once an order has been dispatched, cancellation may no longer be possible and the applicable return process will apply.',
            `Cancellation requests should include the order number and be sent to ${BUSINESS.careEmail}.`,
          ],
        },
        {
          title: 'Returns',
          items: [
            'Eligible products may be returned within 7 days of delivery.',
            'Products must be unused, unworn and in their original condition, with original packaging, tags and accessories where applicable.',
            'Products showing signs of use, damage, alteration, washing, wear or missing original packaging may be declined for return.',
            'Products that are customized, personalized, hygiene-sensitive or specifically identified as non-returnable on the product page may not be eligible for return.',
          ],
        },
        {
          title: 'Exchanges',
          items: [
            'Eligible products may be exchanged within 7 days of delivery, subject to availability.',
            'If the requested replacement is unavailable, Simvorae may offer an alternative resolution or refund in accordance with this policy.',
          ],
        },
        {
          title: 'Damaged, Defective or Incorrect Products',
          items: [
            'If a customer receives a damaged, defective or incorrect product, Simvorae should be contacted within 48 hours of delivery.',
            'Customers should provide the order number and clear photographs/video of the product and packaging to help the team assess the issue.',
          ],
        },
        {
          title: 'Refunds',
          items: [
            'Approved refunds will be initiated after the returned product is received and inspected.',
            'Refunds will generally be processed within 5–7 business days after approval. Bank/payment-provider processing time may vary.',
            'Where applicable, refunds will be made to the original payment method.',
          ],
        },
        {
          title: 'Return Shipping',
          items: [
            'For damaged, defective or incorrect products, Simvorae will provide an appropriate resolution and, where applicable, cover the return shipping cost.',
            'For change-of-mind returns, Simvorae may deduct or charge applicable return shipping costs where permitted and communicated to the customer.',
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
      introduction="Simvorae aims to deliver every order securely and within a reasonable time frame while maintaining the quality of the customer experience."
      sections={[
        {
          title: 'Order Processing and Dispatch',
          items: [
            'Orders are generally processed and dispatched within 1–3 business days after successful payment confirmation.',
            'Orders placed on weekends or public holidays may be processed on the next business day.',
            'Made-to-order, customized or special items may require additional processing time, which will be communicated where applicable.',
          ],
        },
        {
          title: 'Delivery Timeline',
          items: [
            'Standard delivery is generally expected within 3–7 business days after dispatch, depending on destination and courier service.',
            'Remote locations, peak sale periods, public holidays, weather conditions or courier disruptions may result in additional delivery time.',
          ],
        },
        {
          title: 'Shipping Charges',
          items: [
            'Shipping charges, if applicable, will be displayed during checkout before payment is completed.',
            'Promotional free-shipping offers will be subject to the terms displayed with the promotion.',
          ],
        },
        {
          title: 'Tracking',
          items: [
            'Where tracking is available, tracking information will be shared with the customer after dispatch.',
            'Customers should ensure that their phone number, email address and delivery address are accurate at checkout.',
          ],
        },
        {
          title: 'Delivery Issues',
          items: [
            'If a parcel is delayed, marked delivered but not received, or returned because of an incorrect/incomplete address, customers should contact Simvorae promptly.',
            'For address-related re-shipping, additional delivery charges may apply where applicable.',
          ],
        },
        {
          title: 'Unforeseen Delays',
          items: [
            'Simvorae is not responsible for delays caused by events beyond its reasonable control, including natural events, public disruptions, courier interruptions or regulatory restrictions.',
            'Simvorae will nevertheless make reasonable efforts to assist customers in resolving delivery issues.',
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
      introduction="Welcome to Simvorae. By accessing our website or purchasing our products, you agree to comply with and be bound by these Terms and Conditions. Please read them carefully before using the website or placing an order."
      sections={[
        {
          title: 'Website Use',
          items: [
            'Customers must use the website lawfully and provide accurate information when placing an order or creating an account.',
            'Simvorae may restrict access where misuse, fraud or unlawful activity is reasonably suspected.',
          ],
        },
        {
          title: 'Products and Product Information',
          items: [
            'Simvorae makes reasonable efforts to ensure product descriptions, images, colours, sizes and specifications are accurate.',
            'Minor variations may occur due to photography, screen settings, materials and manufacturing characteristics.',
          ],
        },
        {
          title: 'Pricing and Availability',
          items: [
            'Prices and product availability may change without prior notice, subject to applicable law.',
            'If a material pricing or listing error is identified, Simvorae may contact the customer to confirm the order or provide an appropriate resolution.',
          ],
        },
        {
          title: 'Orders and Payments',
          items: [
            'An order is considered confirmed after successful payment authorization and order confirmation, subject to product availability.',
            "Payments may be processed through third-party payment providers. Customers should review the applicable payment provider's terms where relevant.",
          ],
        },
        {
          title: 'Cancellation, Returns and Refunds',
          items: [
            "Cancellation, return, exchange and refund requests are governed by Simvorae's Cancellation, Return, Exchange and Refund Policy.",
          ],
        },
        {
          title: 'Intellectual Property',
          items: [
            'The Simvorae name, branding, logos, website content, product imagery, text, graphics and other original materials are owned by Simvorae or its licensors and protected by applicable law.',
            'Website content may not be reproduced, copied, modified or commercially exploited without prior written permission, except as permitted by law.',
          ],
        },
        {
          title: 'Changes to Terms',
          items: [
            'Simvorae may update website content, policies, products or services from time to time. The latest version published on the website will apply from its effective date.',
          ],
        },
        {
          title: 'Governing Law and Jurisdiction',
          items: [
            'These Terms and Conditions shall be governed by the laws applicable in India.',
            `Any dispute shall be subject to the jurisdiction of the courts at ${BUSINESS.jurisdiction}, India, subject to applicable law.`,
          ],
        },
      ]}
    />
  );
}

export function PrivacyPolicy() {
  return (
    <PolicyPage
      title="Privacy Policy"
      introduction="Simvorae respects customer privacy and is committed to handling personal information responsibly. This policy explains the types of information that may be collected and how it may be used."
      sections={[
        {
          title: 'Information We May Collect',
          items: [
            'Name, billing and shipping address, email address, phone number and order information.',
            'Payment-related information necessary to process an order. When payment is handled by a third-party payment provider, Simvorae does not need to store complete card details.',
            'Website usage information such as device, browser, IP address, cookies and similar technical information, where applicable.',
          ],
        },
        {
          title: 'How We Use Information',
          items: [
            'To process and fulfil orders and payments.',
            'To provide customer support and communicate about orders, returns, delivery or service issues.',
            'To improve website functionality, customer experience, products and services.',
            'To comply with applicable legal, tax, accounting and regulatory requirements.',
          ],
        },
        {
          title: 'Third-Party Service Providers',
          items: [
            'Simvorae may share relevant information with trusted service providers such as payment processors, courier/logistics providers, technology providers and customer-support partners when necessary to provide the requested service.',
            'Such sharing is limited to what is reasonably necessary for the relevant purpose.',
          ],
        },
        {
          title: 'Cookies',
          items: [
            'The website may use cookies and similar technologies to maintain functionality, remember preferences, understand website usage and improve the customer experience.',
          ],
        },
        {
          title: 'Data Security',
          items: [
            'Simvorae takes reasonable administrative and technical measures to protect customer information from unauthorized access, misuse or disclosure.',
            'No online transmission or storage system can be guaranteed to be completely secure.',
          ],
        },
        {
          title: 'Customer Privacy Requests',
          items: [
            `For questions regarding personal information, correction requests or privacy concerns, contact ${BUSINESS.privacyEmail}.`,
          ],
        },
        {
          title: 'Policy Updates',
          items: [
            'This Privacy Policy may be updated periodically. The latest version published on the website will apply from its effective date.',
          ],
        },
      ]}
    />
  );
}

export function ContactGrievancePolicy() {
  return (
    <PolicyPage
      title="Contact Us / Grievance Redressal"
      introduction="We believe premium service means being available when our customers need assistance. Our customer-care team is available to help with orders, delivery, returns, exchanges and other concerns."
      sections={[
        {
          title: 'Customer Care',
          items: [
            `Brand: ${BUSINESS.brand}`,
            `Email: ${BUSINESS.careEmail}`,
            `Phone / WhatsApp: ${BUSINESS.phone}`,
            `Business / Registered Address: ${BUSINESS.address}`,
            `Support Hours: ${BUSINESS.supportHours}`,
            `Typical Response Time: ${BUSINESS.responseTime}`,
          ],
        },
        {
          title: 'Grievance Redressal',
          paragraphs: [
            'For complaints that remain unresolved through customer support, customers may contact the designated Grievance Officer using the details below.',
          ],
          items: [
            `Grievance Officer: ${BUSINESS.grievanceOfficer}`,
            `Email: ${BUSINESS.grievanceEmail}`,
            `Phone: ${BUSINESS.grievancePhone}`,
            `Address: ${BUSINESS.grievanceAddress}`,
          ],
        },
        {
          title: 'How to Raise a Concern',
          items: [
            'Please include your name, order number (if applicable), contact information and a concise description of the issue.',
            'Simvorae will review the concern and make reasonable efforts to respond and resolve it within applicable legal and operational timelines.',
          ],
        },
        {
          title: 'Contact Details',
          items: [
            `Customer Care: ${BUSINESS.careEmail}`,
            `Grievance Redressal: ${BUSINESS.grievanceEmail}`,
          ],
        },
      ]}
    >
      <div className="flex flex-wrap gap-8">
        <a href={`mailto:${BUSINESS.careEmail}`} className="inline-flex border-b border-[#1a1a1a] pb-1 text-[10px] uppercase tracking-[0.2em] transition-opacity hover:opacity-50">
          Email Customer Care
        </a>
        <a href={`mailto:${BUSINESS.grievanceEmail}`} className="inline-flex border-b border-[#1a1a1a] pb-1 text-[10px] uppercase tracking-[0.2em] transition-opacity hover:opacity-50">
          Email Grievance Officer
        </a>
      </div>
    </PolicyPage>
  );
}
