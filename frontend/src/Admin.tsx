import { type ChangeEvent, type DragEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  DollarSign,
  Edit2,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  Trash2,
  TrendingUp,
  UploadCloud,
  User,
  X,
} from 'lucide-react';
import { type Order, type OrderStatus, useOrderStore } from './store/orderStore';
import { type ProductStoreItem, useProductStore } from './store/productStore';
import { useToast } from './contexts/ToastContext';
import { clearAdminToken } from './lib/adminAuth';

type AdminTab = 'OVERVIEW' | 'CATALOG' | 'ORDERS' | 'CUSTOMERS';
type DashboardRange = 'week' | 'month' | 'year' | 'all' | 'custom';
type OrderQueue = 'all' | 'newPaid' | 'toPack' | 'readyToShip' | 'inTransit' | 'delivered' | 'problems';

type ProductFormState = {
  name: string;
  price: number;
  category: string;
  material: string;
  color: string;
  images: string[];
  description: string;
  keyFeaturesText: string;
  whyLoveIt: string;
  dimensions: string;
  shippingReturns: string;
  moreInformation: string;
  packageLengthCm: number;
  packageBreadthCm: number;
  packageHeightCm: number;
  packageWeightKg: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
};

type CustomerSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  joinedAt: string;
  orderCount: number;
  totalSpent: number;
  recentOrders: Order[];
};

const categoryOptions = ['Classic Tote', 'Hobo Shoulder Bag', 'Top Handle Bag', 'Crossbody Bag', 'Chain Clutch'];
const categoryChartColors = ['#1a1a1a', '#57534e', '#a8a29e', '#d6d3d1', '#e7e5e4'];
const colorOptions = ['Black', 'Brown', 'Tan', 'White', 'Silver', 'Gold', 'Beige'];
const materialOptions = ['Calfskin', 'Full Grain Leather', 'Vegan Leather', 'Suede', 'Exotic Leather', 'Silk/Leather'];
const orderStatuses: OrderStatus[] = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
const dashboardRangeOptions: Array<{ value: DashboardRange; label: string }> = [
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Date Wise' },
];

const orderQueueOptions: Array<{ value: OrderQueue; label: string; description: string }> = [
  { value: 'all', label: 'All', description: 'Every order' },
  { value: 'newPaid', label: 'New Paid', description: 'Paid and confirmed' },
  { value: 'toPack', label: 'To Pack', description: 'Needs packing' },
  { value: 'readyToShip', label: 'Ready To Ship', description: 'Packed, no shipment' },
  { value: 'inTransit', label: 'In Transit', description: 'With courier' },
  { value: 'delivered', label: 'Delivered', description: 'Completed' },
  { value: 'problems', label: 'Problems', description: 'Failed/cancelled' },
];

const catalogPageSize = 8;
const orderPageSize = 10;
const customerPageSize = 8;

const adminTabRoutes: Record<AdminTab, string> = {
  OVERVIEW: '/admin/overview',
  CATALOG: '/admin/catalog',
  ORDERS: '/admin/orders',
  CUSTOMERS: '/admin/customers',
};

const adminPathToTab = (pathname: string): AdminTab => {
  if (pathname.startsWith('/admin/catalog')) {
    return 'CATALOG';
  }

  if (pathname.startsWith('/admin/orders')) {
    return 'ORDERS';
  }

  if (pathname.startsWith('/admin/customers')) {
    return 'CUSTOMERS';
  }

  return 'OVERVIEW';
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const getDateKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const getMonthKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  }).format(date);

const getStartOfDay = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const getDateRangeLabel = (range: DashboardRange, customStartDate: string, customEndDate: string) => {
  if (range === 'custom') {
    if (!customStartDate || !customEndDate) {
      return 'Custom Range';
    }

    const start = new Date(`${customStartDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const end = new Date(`${customEndDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${start} - ${end}`;
  }

  const labels: Record<DashboardRange, string> = {
    week: 'Last 7 Days',
    month: 'Last 30 Days',
    year: 'Last 12 Months',
    all: 'All Time',
    custom: 'Custom Range',
  };

  return labels[range];
};

const createEmptyForm = (): ProductFormState => ({
  name: '',
  price: 35000,
  category: 'Classic Tote',
  material: 'Calfskin',
  color: 'Black',
  images: [],
  description: '',
  keyFeaturesText: 'Fits 15\" Laptop\nMultiple Functional Pockets\nZipper Closure',
  whyLoveIt: 'Designed with meticulous attention to detail, this piece seamlessly blends elevated aesthetics with everyday utility. The refined craftsmanship ensures it will become a staple in your collection.',
  dimensions: '',
  shippingReturns: 'Complimentary express shipping on all orders. Returns are accepted within 30 days of delivery in their original condition.',
  moreInformation: 'Each item is crafted in limited numbers to preserve its exclusivity. Contact our concierge for personalized styling advice.',
  packageLengthCm: 20,
  packageBreadthCm: 15,
  packageHeightCm: 8,
  packageWeightKg: 0.5,
  stockQuantity: 12,
  lowStockThreshold: 3,
  isActive: true,
});

const neutralBadgeClasses = 'bg-stone-100 text-[#1a1a1a] border-stone-200';
const successBadgeClasses = 'bg-green-50 text-green-700 border-green-100';
const warningBadgeClasses = 'bg-amber-50 text-amber-700 border-amber-100';
const dangerBadgeClasses = 'bg-red-50 text-red-600 border-red-100';

const getOrderStatusBadgeClasses = (status: string) => {
  if (status === 'Delivered') {
    return successBadgeClasses;
  }

  if (['Pending', 'Confirmed', 'Packed', 'Shipped'].includes(status)) {
    return warningBadgeClasses;
  }

  if (status === 'Cancelled') {
    return dangerBadgeClasses;
  }

  return neutralBadgeClasses;
};

const getPaymentStatusBadgeClasses = (status: string) => {
  if (status === 'paid') {
    return successBadgeClasses;
  }

  if (status === 'pending') {
    return warningBadgeClasses;
  }

  if (['failed', 'refunded'].includes(status)) {
    return dangerBadgeClasses;
  }

  return neutralBadgeClasses;
};

const getShippingStatusBadgeClasses = (status: string) => {
  if (status === 'delivered') {
    return successBadgeClasses;
  }

  if (['created', 'awb_assigned', 'pickup_scheduled', 'shipped', 'in_transit'].includes(status)) {
    return warningBadgeClasses;
  }

  if (status === 'not_created') {
    return warningBadgeClasses;
  }

  if (['failed', 'cancelled'].includes(status)) {
    return dangerBadgeClasses;
  }

  return neutralBadgeClasses;
};

const formatStatusLabel = (status: string) =>
  status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getFriendlyAdminErrorMessage = (error: unknown, fallback: string) => {
  const rawMessage = error instanceof Error ? error.message : String(error || '');
  const message = rawMessage.toLowerCase();

  if (!rawMessage) {
    return fallback;
  }

  if (message.includes('network') || message.includes('failed to fetch') || message.includes('net::')) {
    return 'Connection failed. Please check your internet or backend server and try again.';
  }

  if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('401') || message.includes('403')) {
    return 'You do not have permission to perform this action. Please sign in again.';
  }

  if (message.includes('route not found') || message.includes('404')) {
    return 'This admin action is not available right now. Please refresh and try again.';
  }

  if (message.includes('validation') || message.includes('required') || message.includes('invalid')) {
    return 'Please check the entered details and try again.';
  }

  if (message.includes('shiprocket') || message.includes('shipment') || message.includes('awb')) {
    return 'Shipment could not be updated right now. Please check Shiprocket details and try again.';
  }

  if (message.includes('razorpay') || message.includes('payment')) {
    return 'Payment details could not be updated right now. Please try again.';
  }

  if (message.includes('s3') || message.includes('upload') || message.includes('image')) {
    return 'Image upload failed. Please check the file and try again.';
  }

  return fallback;
};

const getInventoryStatus = (product: { isActive?: boolean; stockQuantity?: number; lowStockThreshold?: number }) => {
  const stockQuantity = product.stockQuantity ?? 0;
  const lowStockThreshold = product.lowStockThreshold ?? 3;

  if (!product.isActive) {
    return { label: 'Hidden', className: neutralBadgeClasses };
  }

  if (stockQuantity <= 0) {
    return { label: 'Out of Stock', className: dangerBadgeClasses };
  }

  if (stockQuantity <= lowStockThreshold) {
    return { label: 'Low Stock', className: warningBadgeClasses };
  }

  return { label: 'Active', className: successBadgeClasses };
};

const orderMatchesQueue = (order: Order, queue: OrderQueue) => {
  switch (queue) {
    case 'newPaid':
      return order.paymentStatus === 'paid' && order.status === 'Confirmed';
    case 'toPack':
      return order.paymentStatus === 'paid' && order.status === 'Confirmed';
    case 'readyToShip':
      return order.paymentStatus === 'paid' && order.status === 'Packed' && ['not_created', 'failed'].includes(order.shippingStatus);
    case 'inTransit':
      return order.shippingStatus === 'created' || order.shippingStatus === 'in_transit' || order.status === 'Shipped';
    case 'delivered':
      return order.shippingStatus === 'delivered' || order.status === 'Delivered';
    case 'problems':
      return order.paymentStatus === 'failed' || order.shippingStatus === 'failed' || order.shippingStatus === 'cancelled' || order.status === 'Cancelled';
    default:
      return true;
  }
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const printPackingSlip = (order: Order) => {
  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(String(item.id))}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${item.quantity}</td>
        </tr>
      `,
    )
    .join('');

  const documentHtml = `
    <!doctype html>
    <html>
      <head>
        <title>Packing Slip ${escapeHtml(order.id)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 32px; color: #111; font-family: Georgia, 'Times New Roman', serif; background: #fff; }
          .page { max-width: 760px; margin: 0 auto; border: 1px solid #d6d3d1; padding: 28px; }
          .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #d6d3d1; padding-bottom: 18px; }
          .brand { font-size: 30px; letter-spacing: -0.04em; }
          .eyebrow { font-family: Arial, sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: #78716c; }
          .meta { text-align: right; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.7; }
          .section { margin-top: 24px; }
          .section-title { margin-bottom: 10px; font-family: Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: #78716c; }
          .box { border: 1px solid #e7e5e4; padding: 14px; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.65; }
          .table-scroll { max-height: 320px; overflow: auto; border: 1px solid #e7e5e4; }
          table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
          thead { position: sticky; top: 0; background: #fff; z-index: 1; }
          th { text-align: left; border-bottom: 1px solid #d6d3d1; padding: 10px 8px; font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #78716c; }
          td { border-bottom: 1px solid #f5f5f4; padding: 12px 8px; vertical-align: top; }
          .checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-family: Arial, sans-serif; font-size: 12px; }
          .check { display: flex; align-items: center; gap: 8px; border: 1px solid #e7e5e4; padding: 10px; }
          .check-box { width: 12px; height: 12px; flex: 0 0 12px; border: 1px solid #111; }
          .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #d6d3d1; font-family: Arial, sans-serif; font-size: 10px; color: #78716c; }
          @media print { body { padding: 0; } .page { border: 0; max-width: none; } .table-scroll { max-height: none; overflow: visible; border: 0; } thead { position: static; } }
        </style>
      </head>
      <body>
        <main class="page">
          <header class="header">
            <div>
              <div class="eyebrow">Packing Slip</div>
              <div class="brand">SIMVORAE</div>
            </div>
            <div class="meta">
              <strong>Order:</strong> ${escapeHtml(order.id)}<br />
              <strong>Date:</strong> ${escapeHtml(formatDate(order.createdAt))}<br />
              <strong>Payment:</strong> ${escapeHtml(formatStatusLabel(order.paymentStatus))}<br />
              <strong>Fulfillment:</strong> ${escapeHtml(order.status)}
            </div>
          </header>

          <section class="section">
            <div class="section-title">Ship To</div>
            <div class="box">
              <strong>${escapeHtml(order.customer.name)}</strong><br />
              ${escapeHtml(order.customer.phone)}<br />
              ${escapeHtml(order.customer.email)}<br />
              ${escapeHtml(order.customer.address)}
            </div>
          </section>

          <section class="section">
            <div class="section-title">Courier Details</div>
            <div class="box">
              <strong>Shipping Status:</strong> ${escapeHtml(formatStatusLabel(order.shippingStatus))}<br />
              <strong>AWB:</strong> ${escapeHtml(order.awbCode || 'Not assigned')}<br />
              <strong>Shipment ID:</strong> ${escapeHtml(order.shipmentId || 'Not created')}<br />
              <strong>Tracking:</strong> ${escapeHtml(order.trackingUrl || 'Not available')}
            </div>
          </section>

          <section class="section">
            <div class="section-title">Items To Pack</div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
              </table>
            </div>
          </section>

          <section class="section">
            <div class="section-title">Packing Checklist</div>
            <div class="checklist">
              <div class="check"><span class="check-box"></span><span>Products checked</span></div>
              <div class="check"><span class="check-box"></span><span>Quantity matched</span></div>
              <div class="check"><span class="check-box"></span><span>Bag packed safely</span></div>
              <div class="check"><span class="check-box"></span><span>Shipping label attached</span></div>
            </div>
          </section>

          <footer class="footer">
            Internal fulfillment document. Not a customer invoice.
          </footer>
        </main>
        <script>
          window.addEventListener('load', () => {
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    return;
  }

  printWindow.document.open();
  printWindow.document.write(documentHtml);
  printWindow.document.close();
};

const printInvoice = (order: Order) => {
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(String(item.id))}</td>
          <td>${item.quantity}</td>
          <td>${escapeHtml(formatCurrency(item.price))}</td>
          <td>${escapeHtml(formatCurrency(item.price * item.quantity))}</td>
        </tr>
      `,
    )
    .join('');

  const documentHtml = `
    <!doctype html>
    <html>
      <head>
        <title>Invoice ${escapeHtml(order.id)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 32px; color: #111; font-family: Georgia, 'Times New Roman', serif; background: #fff; }
          .page { max-width: 780px; margin: 0 auto; border: 1px solid #d6d3d1; padding: 30px; }
          .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #d6d3d1; padding-bottom: 20px; }
          .brand { font-size: 34px; letter-spacing: -0.04em; }
          .eyebrow { font-family: Arial, sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: #78716c; }
          .meta { text-align: right; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.7; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
          .section { margin-top: 24px; }
          .section-title { margin-bottom: 10px; font-family: Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: #78716c; }
          .box { border: 1px solid #e7e5e4; padding: 14px; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.65; min-height: 104px; }
          .table-scroll { max-height: 340px; overflow: auto; border: 1px solid #e7e5e4; }
          table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
          thead { position: sticky; top: 0; background: #fff; z-index: 1; }
          th { text-align: left; border-bottom: 1px solid #d6d3d1; padding: 10px 8px; font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #78716c; }
          td { border-bottom: 1px solid #f5f5f4; padding: 12px 8px; vertical-align: top; }
          th:nth-child(3), td:nth-child(3) { text-align: center; }
          th:nth-child(4), td:nth-child(4), th:nth-child(5), td:nth-child(5) { text-align: right; }
          .totals { margin-left: auto; width: 320px; font-family: Arial, sans-serif; font-size: 12px; }
          .total-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f5f5f4; padding: 10px 0; }
          .grand-total { font-weight: 700; font-size: 15px; border-bottom: 1px solid #111; }
          .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #d6d3d1; font-family: Arial, sans-serif; font-size: 10px; line-height: 1.6; color: #78716c; }
          @media print { body { padding: 0; } .page { border: 0; max-width: none; } .table-scroll { max-height: none; overflow: visible; border: 0; } thead { position: static; } }
        </style>
      </head>
      <body>
        <main class="page">
          <header class="header">
            <div>
              <div class="eyebrow">Tax Invoice / Order Receipt</div>
              <div class="brand">SIMVORAE</div>
            </div>
            <div class="meta">
              <strong>Invoice:</strong> ${escapeHtml(order.id)}<br />
              <strong>Order Date:</strong> ${escapeHtml(formatDate(order.createdAt))}<br />
              <strong>Payment:</strong> ${escapeHtml(formatStatusLabel(order.paymentStatus))}<br />
              <strong>Payment Method:</strong> ${escapeHtml(order.paymentMethod)}
            </div>
          </header>

          <section class="section grid">
            <div>
              <div class="section-title">Bill To</div>
              <div class="box">
                <strong>${escapeHtml(order.customer.name)}</strong><br />
                ${escapeHtml(order.customer.phone)}<br />
                ${escapeHtml(order.customer.email)}
              </div>
            </div>
            <div>
              <div class="section-title">Ship To</div>
              <div class="box">
                ${escapeHtml(order.customer.address)}
              </div>
            </div>
          </section>

          <section class="section">
            <div class="section-title">Order Items</div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
              </table>
            </div>
          </section>

          <section class="section">
            <div class="totals">
              <div class="total-row">
                <span>Subtotal</span>
                <strong>${escapeHtml(formatCurrency(subtotal))}</strong>
              </div>
              <div class="total-row">
                <span>Shipping</span>
                <strong>Free</strong>
              </div>
              <div class="total-row grand-total">
                <span>Invoice Total</span>
                <strong>${escapeHtml(formatCurrency(order.total))}</strong>
              </div>
            </div>
          </section>

          <section class="section">
            <div class="section-title">Shipment</div>
            <div class="box">
              <strong>Status:</strong> ${escapeHtml(formatStatusLabel(order.shippingStatus))}<br />
              <strong>AWB:</strong> ${escapeHtml(order.awbCode || 'Not assigned')}<br />
              <strong>Tracking:</strong> ${escapeHtml(order.trackingUrl || 'Not available')}
            </div>
          </section>

          <footer class="footer">
            Thank you for shopping with Simvorae. This invoice is generated from the admin order record.
          </footer>
        </main>
        <script>
          window.addEventListener('load', () => {
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    return;
  }

  printWindow.document.open();
  printWindow.document.write(documentHtml);
  printWindow.document.close();
};

function PaginationControls({
  page,
  pageCount,
  totalCount,
  pageSize,
  label,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  totalCount: number;
  pageSize: number;
  label: string;
  onPageChange: (page: number) => void;
}) {
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);
  const safePageCount = Math.max(pageCount, 1);

  if (safePageCount <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 border-t border-stone-100 bg-white/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400">
        Showing {startItem}-{endItem} of {totalCount} {label}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-9 cursor-pointer items-center gap-2 border border-stone-200 bg-[#fcfbf9] px-3 text-[9px] font-semibold uppercase tracking-widest text-stone-500 transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a] disabled:cursor-not-allowed disabled:border-stone-100 disabled:text-stone-300"
        >
          <ChevronLeft size={12} />
          Prev
        </button>

        <span className="border border-stone-200 bg-white px-3 py-2 font-sans text-[10px] font-semibold text-stone-500">
          {page} / {safePageCount}
        </span>

        <button
          type="button"
          disabled={page >= safePageCount}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-9 cursor-pointer items-center gap-2 border border-stone-200 bg-[#fcfbf9] px-3 text-[9px] font-semibold uppercase tracking-widest text-stone-500 transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a] disabled:cursor-not-allowed disabled:border-stone-100 disabled:text-stone-300"
        >
          Next
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

function ProductModal({
  mode,
  form,
  onClose,
  onSubmit,
  onChange,
  onImageFilesAdd,
  onImageRemove,
  isUploading,
}: {
  mode: 'add' | 'edit';
  form: ProductFormState;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (field: keyof ProductFormState, value: string | number | string[] | boolean) => void;
  onImageFilesAdd: (files: FileList) => void;
  onImageRemove: (index: number) => void;
  isUploading: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    if (files?.length) {
      onImageFilesAdd(files);
    }
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files?.length) {
      onImageFilesAdd(files);
    }
  };

  const setCoverImage = (index: number) => {
    const nextImages = [...form.images];
    const [selectedImage] = nextImages.splice(index, 1);
    if (selectedImage) {
      onChange('images', [selectedImage, ...nextImages]);
    }
  };

  return (
    <div
      data-lenis-prevent
      onWheel={(event) => event.preventDefault()}
      onTouchMove={(event) => event.preventDefault()}
      className="fixed inset-0 z-[200] flex items-center justify-center overscroll-contain bg-[#1a1a1a]/60 p-4 backdrop-blur-sm md:p-8"
    >
      <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden border border-stone-200 bg-[#fcfbf9]">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white p-6">
          <h3 className="font-serif text-2xl text-[#1a1a1a]">{mode === 'add' ? 'Add New Product' : 'Edit Product'}</h3>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-full p-2 transition-colors hover:bg-stone-100">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div
          data-lenis-prevent
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
          className="admin-scrollbar flex-1 overscroll-contain overflow-y-auto p-6 md:p-8"
        >
          <form id="productForm" onSubmit={onSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <section className="space-y-4 border border-stone-200 bg-white p-6">
                <h4 className="mb-4 border-b border-stone-100 pb-2 font-sans text-[10px] font-semibold uppercase tracking-widest text-stone-400">Basic Information</h4>

                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Product Name</label>
                  <input required type="text" value={form.name} onChange={(event) => onChange('name', event.target.value)} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="e.g. The Drape Tote" />
                </div>

                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Description</label>
                  <textarea rows={4} value={form.description} onChange={(event) => onChange('description', event.target.value)} className="w-full resize-none border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="Product details..." />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Collection Category</label>
                    <input required type="text" value={form.category} onChange={(event) => onChange('category', event.target.value)} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="e.g. Classic Tote" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Material Grade</label>
                    <input type="text" value={form.material} onChange={(event) => onChange('material', event.target.value)} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="e.g. Full-grain Calfskin" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Surface Color</label>
                    <input type="text" value={form.color} onChange={(event) => onChange('color', event.target.value)} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="e.g. Obsidian Black" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Retail Price (INR)</label>
                    <input required type="number" min="0" value={form.price} onChange={(event) => onChange('price', Number(event.target.value))} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="e.g. 25000" />
                  </div>
                </div>
              </section>

              <section className="space-y-4 border border-stone-200 bg-white p-6">
                <h4 className="mb-4 border-b border-stone-100 pb-2 font-sans text-[10px] font-semibold uppercase tracking-widest text-stone-400">Shiprocket Package Details</h4>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Length (cm)</label>
                    <input required type="number" min="0.1" step="0.1" value={form.packageLengthCm} onChange={(event) => onChange('packageLengthCm', Number(event.target.value))} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Breadth (cm)</label>
                    <input required type="number" min="0.1" step="0.1" value={form.packageBreadthCm} onChange={(event) => onChange('packageBreadthCm', Number(event.target.value))} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Height (cm)</label>
                    <input required type="number" min="0.1" step="0.1" value={form.packageHeightCm} onChange={(event) => onChange('packageHeightCm', Number(event.target.value))} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Weight (kg)</label>
                    <input required type="number" min="0.01" step="0.01" value={form.packageWeightKg} onChange={(event) => onChange('packageWeightKg', Number(event.target.value))} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" />
                  </div>
                </div>
              </section>

              <section className="space-y-4 border border-stone-200 bg-white p-6">
                <h4 className="mb-4 border-b border-stone-100 pb-2 font-sans text-[10px] font-semibold uppercase tracking-widest text-stone-400">Product Detail Content</h4>

                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Key Features</label>
                  <textarea rows={3} value={form.keyFeaturesText} onChange={(event) => onChange('keyFeaturesText', event.target.value)} className="w-full resize-none border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder={'Enter key features (one per line)...'} />
                </div>

                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Why You'll Love It?</label>
                  <textarea rows={3} value={form.whyLoveIt} onChange={(event) => onChange('whyLoveIt', event.target.value)} className="w-full resize-none border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="Explain what makes this product special..." />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Dimensions</label>
                    <input type="text" value={form.dimensions} onChange={(event) => onChange('dimensions', event.target.value)} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="e.g. 38 x 29 x 14 cm" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">More Information</label>
                    <input type="text" value={form.moreInformation} onChange={(event) => onChange('moreInformation', event.target.value)} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" placeholder="Limited edition, care notes..." />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Shipping & Returns</label>
                  <textarea rows={2} value={form.shippingReturns} onChange={(event) => onChange('shippingReturns', event.target.value)} className="w-full resize-none border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" />
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section className="space-y-4 border border-stone-200 bg-white p-6">
                <h4 className="mb-4 border-b border-stone-100 pb-2 font-sans text-[10px] font-semibold uppercase tracking-widest text-stone-400">Inventory & Status</h4>

                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Product Visibility</label>
                  <select value={form.isActive ? 'active' : 'hidden'} onChange={(event) => onChange('isActive', event.target.value === 'active')} className="w-full cursor-pointer border border-stone-200 bg-white p-3 text-[12px] outline-none focus:border-[#1a1a1a]">
                    <option value="active">Active in storefront</option>
                    <option value="hidden">Hidden from storefront</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Stock Quantity</label>
                    <input required type="number" min="0" value={form.stockQuantity} onChange={(event) => onChange('stockQuantity', Number(event.target.value))} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-medium text-[#1a1a1a]">Low Stock Alert</label>
                    <input required type="number" min="0" value={form.lowStockThreshold} onChange={(event) => onChange('lowStockThreshold', Number(event.target.value))} className="w-full border border-stone-200 p-3 text-[12px] outline-none focus:border-[#1a1a1a]" />
                  </div>
                </div>
              </section>

              <section className="space-y-4 border border-stone-200 bg-white p-6">
                <h4 className="mb-4 border-b border-stone-100 pb-2 font-sans text-[10px] font-semibold uppercase tracking-widest text-stone-400">Product Images</h4>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-6 text-center transition-colors ${
                    isDragging ? 'border-[#1a1a1a] bg-stone-50' : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <UploadCloud size={24} strokeWidth={1.5} className="mb-2 text-stone-400" />
                  <span className="font-sans text-[11px] font-medium text-[#1a1a1a]">{isUploading ? 'Uploading images...' : 'Click to upload images'}</span>
                  <span className="mt-1 font-sans text-[10px] text-stone-400">JPG, PNG, WebP up to 5MB</span>
                  <input type="file" multiple accept="image/*" onChange={handleImageFileChange} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                </div>

                {form.images.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {form.images.map((imageUrl, index) => (
                      <div key={`${imageUrl}-${index}`} className={`group relative aspect-[3/4] overflow-hidden border bg-stone-100 ${index === 0 ? 'border-[#1a1a1a]' : 'border-transparent'}`}>
                        <img src={imageUrl} className="h-full w-full object-cover" alt={`Gallery preview ${index + 1}`} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          {index !== 0 && (
                            <button type="button" onClick={() => setCoverImage(index)} className="cursor-pointer rounded-sm bg-white px-2 py-1 text-[8px] uppercase tracking-widest text-[#1a1a1a] hover:bg-stone-200">
                              Set Cover
                            </button>
                          )}
                          <button type="button" onClick={() => onImageRemove(index)} className="cursor-pointer rounded-sm bg-red-600 p-1.5 text-white hover:bg-red-700">
                            <X size={12} />
                          </button>
                        </div>
                        {index === 0 && (
                          <div className="absolute left-1 top-1 rounded-sm bg-[#1a1a1a] px-1.5 py-0.5 text-[7px] uppercase tracking-widest text-white">
                            Cover
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </form>
        </div>

        <div className="flex shrink-0 justify-end gap-4 border-t border-stone-200 bg-white p-6">
          <button type="button" onClick={onClose} className="cursor-pointer border border-stone-200 px-6 py-3 text-[9px] uppercase tracking-widest text-[#1a1a1a] transition-colors hover:bg-stone-50">
            Cancel
          </button>
          <button form="productForm" type="submit" className="cursor-pointer bg-[#1a1a1a] px-6 py-3 text-[9px] uppercase tracking-widest text-white transition-colors hover:bg-stone-800">
            {mode === 'add' ? 'Publish Product' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const isIconOnly = label === '';

  const handleCopy = async () => {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      disabled={!value}
      onClick={() => void handleCopy()}
      className={
        isIconOnly
          ? 'inline-flex cursor-pointer items-center text-stone-400 transition-colors hover:text-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-40'
          : 'inline-flex cursor-pointer items-center gap-1.5 border border-stone-200 bg-white px-2.5 py-1.5 text-[9px] font-normal uppercase tracking-widest text-stone-500 transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-40'
      }
    >
      {copied ? <CheckCircle size={11} /> : <Copy size={11} />}
      {!isIconOnly && (copied ? 'Copied' : label)}
    </button>
  );
}

function DrawerCopyAction({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      disabled={!value}
      onClick={() => void handleCopy()}
      className="flex cursor-pointer items-center justify-center gap-2 border border-stone-200 bg-white px-3 py-2.5 text-[9px] font-semibold uppercase tracking-widest text-stone-500 transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function DetailRow({ label, value, copyable = true }: { label: string; value: string; copyable?: boolean }) {
  const displayValue = value || 'Not available';

  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-100 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[9px] font-normal uppercase tracking-widest text-stone-400">{label}</p>
        <p className="mt-1 break-words font-sans text-[11px] font-normal text-[#1a1a1a]">{displayValue}</p>
      </div>
      {copyable && <CopyButton value={value} />}
    </div>
  );
}

function OrderDrawer({
  order,
  onClose,
  onMarkPacked,
  onCreateShipment,
  onSyncShipment,
  onCancelShipment,
  onCancelOrder,
  isUpdating,
  isCreatingShipment,
  isSyncingShipment,
  isCancellingShipment,
  variant = 'drawer',
}: {
  order: Order;
  onClose: () => void;
  onMarkPacked: () => void;
  onCreateShipment: () => void;
  onSyncShipment: () => void;
  onCancelShipment: () => void;
  onCancelOrder: () => void;
  isUpdating: boolean;
  isCreatingShipment: boolean;
  isSyncingShipment: boolean;
  isCancellingShipment: boolean;
  variant?: 'drawer' | 'page';
}) {
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const isShiprocketControlledStatus = order.status === 'Shipped' || order.status === 'Delivered';
  const isShippingTerminal = ['in_transit', 'delivered', 'cancelled'].includes(order.shippingStatus);
  const hasShipment = Boolean(order.awbCode || order.shiprocketOrderId || order.shipmentId);
  const canMarkPacked = order.paymentStatus === 'paid' && order.status === 'Confirmed' && !isShippingTerminal && !hasShipment;
  const canCreateShipment = order.paymentStatus === 'paid' && order.status === 'Packed' && ['not_created', 'failed'].includes(order.shippingStatus);
  const canCancelOrder = !hasShipment && !['Shipped', 'Delivered', 'Cancelled'].includes(order.status);
  const hasShipmentCancellationRequested = order.shippingStatus === 'cancelled' || order.currentShippingStatus.toLowerCase().includes('cancel');
  const canSyncShipment = hasShipment && !['delivered', 'cancelled'].includes(order.shippingStatus);
  const canCancelShipment = Boolean(
    (order.awbCode || order.shiprocketOrderId) &&
      !hasShipmentCancellationRequested &&
      order.shippingStatus === 'created',
  );

  const customerInitial = order.customer.name.trim().charAt(0).toUpperCase() || 'C';
  const shippingAddressLines = [
    order.shippingAddress.addressLine1,
    `${order.shippingAddress.city}, ${order.shippingAddress.state}, ${order.shippingAddress.postalCode}`,
    order.shippingAddress.country,
  ].filter(Boolean);
  const shippingDisplayStatus = order.currentShippingStatus || formatStatusLabel(order.shippingStatus);
  const timelineItems = [
    {
      title: 'Order Placed',
      description: order.paymentStatus === 'paid' ? 'Payment successfully processed.' : 'Checkout order was created.',
      date: formatDate(order.createdAt),
      active: true,
    },
    {
      title: order.status === 'Cancelled' ? 'Order Cancelled' : 'Processing',
      description: order.status === 'Packed' ? 'Order has been packed.' : 'Order is being packed.',
      date: ['Packed', 'Shipped', 'Delivered', 'Cancelled'].includes(order.status) ? 'Updated' : 'Pending',
      active: ['Packed', 'Shipped', 'Delivered', 'Cancelled'].includes(order.status),
    },
    {
      title: 'Shipment Created',
      description: hasShipment ? 'Shipment record is available in Shiprocket.' : 'Shipment has not been created yet.',
      date: hasShipment ? 'Created' : 'Pending',
      active: hasShipment,
    },
    {
      title: 'Delivered',
      description: order.shippingStatus === 'delivered' ? 'Shipment has been delivered.' : 'Awaiting courier delivery update.',
      date: order.shippingStatus === 'delivered' ? 'Delivered' : 'Pending',
      active: order.shippingStatus === 'delivered',
    },
  ];

  const content = (
    <div className="relative">
      {variant === 'drawer' && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-0 top-0 z-10 cursor-pointer p-2 text-stone-400 transition-colors hover:text-[#1a1a1a]"
        >
          <X size={18} />
        </button>
      )}

      <div className="mb-10 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <button
            type="button"
            onClick={onClose}
            className="mb-10 flex cursor-pointer items-center gap-3 border-b border-transparent pb-1 font-sans text-[9px] font-normal uppercase tracking-widest text-stone-500 transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
          >
            <ArrowLeft size={13} />
            Back to Orders
          </button>
          <h1 className="font-serif text-3xl leading-none text-[#1a1a1a] md:text-4xl">
            #{order.id}
          </h1>
          <p className="mt-4 font-sans text-[11px] text-stone-500">Placed on {formatDate(order.createdAt)}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => printPackingSlip(order)}
            className="cursor-pointer border border-stone-200 bg-white px-6 py-3 font-sans text-[9px] font-normal uppercase tracking-widest text-[#1a1a1a] transition-colors hover:bg-stone-50"
          >
            Print Packing Slip
          </button>
          <button
            type="button"
            onClick={() => printInvoice(order)}
            className="cursor-pointer border border-stone-200 bg-white px-6 py-3 font-sans text-[9px] font-normal uppercase tracking-widest text-[#1a1a1a] transition-colors hover:bg-stone-50"
          >
            Print Invoice
          </button>
          {canCancelOrder && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={onCancelOrder}
              className="cursor-pointer border border-red-100 bg-red-50 px-6 py-3 font-sans text-[9px] font-normal uppercase tracking-widest text-red-600 transition-colors hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isUpdating ? 'Cancelling' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-8 lg:col-span-2">
        <div className="border border-stone-200 bg-white">
          <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 p-6">
            <h2 className="font-serif text-xl text-[#1a1a1a]">Order Items</h2>
            <span className={`rounded-sm border px-3 py-1 font-sans text-[9px] font-normal uppercase tracking-widest ${getOrderStatusBadgeClasses(order.status)}`}>
              {order.status}
            </span>
          </div>

          <div className="p-6">
            <div className="divide-y divide-stone-100">
              {order.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[64px_minmax(0,1fr)_140px] items-center gap-5 py-4 transition-colors hover:bg-stone-50">
                  <div className="h-16 w-16 bg-stone-100">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-sans text-[12px] font-normal text-[#1a1a1a]">{item.name}</h3>
                    <p className="mt-2 font-sans text-[10px] font-normal text-stone-500">SKU {item.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-sans text-[10px] text-stone-500">{formatCurrency(item.price)} x {item.quantity}</p>
                    <p className="mt-2 font-serif text-2xl leading-none text-[#1a1a1a]">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-4 border-t border-stone-100 pt-6">
              <div className="flex items-center justify-between font-sans text-[11px] font-normal text-stone-500">
                <span>Subtotal</span>
                <span className="text-[#1a1a1a]">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between font-sans text-[11px] font-normal text-stone-500">
                <span>Shipping</span>
                <span className="text-[#1a1a1a]">{order.shipping > 0 ? formatCurrency(order.shipping) : formatCurrency(0)}</span>
              </div>
              <div className="flex items-center justify-between font-sans text-[11px] font-normal text-stone-500">
                <span>Tax</span>
                <span className="text-[#1a1a1a]">{formatCurrency(0)}</span>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-stone-100 pt-6">
              <span className="font-sans text-[9px] font-normal uppercase tracking-widest text-[#1a1a1a]">Total</span>
              <span className="font-serif text-4xl leading-none text-[#1a1a1a]">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

          <div className="border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 p-6">
              <h2 className="font-serif text-xl text-[#1a1a1a]">Logistics and Tracking</h2>
              <span className={`rounded-sm border px-3 py-1 font-sans text-[9px] font-normal uppercase tracking-widest ${getShippingStatusBadgeClasses(order.shippingStatus)}`}>
                {formatStatusLabel(order.shippingStatus)}
              </span>
            </div>

            <div className="p-6">
            <div className="grid grid-cols-1 gap-8 border-b border-stone-100 pb-6 md:grid-cols-2">
              <div>
                <p className="mb-1 block font-sans text-[9px] font-normal uppercase tracking-widest text-stone-400">AWB Number</p>
                <div className="flex items-center gap-2">
                  <p className="font-sans text-[11px] font-normal tracking-wider text-[#1a1a1a]">{order.awbCode || 'Not assigned'}</p>
                  <CopyButton value={order.awbCode} label="" />
                </div>
              </div>
              <div>
                <p className="mb-1 block font-sans text-[9px] font-normal uppercase tracking-widest text-stone-400">Tracking URL</p>
                {order.trackingUrl ? (
                  <button
                    type="button"
                    onClick={() => window.open(order.trackingUrl, '_blank', 'noopener,noreferrer')}
                    className="inline-flex cursor-pointer items-center gap-2 border-b border-transparent pb-1 font-sans text-[9px] font-normal uppercase tracking-widest text-[#1a1a1a] transition-colors hover:border-[#1a1a1a]"
                  >
                    Track Order
                    <ExternalLink size={11} />
                  </button>
                ) : (
                  <p className="font-sans text-[11px] font-normal text-stone-500">Not available</p>
                )}
              </div>
              <div>
                <p className="mb-1 block font-sans text-[9px] font-normal uppercase tracking-widest text-stone-400">Shiprocket Order</p>
                <div className="flex items-center gap-2">
                  <p className="font-sans text-[11px] font-normal text-[#1a1a1a]">{order.shiprocketOrderId || 'Not created'}</p>
                  <CopyButton value={order.shiprocketOrderId} label="" />
                </div>
              </div>
              <div>
                <p className="mb-1 block font-sans text-[9px] font-normal uppercase tracking-widest text-stone-400">Courier Status</p>
                <p className="font-sans text-[11px] font-normal text-[#1a1a1a]">{shippingDisplayStatus || 'Not available'}</p>
              </div>
            </div>

            {(canMarkPacked || canCreateShipment || canSyncShipment || canCancelShipment) && (
              <div className="mt-6 flex flex-wrap gap-3">
                {canMarkPacked && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={onMarkPacked}
                    className="h-10 w-[126px] cursor-pointer bg-[#1a1a1a] px-4 font-sans text-[9px] font-normal uppercase tracking-widest text-[#fcfbf9] transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isUpdating ? 'Updating' : 'Mark Packed'}
                  </button>
                )}
                {canCreateShipment && (
                  <button
                    type="button"
                    disabled={isCreatingShipment}
                    onClick={onCreateShipment}
                    className="h-10 w-[162px] cursor-pointer border border-stone-200 bg-white px-4 font-sans text-[9px] font-normal uppercase tracking-widest text-[#1a1a1a] transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isCreatingShipment ? 'Creating' : 'Create Shipment'}
                  </button>
                )}
                {canSyncShipment && (
                  <button
                    type="button"
                    disabled={isSyncingShipment}
                    onClick={onSyncShipment}
                    className="h-10 w-[132px] cursor-pointer border border-stone-200 bg-white px-4 font-sans text-[9px] font-normal uppercase tracking-widest text-[#1a1a1a] transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSyncingShipment ? 'Syncing' : 'Sync Status'}
                  </button>
                )}
                {canCancelShipment && (
                  <button
                    type="button"
                    disabled={isCancellingShipment}
                    onClick={onCancelShipment}
                    className="h-10 w-[166px] cursor-pointer border border-red-200 bg-white px-4 font-sans text-[9px] font-normal uppercase tracking-widest text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isCancellingShipment ? 'Cancelling' : 'Cancel Shipment'}
                  </button>
                )}
              </div>
            )}
            </div>
          </div>

          <div className="border border-stone-200 bg-white">
            <div className="border-b border-stone-100 bg-stone-50/50 p-6">
              <h2 className="font-serif text-xl text-[#1a1a1a]">Timeline</h2>
            </div>
            <div className="relative grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
              <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-stone-200 md:block" />
              {timelineItems.map((item, index) => (
                <div key={item.title} className={`${index % 2 === 0 ? 'md:col-start-2' : 'md:col-start-1'} relative border border-stone-200 bg-white p-5`}>
                  <span className={`absolute top-1/2 hidden h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[#fcfbf9] md:block ${index % 2 === 0 ? '-left-[2.45rem]' : '-right-[2.45rem]'} ${item.active ? 'bg-[#1a1a1a]' : 'bg-stone-200'}`} />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-sans text-[11px] font-normal text-[#1a1a1a]">{item.title}</p>
                      <p className="mt-2 font-sans text-[11px] font-normal text-stone-500">{item.description}</p>
                    </div>
                    <span className="shrink-0 font-sans text-[9px] text-stone-400">{item.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="border border-stone-200 bg-white">
            <div className="border-b border-stone-100 bg-stone-50/50 p-6">
              <h2 className="font-serif text-xl text-[#1a1a1a]">Customer</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50 font-serif text-2xl text-[#1a1a1a]">
                  {customerInitial}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-sans text-[11px] font-normal text-[#1a1a1a]">{order.customer.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="truncate font-sans text-[11px] font-normal text-stone-500">{order.customer.email}</p>
                    <CopyButton value={order.customer.email} label="" />
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <p className="mb-3 font-sans text-[9px] font-normal uppercase tracking-widest text-stone-400">Contact Info</p>
                <div className="flex items-center gap-2">
                  <p className="font-sans text-[11px] font-normal text-[#1a1a1a]">{order.customer.phone}</p>
                  <CopyButton value={order.customer.phone} label="" />
                </div>
              </div>
            </div>
          </div>

          <div className="border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 p-6">
              <h2 className="font-serif text-xl text-[#1a1a1a]">Payment Details</h2>
              <span className={`rounded-sm border px-3 py-1 font-sans text-[9px] font-normal uppercase tracking-widest ${getPaymentStatusBadgeClasses(order.paymentStatus)}`}>
                {formatStatusLabel(order.paymentStatus)}
              </span>
            </div>
            <div className="space-y-7 p-6">
              <div>
                <p className="mb-2 font-sans text-[9px] font-normal uppercase tracking-widest text-stone-400">Razorpay Order ID</p>
                <div className="flex items-center gap-2">
                  <p className="font-sans text-[11px] font-normal text-[#1a1a1a]">{order.razorpayOrderId || 'Not available'}</p>
                  <CopyButton value={order.razorpayOrderId} label="" />
                </div>
              </div>
              <div>
                <p className="mb-2 font-sans text-[9px] font-normal uppercase tracking-widest text-stone-400">Payment ID</p>
                <div className="flex items-center gap-2">
                  <p className="font-sans text-[11px] font-normal text-[#1a1a1a]">{order.razorpayPaymentId || 'Not available'}</p>
                  <CopyButton value={order.razorpayPaymentId} label="" />
                </div>
              </div>
            </div>
          </div>

          <div className="border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 p-6">
              <h2 className="font-serif text-xl text-[#1a1a1a]">Shipping Address</h2>
              <span className={`rounded-sm border px-3 py-1 font-sans text-[9px] font-normal uppercase tracking-widest ${getShippingStatusBadgeClasses(order.shippingStatus)}`}>
                {formatStatusLabel(order.shippingStatus)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4 p-6">
              <p className="font-sans text-[11px] font-normal leading-relaxed text-[#1a1a1a]">
                {order.customer.name}<br />
                {shippingAddressLines.map((line) => (
                  <span key={line}>
                    {line}<br />
                  </span>
                ))}
              </p>
              <CopyButton value={`${order.customer.name}, ${shippingAddressLines.join(', ')}`} label="" />
            </div>
          </div>

          <div className="border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 p-6">
              <h2 className="font-serif text-xl text-[#1a1a1a]">Billing Address</h2>
              <span className={`rounded-sm border px-3 py-1 font-sans text-[9px] font-normal uppercase tracking-widest ${getPaymentStatusBadgeClasses(order.paymentStatus)}`}>
                {formatStatusLabel(order.paymentStatus)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4 p-6">
              <p className="font-sans text-[11px] font-normal leading-relaxed text-[#1a1a1a]">
                {order.customer.name}<br />
                {shippingAddressLines.map((line) => (
                  <span key={line}>
                    {line}<br />
                  </span>
                ))}
              </p>
              <CopyButton value={`${order.customer.name}, ${shippingAddressLines.join(', ')}`} label="" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (variant === 'page') {
    return (
      <div className="bg-[#fcfbf9] text-[#1a1a1a]">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-end bg-[#0c0c0c]/85 backdrop-blur-sm">
      <div className="admin-scrollbar relative h-full w-full max-w-6xl overflow-y-auto border-l border-stone-200 bg-[#fcfbf9] p-8 md:p-12">
        {content}
      </div>
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showSuccess } = useToast();
  const {
    products,
    categoryStats,
    categoryStatsTotal,
    isLoading: isProductsLoading,
    isUploading: isProductImageUploading,
    error: productError,
    fetchProducts,
    uploadProductImage,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useProductStore();
  const { orders, isLoading, error, fetchOrders, markPacked, cancelOrder, createShipment, syncShipment, cancelShipment } = useOrderStore();

  const activeTab = adminPathToTab(location.pathname);
  const setActiveTab = (tab: AdminTab) => {
    setViewingOrder(null);
    setSelectedCustomerId(null);
    navigate(adminTabRoutes[tab]);
  };
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [productForm, setProductForm] = useState<ProductFormState>(createEmptyForm());
  const [editingProduct, setEditingProduct] = useState<ProductStoreItem | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [cancelCandidate, setCancelCandidate] = useState<Order | null>(null);
  const [cancelShipmentCandidate, setCancelShipmentCandidate] = useState<Order | null>(null);
  const [deleteProductCandidate, setDeleteProductCandidate] = useState<ProductStoreItem | null>(null);
  const [isAdminLogoutModalOpen, setIsAdminLogoutModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dashboardRange, setDashboardRange] = useState<DashboardRange>('week');
  const [customStartDate, setCustomStartDate] = useState(getDateKey(new Date()));
  const [customEndDate, setCustomEndDate] = useState(getDateKey(new Date()));
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'All' | OrderStatus>('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'All' | Order['paymentStatus']>('All');
  const [shippingStatusFilter, setShippingStatusFilter] = useState<'All' | Order['shippingStatus']>('All');
  const [activeOrderQueue, setActiveOrderQueue] = useState<OrderQueue>('all');
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [customerPage, setCustomerPage] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [creatingShipmentFor, setCreatingShipmentFor] = useState('');
  const [syncingShipmentFor, setSyncingShipmentFor] = useState('');
  const [cancellingShipmentFor, setCancellingShipmentFor] = useState('');
  const [updatingOrderFor, setUpdatingOrderFor] = useState('');
  const [deletingProductFor, setDeletingProductFor] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    void fetchOrders();
    void fetchProducts();
  }, [fetchOrders, fetchProducts]);

  useEffect(() => {
    const validAdminPaths = new Set(Object.values(adminTabRoutes));

    if (!validAdminPaths.has(location.pathname)) {
      navigate('/admin/overview', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const message = error || productError;

    if (message) {
      showError(getFriendlyAdminErrorMessage(message, 'Something went wrong. Please refresh and try again.'));
    }
  }, [error, productError, showError]);

  useEffect(() => {
    const hasOpenOverlay = Boolean(
      isModalOpen ||
      cancelCandidate ||
      cancelShipmentCandidate ||
      deleteProductCandidate ||
      isAdminLogoutModalOpen,
    );
    const rootElement = document.documentElement;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = rootElement.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const scrollY = window.scrollY;

    if (hasOpenOverlay) {
      document.body.style.overflow = 'hidden';
      rootElement.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      rootElement.dataset.scrollLocked = 'true';
      window.dispatchEvent(new Event('simvorae-scroll-lock-change'));
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      rootElement.style.overflow = previousRootOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;

      if (hasOpenOverlay) {
        delete rootElement.dataset.scrollLocked;
        window.dispatchEvent(new Event('simvorae-scroll-lock-change'));
        window.scrollTo(0, scrollY);
      }
    };
  }, [cancelCandidate, cancelShipmentCandidate, deleteProductCandidate, isAdminLogoutModalOpen, isModalOpen]);

  const rangeLabel = useMemo(
    () => getDateRangeLabel(dashboardRange, customStartDate, customEndDate),
    [customEndDate, customStartDate, dashboardRange],
  );

  const filteredOrdersForStats = useMemo(() => {
    if (dashboardRange === 'all') {
      return orders;
    }

    if (dashboardRange === 'custom') {
      const startKey = customStartDate <= customEndDate ? customStartDate : customEndDate;
      const endKey = customStartDate <= customEndDate ? customEndDate : customStartDate;

      return orders.filter((order) => {
        const orderKey = getDateKey(new Date(order.createdAt));
        return orderKey >= startKey && orderKey <= endKey;
      });
    }

    const today = getStartOfDay(new Date());
    const startDate = new Date(today);

    if (dashboardRange === 'week') {
      startDate.setDate(today.getDate() - 6);
    }

    if (dashboardRange === 'month') {
      startDate.setDate(today.getDate() - 29);
    }

    if (dashboardRange === 'year') {
      startDate.setMonth(today.getMonth() - 11);
      startDate.setDate(1);
    }

    return orders.filter((order) => new Date(order.createdAt) >= startDate);
  }, [customEndDate, customStartDate, dashboardRange, orders]);

  const metrics = useMemo(() => {
    const paidOrders = filteredOrdersForStats.filter((order) => order.paymentStatus === 'paid');
    const totalSales = paidOrders.reduce((sum, order) => sum + order.total, 0);
    const orderCount = filteredOrdersForStats.length;
    const aov = paidOrders.length > 0 ? Math.round(totalSales / paidOrders.length) : 0;
    const fulfillmentQueue = paidOrders.filter((order) => ['Confirmed', 'Packed'].includes(order.status)).length;
    const failedPayments = filteredOrdersForStats.filter((order) => order.paymentStatus === 'failed').length;
    const shippingIssues = paidOrders.filter((order) => order.shippingStatus === 'failed' || order.shippingStatus === 'cancelled').length;
    const unshippedPaidOrders = paidOrders.filter((order) => order.shippingStatus === 'not_created').length;

    return {
      totalSales,
      orderCount,
      paidOrderCount: paidOrders.length,
      aov,
      fulfillmentQueue,
      failedPayments,
      shippingIssues,
      unshippedPaidOrders,
      catalogCount: products.length,
    };
  }, [filteredOrdersForStats, products.length]);

  const statCards = useMemo(
    () => [
      {
        label: 'Paid Revenue',
        value: formatCurrency(metrics.totalSales),
        note: `${metrics.paidOrderCount} paid orders · ${rangeLabel}`,
        icon: DollarSign,
        tone: 'text-emerald-600',
      },
      {
        label: 'Paid Orders',
        value: metrics.paidOrderCount.toLocaleString('en-IN'),
        note: `Successful payments · ${rangeLabel}`,
        icon: TrendingUp,
        tone: 'text-emerald-600',
      },
      {
        label: 'Total Orders',
        value: metrics.orderCount.toLocaleString('en-IN'),
        note: `All payment states · ${rangeLabel}`,
        icon: FileText,
        tone: 'text-stone-500',
      },
      {
        label: 'Avg Paid Order',
        value: formatCurrency(metrics.aov),
        note: `Paid orders only · ${rangeLabel}`,
        icon: Clock,
        tone: 'text-stone-500',
      },
      {
        label: 'Fulfillment Queue',
        value: metrics.fulfillmentQueue.toLocaleString('en-IN'),
        note: `${metrics.unshippedPaidOrders} paid not shipped`,
        icon: Package,
        tone: metrics.fulfillmentQueue > 0 ? 'text-amber-600' : 'text-stone-500',
        onClick: () => setActiveTab('ORDERS'),
      },
      {
        label: 'Payment Failures',
        value: metrics.failedPayments.toLocaleString('en-IN'),
        note: 'Needs payment follow-up',
        icon: AlertTriangle,
        tone: metrics.failedPayments > 0 ? 'text-red-600' : 'text-stone-500',
        onClick: () => setActiveTab('ORDERS'),
      },
      {
        label: 'Shipping Issues',
        value: metrics.shippingIssues.toLocaleString('en-IN'),
        note: 'Failed or cancelled shipment',
        icon: AlertTriangle,
        tone: metrics.shippingIssues > 0 ? 'text-red-600' : 'text-stone-500',
        onClick: () => setActiveTab('ORDERS'),
      },
      {
        label: 'Catalog SKUs',
        value: metrics.catalogCount.toLocaleString('en-IN'),
        note: 'Products in admin catalog',
        icon: ShoppingBag,
        tone: 'text-stone-500',
        onClick: () => setActiveTab('CATALOG'),
      },
    ],
    [metrics, rangeLabel],
  );

  const categories = useMemo(() => {
    const counts = products.reduce<Record<string, number>>((acc, product) => {
      acc[product.category] = (acc[product.category] ?? 0) + 1;
      return acc;
    }, {});

    return ['All', ...categoryOptions].map((category) => ({
      name: category,
      count: category === 'All' ? products.length : counts[category] ?? 0,
    }));
  }, [products]);

  const categoryChartData = useMemo(() => {
    const stats = categoryStats.length > 0
      ? categoryStats
      : categoryOptions.map((category) => {
        const count = products.filter((product) => product.category === category).length;
        const total = products.length;

        return {
          category,
          count,
          activeCount: products.filter((product) => product.category === category && product.isActive).length,
          ratio: total > 0 ? Math.round((count / total) * 100) : 0,
        };
      });

    const total = categoryStatsTotal || products.length;
    let currentDegree = 0;

    return stats
      .filter((item) => item.count > 0)
      .map((item, index) => {
        const degrees = total > 0 ? (item.count / total) * 360 : 0;
        const segment = {
          ...item,
          color: categoryChartColors[index % categoryChartColors.length],
          startDegree: currentDegree,
          endDegree: currentDegree + degrees,
        };
        currentDegree += degrees;
        return segment;
      });
  }, [categoryStats, categoryStatsTotal, products]);

  const categoryConicGradient = categoryChartData.length > 0
    ? `conic-gradient(${categoryChartData
      .map((item) => `${item.color} ${item.startDegree}deg ${item.endDegree}deg`)
      .join(', ')})`
    : 'conic-gradient(#f5f5f4 0deg 360deg)';

  const filteredCatalog = useMemo(
    () =>
      products.filter((product) => {
        const query = productSearch.trim().toLowerCase();
        const matchesQuery =
          query.length === 0 ||
          product.name.toLowerCase().includes(query) ||
          product.material.toLowerCase().includes(query) ||
          product.color.toLowerCase().includes(query) ||
          String(product.id) === query;

        const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
        return matchesQuery && matchesCategory;
      }),
    [productSearch, products, selectedCategory],
  );

  const catalogInventorySummary = useMemo(() => {
    const outOfStock = products.filter((product) => (product.stockQuantity ?? 0) <= 0).length;
    const lowStock = products.filter((product) => {
      const stockQuantity = product.stockQuantity ?? 0;
      return stockQuantity > 0 && stockQuantity <= (product.lowStockThreshold ?? 3);
    }).length;
    const hidden = products.filter((product) => !product.isActive).length;

    return {
      active: products.length - hidden,
      lowStock,
      outOfStock,
      hidden,
    };
  }, [products]);

  const catalogPageCount = Math.max(1, Math.ceil(filteredCatalog.length / catalogPageSize));
  const paginatedCatalog = useMemo(
    () => filteredCatalog.slice((catalogPage - 1) * catalogPageSize, catalogPage * catalogPageSize),
    [catalogPage, filteredCatalog],
  );

  const recentOrders = useMemo(() => [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5), [orders]);

  const customers = useMemo(() => {
    const customerMap = new Map<string, CustomerSummary>();

    orders.forEach((order) => {
      const customerKey = order.customer.email.trim().toLowerCase() || order.customer.phone.trim();

      if (!customerKey) {
        return;
      }

      const existingCustomer = customerMap.get(customerKey);
      const orderTotal = order.paymentStatus === 'paid' ? order.total : 0;

      if (!existingCustomer) {
        customerMap.set(customerKey, {
          id: customerKey,
          name: order.customer.name,
          email: order.customer.email,
          phone: order.customer.phone,
          address: order.customer.address,
          joinedAt: order.createdAt,
          orderCount: 1,
          totalSpent: orderTotal,
          recentOrders: [order],
        });
        return;
      }

      existingCustomer.orderCount += 1;
      existingCustomer.totalSpent += orderTotal;
      existingCustomer.joinedAt =
        new Date(order.createdAt) < new Date(existingCustomer.joinedAt)
          ? order.createdAt
          : existingCustomer.joinedAt;
      existingCustomer.recentOrders = [...existingCustomer.recentOrders, order].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      existingCustomer.address = existingCustomer.address || order.customer.address;
      existingCustomer.phone = existingCustomer.phone || order.customer.phone;
      existingCustomer.email = existingCustomer.email || order.customer.email;
      existingCustomer.name = existingCustomer.name || order.customer.name;
    });

    return Array.from(customerMap.values()).sort((a, b) => b.recentOrders[0].createdAt.localeCompare(a.recentOrders[0].createdAt));
  }, [orders]);

  const customerPageCount = Math.max(1, Math.ceil(customers.length / customerPageSize));
  const paginatedCustomers = useMemo(
    () => customers.slice((customerPage - 1) * customerPageSize, customerPage * customerPageSize),
    [customerPage, customers],
  );
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const orderQueueCounts = useMemo(
    () =>
      orderQueueOptions.reduce<Record<OrderQueue, number>>((counts, queue) => {
        counts[queue.value] = orders.filter((order) => orderMatchesQueue(order, queue.value)).length;
        return counts;
      }, {} as Record<OrderQueue, number>),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    const startKey = orderStartDate && orderEndDate && orderStartDate > orderEndDate ? orderEndDate : orderStartDate;
    const endKey = orderStartDate && orderEndDate && orderStartDate > orderEndDate ? orderStartDate : orderEndDate;

    return orders.filter((order) => {
      const matchesQuery =
        query.length === 0 ||
        order.id.toLowerCase().includes(query) ||
        order.customer.name.toLowerCase().includes(query) ||
        order.customer.email.toLowerCase().includes(query) ||
        order.customer.phone.toLowerCase().includes(query) ||
        order.customer.city.toLowerCase().includes(query);

      const matchesStatus = orderStatusFilter === 'All' || order.status === orderStatusFilter;
      const matchesPayment = paymentStatusFilter === 'All' || order.paymentStatus === paymentStatusFilter;
      const matchesShipping = shippingStatusFilter === 'All' || order.shippingStatus === shippingStatusFilter;
      const matchesQueue = orderMatchesQueue(order, activeOrderQueue);
      const orderDateKey = getDateKey(new Date(order.createdAt));
      const matchesStartDate = !startKey || orderDateKey >= startKey;
      const matchesEndDate = !endKey || orderDateKey <= endKey;

      return matchesQuery && matchesStatus && matchesPayment && matchesShipping && matchesQueue && matchesStartDate && matchesEndDate;
    });
  }, [
    activeOrderQueue,
    orderEndDate,
    orders,
    orderSearch,
    orderStartDate,
    orderStatusFilter,
    paymentStatusFilter,
    shippingStatusFilter,
  ]);

  const orderPageCount = Math.max(1, Math.ceil(filteredOrders.length / orderPageSize));
  const paginatedOrders = useMemo(
    () => filteredOrders.slice((orderPage - 1) * orderPageSize, orderPage * orderPageSize),
    [filteredOrders, orderPage],
  );

  useEffect(() => {
    setCatalogPage(1);
  }, [productSearch, selectedCategory]);

  useEffect(() => {
    setOrderPage(1);
  }, [
    activeOrderQueue,
    orderEndDate,
    orderSearch,
    orderStartDate,
    orderStatusFilter,
    paymentStatusFilter,
    shippingStatusFilter,
  ]);

  useEffect(() => {
    setCatalogPage((page) => Math.min(page, catalogPageCount));
  }, [catalogPageCount]);

  useEffect(() => {
    setOrderPage((page) => Math.min(page, orderPageCount));
  }, [orderPageCount]);

  useEffect(() => {
    setCustomerPage((page) => Math.min(page, customerPageCount));
  }, [customerPageCount]);

  const salesHistory = useMemo(() => {
    const paidOrders = orders.filter((order) => order.paymentStatus === 'paid');
    const today = getStartOfDay(new Date());

    if (dashboardRange === 'year') {
      return Array.from({ length: 12 }, (_, index) => {
        const date = new Date(today);
        date.setMonth(today.getMonth() - (11 - index));
        date.setDate(1);
        const key = getMonthKey(date);
        const monthOrders = paidOrders.filter((order) => getMonthKey(new Date(order.createdAt)) === key);

        return {
          date: date.toLocaleDateString('en-IN', { month: 'short' }),
          sales: monthOrders.reduce((sum, order) => sum + order.total, 0),
          count: monthOrders.length,
        };
      });
    }

    if (dashboardRange === 'all') {
      const salesByMonth = paidOrders.reduce<Record<string, { date: string; sales: number; count: number }>>((acc, order) => {
        const orderDate = new Date(order.createdAt);
        const key = getMonthKey(orderDate);
        acc[key] ??= {
          date: orderDate.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
          sales: 0,
          count: 0,
        };
        acc[key].sales += order.total;
        acc[key].count += 1;
        return acc;
      }, {});

      return Object.entries(salesByMonth)
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([, value]) => value);
    }

    const days = dashboardRange === 'month' ? 30 : 7;

    if (dashboardRange === 'custom') {
      const startKey = customStartDate <= customEndDate ? customStartDate : customEndDate;
      const endKey = customStartDate <= customEndDate ? customEndDate : customStartDate;
      const startDate = new Date(`${startKey}T00:00:00`);
      const endDate = new Date(`${endKey}T00:00:00`);
      const rangeDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);

      return Array.from({ length: rangeDays }, (_, index) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);
        const key = getDateKey(date);
        const dayOrders = paidOrders.filter((order) => getDateKey(new Date(order.createdAt)) === key);

        return {
          date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          sales: dayOrders.reduce((sum, order) => sum + order.total, 0),
          count: dayOrders.length,
        };
      });
    }

    return Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - 1 - index));
      const key = getDateKey(date);
      const dayOrders = paidOrders.filter((order) => getDateKey(new Date(order.createdAt)) === key);

      return {
        date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        sales: dayOrders.reduce((sum, order) => sum + order.total, 0),
        count: dayOrders.length,
      };
    });
  }, [customEndDate, customStartDate, dashboardRange, orders]);

  const maxSales = useMemo(
    () => Math.max(...salesHistory.map((day) => day.sales), 1),
    [salesHistory],
  );

  const chartPoints = useMemo(
    () =>
      salesHistory.map((day, index) => ({
        ...day,
        x: 40 + index * (640 / Math.max(salesHistory.length - 1, 1)),
        y: 210 - (day.sales / maxSales) * 180,
      })),
    [maxSales, salesHistory],
  );

  const chartPath = chartPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const chartAreaPath = chartPoints.length > 0
    ? `M 40 210 ${chartPath.replace('M', 'L')} L 680 210 Z`
    : '';

  const handleFormChange = (field: keyof ProductFormState, value: string | number | string[] | boolean) => {
    setProductForm((current) => ({ ...current, [field]: value }));
  };

  const handleImageRemove = (index: number) => {
    setProductForm((current) => {
      const images = current.images.filter((_, imageIndex) => imageIndex !== index);
      return {
        ...current,
        images,
      };
    });
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setProductForm(createEmptyForm());
    setIsModalOpen(true);
  };

  const openEditModal = (product: ProductStoreItem) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price,
      category: product.category,
      material: product.material,
      color: product.color,
      images: product.images.length > 0 ? product.images : product.image ? [product.image] : [],
      description: product.description ?? '',
      keyFeaturesText: product.keyFeatures.join('\n'),
      whyLoveIt: product.whyLoveIt ?? '',
      dimensions: product.dimensions ?? '',
      shippingReturns: product.shippingReturns ?? '',
      moreInformation: product.moreInformation ?? '',
      packageLengthCm: product.packageDetails.lengthCm,
      packageBreadthCm: product.packageDetails.breadthCm,
      packageHeightCm: product.packageDetails.heightCm,
      packageWeightKg: product.packageDetails.weightKg,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      isActive: product.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingProduct(null);
    setIsModalOpen(false);
  };

  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productForm.name.trim()) {
      return;
    }

    const payload = {
      ...productForm,
      image: productForm.images[0] || '',
      images: productForm.images,
      keyFeatures: productForm.keyFeaturesText
        .split('\n')
        .map((feature) => feature.trim())
        .filter(Boolean),
      packageDetails: {
        lengthCm: productForm.packageLengthCm,
        breadthCm: productForm.packageBreadthCm,
        heightCm: productForm.packageHeightCm,
        weightKg: productForm.packageWeightKg,
      },
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        showSuccess(`${productForm.name} updated.`);
      } else {
        await addProduct(payload);
        showSuccess(`${productForm.name} created.`);
      }

      closeModal();
    } catch (error) {
      showError(getFriendlyAdminErrorMessage(error, 'Product could not be saved. Please check the details and try again.'));
    }
  };

  const handleImageFilesAdd = async (files: FileList) => {
    try {
      const uploadedUrls = await Promise.all(
        Array.from(files)
          .filter((file) => file.type.startsWith('image/'))
          .map((file) => uploadProductImage(file)),
      );

      if (uploadedUrls.length > 0) {
        setProductForm((current) => ({
          ...current,
          images: [...current.images, ...uploadedUrls],
        }));
      }
    } catch (error) {
      showError(getFriendlyAdminErrorMessage(error, 'Image upload failed. Please check the file and try again.'));
    }
  };

  const handleDeleteProduct = (product: ProductStoreItem) => {
    setDeleteProductCandidate(product);
  };

  const confirmDeleteProduct = async () => {
    if (!deleteProductCandidate) {
      return;
    }

    try {
      setDeletingProductFor(deleteProductCandidate.id);
      await deleteProduct(deleteProductCandidate.id);
      showSuccess(`${deleteProductCandidate.name} deleted.`);
      setDeleteProductCandidate(null);
    } catch (error) {
      showError(getFriendlyAdminErrorMessage(error, 'Product could not be deleted. Please try again.'));
    } finally {
      setDeletingProductFor(null);
    }
  };

  const canCreateShipment = (order: Order) =>
    order.paymentStatus === 'paid' &&
    order.status === 'Packed' &&
    (order.shippingStatus === 'not_created' || order.shippingStatus === 'failed');

  const canMarkPacked = (order: Order) => order.paymentStatus === 'paid' && order.status === 'Confirmed';
  const canCancelOrder = (order: Order) => {
    const hasShipment = Boolean(order.awbCode || order.shiprocketOrderId || order.shipmentId);

    return !hasShipment && !['Shipped', 'Delivered', 'Cancelled'].includes(order.status);
  };

  const handleMarkPacked = async (order: Order) => {
    setUpdatingOrderFor(order.id);

    try {
      const updatedOrder = await markPacked(order.id);
      setViewingOrder((current) => (current?.id === order.id ? updatedOrder : current));
      showSuccess(`${order.id} marked packed.`);
    } catch (error) {
      showError(getFriendlyAdminErrorMessage(error, 'Order could not be marked as packed. Please try again.'));
    } finally {
      setUpdatingOrderFor('');
    }
  };

  const confirmCancelOrder = async () => {
    if (!cancelCandidate) {
      return;
    }

    const order = cancelCandidate;
    setUpdatingOrderFor(order.id);

    try {
      const updatedOrder = await cancelOrder(order.id);
      setViewingOrder((current) => (current?.id === order.id ? updatedOrder : current));
      setCancelCandidate(null);
      showSuccess(`${order.id} cancelled.`);
    } catch (error) {
      showError(getFriendlyAdminErrorMessage(error, 'Order could not be cancelled. Please try again.'));
    } finally {
      setUpdatingOrderFor('');
    }
  };

  const handleCreateShipment = async (order: Order) => {
    setCreatingShipmentFor(order.id);

    try {
      const updatedOrder = await createShipment(order.id);
      setViewingOrder((current) => (current?.id === order.id ? updatedOrder : current));
      showSuccess(`Shipment created for ${order.id}.`);
    } catch (error) {
      showError(getFriendlyAdminErrorMessage(error, 'Shipment could not be created. Please check Shiprocket details and try again.'));
    } finally {
      setCreatingShipmentFor('');
    }
  };

  const handleSyncShipment = async (order: Order) => {
    try {
      setSyncingShipmentFor(order.id);
      const updatedOrder = await syncShipment(order.id);
      setViewingOrder(updatedOrder);
      showSuccess(`Shipment synced for ${order.id}.`);
    } catch (error) {
      showError(getFriendlyAdminErrorMessage(error, 'Shipment status could not be synced. Please try again.'));
    } finally {
      setSyncingShipmentFor('');
    }
  };

  const confirmCancelShipment = async () => {
    if (!cancelShipmentCandidate) {
      return;
    }

    try {
      setCancellingShipmentFor(cancelShipmentCandidate.id);
      const updatedOrder = await cancelShipment(cancelShipmentCandidate.id);
      setViewingOrder(updatedOrder);
      setCancelShipmentCandidate(null);
      showSuccess(`Shiprocket cancellation requested for ${cancelShipmentCandidate.id}.`);
    } catch (error) {
      showError(getFriendlyAdminErrorMessage(error, 'Shipment could not be cancelled. Please try again.'));
    } finally {
      setCancellingShipmentFor('');
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] font-sans text-[#1a1a1a]">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }} />

      <div className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-stone-200 bg-[#fcfbf9] px-6 lg:hidden">
        <Link to="/" className="font-serif text-xl uppercase tracking-widest text-[#1a1a1a]">
          Simvorae
        </Link>
        <button
          type="button"
          onClick={() => setIsSidebarOpen((current) => !current)}
          className="cursor-pointer p-2 -mr-2 text-[#1a1a1a]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
            {isSidebarOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#1a1a1a]/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed left-0 top-0 z-50 flex h-[100dvh] w-64 flex-col border-r border-stone-200 bg-[#fcfbf9] p-8 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-16">
          <Link to="/" className="font-serif text-2xl uppercase tracking-widest text-[#1a1a1a] transition-opacity hover:opacity-70">
            Simvorae
            <span className="mt-2 block font-sans text-[8px] font-bold uppercase tracking-[0.3em] text-stone-400">ADMIN PORTAL</span>
          </Link>
        </div>

        <nav className="flex flex-grow flex-col gap-6">
          {[
            { id: 'OVERVIEW' as const, label: 'Dashboard', icon: LayoutDashboard },
            { id: 'ORDERS' as const, label: `Orders (${orders.length})`, icon: FileText },
            { id: 'CATALOG' as const, label: `Products (${products.length})`, icon: ShoppingBag },
            { id: 'CUSTOMERS' as const, label: `Customers (${customers.length})`, icon: User },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`cursor-pointer text-left font-sans text-[10px] uppercase tracking-[0.2em] transition-colors ${
                  isActive ? 'font-bold text-[#1a1a1a]' : 'text-stone-400 hover:text-[#1a1a1a]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-stone-200 pt-8">
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="mb-8 flex cursor-pointer items-center gap-2 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 transition-colors hover:text-[#1a1a1a]"
          >
            <span>Preview Shop</span>
            <ExternalLink size={11} />
          </button>

          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] font-serif text-sm text-white">
                A
              </div>
              <div className="min-w-0">
                <div className="truncate font-sans text-[10px] font-semibold uppercase tracking-widest">Admin User</div>
                <div className="mt-0.5 truncate font-sans text-[9px] text-stone-400">admin@simvorae.com</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAdminLogoutModalOpen(true)}
              className="cursor-pointer p-2 text-stone-400 transition-colors hover:text-[#1a1a1a]"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-[100dvh] overflow-x-hidden pt-24 lg:ml-64 lg:pt-0">
        <main className="mx-auto w-full max-w-[1460px] p-4 md:p-8 lg:p-[60px]">
          {activeTab === 'OVERVIEW' && (
            <div>
              <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <h1 className="font-serif text-3xl md:text-4xl">Overview</h1>

                <div className="flex flex-col items-end gap-4 md:flex-row md:items-center">
                  <div className="admin-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-sm border border-stone-200 bg-white p-1">
                    {dashboardRangeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDashboardRange(option.value)}
                        className={`shrink-0 cursor-pointer rounded-sm px-4 py-2 font-sans text-[9px] uppercase tracking-widest transition-colors ${
                          dashboardRange === option.value
                            ? 'bg-[#1a1a1a] font-semibold text-[#fcfbf9]'
                            : 'text-stone-500 hover:text-[#1a1a1a]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {dashboardRange === 'custom' && (
                    <div className="flex items-center gap-2 rounded-sm border border-stone-200 bg-white p-1">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(event) => setCustomStartDate(event.target.value)}
                        className="cursor-pointer border-none bg-transparent px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#1a1a1a] outline-none"
                      />
                      <span className="px-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400">To</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(event) => setCustomEndDate(event.target.value)}
                        className="cursor-pointer border-none bg-transparent px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#1a1a1a] outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
                {statCards.slice(0, 4).map((card) => {
                  const Icon = card.icon;
                  const content = (
                    <>
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <span className="block font-sans text-[9px] uppercase tracking-widest text-stone-500">{card.label}</span>
                        <div className={`bg-stone-100 p-2 ${card.tone}`}>
                          <Icon size={14} />
                        </div>
                      </div>
                      <p className="font-serif text-3xl leading-none text-[#1a1a1a] md:text-4xl">
                        {card.value}
                      </p>
                      <div className={`mt-3 flex items-center gap-1.5 font-mono text-[10px] font-medium leading-5 ${card.tone}`}>
                        <span className="truncate">{card.note}</span>
                        {card.onClick && <ChevronRight size={11} />}
                      </div>
                    </>
                  );

                  if (card.onClick) {
                    return (
                      <button
                        key={card.label}
                        type="button"
                        onClick={card.onClick}
                        className="cursor-pointer border border-stone-200 bg-white p-6 text-left transition-colors hover:border-[#1a1a1a] md:p-8"
                      >
                        {content}
                      </button>
                    );
                  }

                  return (
                    <div key={card.label} className="border border-stone-200 bg-white p-6 transition-colors hover:border-[#1a1a1a] md:p-8">
                      {content}
                    </div>
                  );
                })}
              </div>

              <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-4">
                {statCards.slice(4).map((card) => {
                  const Icon = card.icon;
                  const content = (
                    <>
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <span className="block font-sans text-[9px] uppercase tracking-widest text-stone-500">{card.label}</span>
                        <div className={`bg-stone-100 p-2 ${card.tone}`}>
                          <Icon size={14} />
                        </div>
                      </div>
                      <p className={`font-serif text-2xl leading-none md:text-3xl ${card.tone}`}>
                        {card.value}
                      </p>
                      <div className={`mt-3 flex items-center gap-1.5 font-mono text-[10px] font-medium leading-5 ${card.tone}`}>
                        <span className="truncate">{card.note}</span>
                        {card.onClick && <ChevronRight size={11} />}
                      </div>
                    </>
                  );

                  if (card.onClick) {
                    return (
                      <button
                        key={card.label}
                        type="button"
                        onClick={card.onClick}
                        className="cursor-pointer border border-stone-200 bg-stone-50 p-6 text-left transition-colors hover:border-[#1a1a1a] md:p-8"
                      >
                        {content}
                      </button>
                    );
                  }

                  return (
                    <div key={card.label} className="border border-stone-200 bg-stone-50 p-6 transition-colors hover:border-[#1a1a1a] md:p-8">
                      {content}
                    </div>
                  );
                })}
              </div>

              <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="flex flex-col border border-stone-200 bg-white p-6 md:p-8 lg:col-span-2">
                  <div className="mb-8 flex shrink-0 items-center justify-between gap-4">
                    <div>
                      <h2 className="font-serif text-2xl">Sales Revenue Trend</h2>
                    </div>
                  </div>

                  <div className="relative min-h-[300px] flex-1">
                    <svg viewBox="0 0 700 240" className="w-full h-full overflow-visible">
                      <line x1="40" y1="30" x2="680" y2="30" stroke="#f1f0ee" strokeWidth="1" strokeDasharray="3,3" />
                      <line x1="40" y1="90" x2="680" y2="90" stroke="#f1f0ee" strokeWidth="1" strokeDasharray="3,3" />
                      <line x1="40" y1="150" x2="680" y2="150" stroke="#f1f0ee" strokeWidth="1" strokeDasharray="3,3" />
                      <line x1="40" y1="210" x2="680" y2="210" stroke="#e5e5e3" strokeWidth="1" />

                      <text x="5" y="34" className="fill-stone-400 text-[9px] font-mono">{formatCurrency(maxSales)}</text>
                      <text x="5" y="94" className="fill-stone-400 text-[9px] font-mono">{formatCurrency(Math.round(maxSales * 0.66))}</text>
                      <text x="5" y="154" className="fill-stone-400 text-[9px] font-mono">{formatCurrency(Math.round(maxSales * 0.33))}</text>
                      <text x="15" y="214" className="fill-stone-400 text-[9px] font-mono">Rs. 0</text>

                      <path
                        d={chartPath}
                        fill="none"
                        stroke="#1a1a1a"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      <path
                        d={chartAreaPath}
                        fill="url(#salesGrad)"
                        className="opacity-[0.05]"
                      />

                      {chartPoints.map((dot, index) => (
                        <g key={index} className="group/dot cursor-pointer">
                          <circle cx={dot.x} cy={dot.y} r="4" fill="#1a1a1a" stroke="#fcfbf9" strokeWidth="2" className="transition-all duration-300 group-hover/dot:r-6" />
                          <g className="opacity-0 group-hover/dot:opacity-100 transition-all duration-300 pointer-events-none">
                            <rect x={dot.x - 45} y={dot.y - 30} width="90" height="20" rx="6" fill="#1a1a1a" />
                            <text x={dot.x} y={dot.y - 17} textAnchor="middle" fill="#fcfbf9" className="text-[8.5px] font-mono">{formatCurrency(dot.sales)}</text>
                          </g>
                        </g>
                      ))}

                      {salesHistory.map((day, dIdx) => (
                        <text key={dIdx} x={40 + dIdx * (640 / Math.max(salesHistory.length - 1, 1))} y="235" textAnchor="middle" className="fill-stone-500 text-[10px] font-sans">{day.date}</text>
                      ))}

                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1a1a1a" />
                          <stop offset="100%" stopColor="#fcfbf9" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>

                <div className="flex flex-col border border-stone-200 bg-white p-6 md:p-8">
                  <div className="mb-8 flex shrink-0 items-center justify-between">
                    <h2 className="font-serif text-2xl">Sales by Category</h2>
                  </div>

                  <div className="relative mx-auto flex min-h-[300px] w-full flex-1 items-center justify-center">
                    <div
                      className="absolute h-[180px] w-[180px] rounded-full"
                      style={{ background: categoryConicGradient }}
                    />
                    <div className="absolute h-[120px] w-[120px] rounded-full border border-stone-200 bg-white" />
                    <div className="relative text-center">
                      <span className="block font-sans text-[10px] uppercase tracking-widest text-stone-400">Total</span>
                      <span className="mt-1 block font-serif text-xl leading-none text-[#1a1a1a]">
                        {categoryStatsTotal || products.length}
                      </span>
                      <span className="mt-1 block font-sans text-[9px] uppercase tracking-widest text-stone-400">SKUs</span>
                    </div>
                  </div>

                  <div className="admin-scrollbar mt-6 grid max-h-[92px] grid-cols-2 gap-4 overflow-y-auto pr-2">
                    {categoryChartData.length > 0 ? (
                      categoryChartData.map((item) => (
                        <div key={item.category} className="flex min-w-0 items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="truncate font-sans text-[11px] text-stone-500">{item.category}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center font-sans text-[10px] uppercase tracking-widest text-stone-400">
                        No category data
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex h-[400px] flex-col border border-stone-200 bg-white p-6 md:p-8">
                <div className="mb-8 flex shrink-0 items-center justify-between">
                  <h2 className="font-serif text-2xl">Recent Orders</h2>
                  <button onClick={() => setActiveTab('ORDERS')} className="cursor-pointer border-b border-transparent pb-1 text-[9px] uppercase tracking-widest text-stone-400 transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]">
                    View All
                  </button>
                </div>

                <div className="admin-scrollbar flex min-h-0 flex-1 flex-col overflow-x-auto">
                  <div className="flex min-w-[500px] flex-1 flex-col">
                    <div className="w-full shrink-0">
                      <div className="mb-2 grid grid-cols-5 gap-4 border-b border-[#1a1a1a] pb-4 text-[9px] font-semibold uppercase tracking-widest text-stone-400">
                        <div className="col-span-1">Order</div>
                        <div className="col-span-1">Date</div>
                        <div className="col-span-1 text-center">Status</div>
                        <div className="col-span-1 text-right">Total</div>
                        <div className="col-span-1 text-right">Action</div>
                      </div>
                    </div>

                    <div className="admin-scrollbar -mr-4 flex-1 overflow-y-auto pr-4">
                      <div className="flex flex-col">
                        {recentOrders.slice(0, 8).map((order) => (
                          <div key={order.id} className="-mx-2 grid grid-cols-5 items-center gap-4 border-b border-stone-100 px-2 py-4 transition-colors hover:bg-stone-50">
                            <div className="font-sans text-[11px] font-medium">{order.id}</div>
                            <div className="font-sans text-[11px] text-stone-500">{formatDate(order.createdAt)}</div>
                            <div className="text-center font-sans text-[9px] uppercase tracking-widest">
                              <span className={`inline-block rounded-sm border px-3 py-1 font-normal ${getOrderStatusBadgeClasses(order.status)}`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="text-right font-serif text-lg">{formatCurrency(order.total)}</div>
                            <div className="text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('ORDERS');
                                  setViewingOrder(order);
                                }}
                                className="cursor-pointer border-b border-transparent pb-1 text-[9px] uppercase tracking-widest text-stone-400 transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'CATALOG' && (
            <div className="flex h-full flex-col">
              <div className="mb-8 flex shrink-0 flex-col items-start justify-between gap-6 md:flex-row md:items-end">
                <h1 className="font-serif text-3xl md:text-4xl">Products</h1>

                <div className="flex w-full flex-col items-center gap-4 md:w-auto md:flex-row">
                  <div className="flex w-full items-center gap-4 border border-stone-200 bg-white px-3 py-2 md:w-auto">
                    <Search size={14} className="text-stone-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                      placeholder="Search products..."
                      className="w-full border-none bg-transparent text-[11px] outline-none placeholder:text-stone-400 md:w-48"
                    />
                  </div>

                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="w-full cursor-pointer appearance-none border border-stone-200 bg-white px-3 py-2 text-[11px] outline-none md:w-40"
                  >
                    <option value="All">All Categories</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={openAddModal}
                    className="w-full cursor-pointer bg-[#1a1a1a] px-6 py-3 text-[9px] uppercase tracking-widest text-[#fcfbf9] transition-colors hover:bg-stone-800 md:w-auto"
                  >
                    Add Product
                  </button>
                </div>
              </div>

              <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[
                  { label: 'Active SKUs', value: catalogInventorySummary.active, tone: 'text-green-700', note: 'Visible storefront' },
                  { label: 'Low Stock', value: catalogInventorySummary.lowStock, tone: 'text-amber-700', note: 'At or below alert' },
                  { label: 'Out of Stock', value: catalogInventorySummary.outOfStock, tone: 'text-red-700', note: 'Cannot fulfill' },
                  { label: 'Hidden', value: catalogInventorySummary.hidden, tone: 'text-stone-600', note: 'Not visible' },
                ].map((item) => (
                  <div key={item.label} className="border border-stone-200 bg-white p-6 md:p-8">
                    <p className="font-sans text-[9px] font-semibold uppercase tracking-widest text-stone-400">{item.label}</p>
                    <p className={`mt-2 font-serif text-2xl leading-none ${item.tone}`}>{item.value}</p>
                    <p className="mt-1 font-sans text-[9px] font-normal text-stone-400">{item.note}</p>
                  </div>
                ))}
              </div>

              <div className="flex w-full flex-col overflow-hidden border border-stone-200 bg-white">
                <div className="admin-scrollbar max-h-[680px] overflow-auto">
                  <div className="min-w-[1000px]">
                    <div className="sticky top-0 z-10 grid grid-cols-12 gap-4 border-b border-[#1a1a1a] bg-stone-50 p-4 font-sans text-[9px] font-semibold uppercase tracking-widest text-stone-400">
                      <div className="col-span-3">Product</div>
                      <div className="col-span-2">Details</div>
                      <div className="col-span-2 text-center">Inventory</div>
                      <div className="col-span-1 text-right">Price</div>
                      <div className="col-span-2 text-center">Shiprocket Details</div>
                      <div className="col-span-1 text-center">Status</div>
                      <div className="col-span-1 text-right">Action</div>
                    </div>

                    <div className="divide-y divide-stone-100">
                      {paginatedCatalog.map((product) => {
                        const inventoryStatus = getInventoryStatus(product);
                        const imageCount = Math.max(product.images.length, product.image ? 1 : 0);

                        return (
                          <div key={product.id} className="grid grid-cols-12 items-center gap-4 p-4 transition-colors hover:bg-stone-50">
                            <div className="col-span-3 flex items-start gap-4">
                              <div className="relative h-20 w-16 shrink-0 overflow-hidden border border-stone-200 bg-stone-100">
                                <img src={product.image} className="h-full w-full object-cover" alt={product.name} />
                                {imageCount > 1 && (
                                  <div className="absolute bottom-1 right-1 bg-white/90 px-1 font-sans text-[8px]">
                                    +{imageCount - 1}
                                  </div>
                                )}
                              </div>
                              <div className="flex min-w-0 flex-col">
                                <span className="mb-1 truncate font-sans text-[11px] font-medium text-[#1a1a1a]">{product.name}</span>
                                <span className="line-clamp-2 font-sans text-[10px] leading-relaxed text-stone-500">{product.description || 'No description.'}</span>
                              </div>
                            </div>

                            <div className="col-span-2 flex flex-col gap-1">
                              <span className="font-sans text-[11px] text-[#1a1a1a]">{product.category}</span>
                              <span className="font-sans text-[10px] text-stone-500">{product.material} &middot; {product.color}</span>
                            </div>

                            <div className="col-span-2 flex flex-col items-center justify-center text-center">
                              <span className={`font-sans text-[11px] ${product.stockQuantity <= product.lowStockThreshold ? 'font-medium text-red-600' : 'text-[#1a1a1a]'}`}>
                                {product.stockQuantity} in stock
                              </span>
                              {product.stockQuantity <= product.lowStockThreshold && (
                                <span className="mt-1 text-[8px] uppercase tracking-widest text-red-600">Low Stock</span>
                              )}
                            </div>

                            <div className="col-span-1 text-right font-serif text-lg">
                              {formatCurrency(product.price)}
                            </div>

                            <div className="col-span-2 flex flex-col items-center justify-center text-center">
                              <span className="font-sans text-[10px] text-stone-500">
                                {product.packageDetails.lengthCm}x{product.packageDetails.breadthCm}x{product.packageDetails.heightCm} cm
                              </span>
                              <span className="mt-0.5 font-sans text-[10px] text-stone-500">
                                {product.packageDetails.weightKg} kg
                              </span>
                            </div>

                            <div className="col-span-1 text-center">
                              <span className={`rounded-full px-3 py-1 text-[8px] uppercase tracking-widest ${product.isActive ? 'bg-[#1a1a1a] text-[#fcfbf9]' : 'bg-stone-200 text-stone-500'}`}>
                                {product.isActive ? 'Active' : 'Hidden'}
                              </span>
                              <span className="sr-only">{inventoryStatus.label}</span>
                            </div>

                            <div className="col-span-1 flex items-center justify-end gap-3 text-right">
                              <button
                                type="button"
                                onClick={() => openEditModal(product)}
                                className="cursor-pointer text-[9px] uppercase tracking-widest text-stone-400 transition-colors hover:text-[#1a1a1a]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(product)}
                                className="cursor-pointer text-[9px] uppercase tracking-widest text-red-500 transition-colors hover:text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {isProductsLoading && (
                  <div className="p-16 text-center text-[9px] font-semibold uppercase tracking-widest text-stone-400">
                    Loading catalog
                  </div>
                )}

                {!isProductsLoading && filteredCatalog.length === 0 && (
                  <div className="p-16 text-center text-stone-400 flex flex-col items-center justify-center">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest">Void product list</p>
                    <p className="text-xs font-light text-stone-500 mb-6">No matching items were found matching your filters.</p>
                    <button
                      onClick={() => {
                        setProductSearch('');
                        setSelectedCategory('All');
                      }}
                      className="cursor-pointer border-b border-[#1a1a1a] pb-1 text-[9px] font-semibold uppercase tracking-widest text-[#1a1a1a] transition-opacity hover:opacity-60"
                    >
                      Clear Filter
                    </button>
                  </div>
                )}

                {!isProductsLoading && filteredCatalog.length > 0 && (
                  <PaginationControls
                    page={catalogPage}
                    pageCount={catalogPageCount}
                    totalCount={filteredCatalog.length}
                    pageSize={catalogPageSize}
                    label="products"
                    onPageChange={setCatalogPage}
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === 'ORDERS' && (
            <div className="flex h-full flex-col">
              {viewingOrder ? (
                <OrderDrawer
                  order={viewingOrder}
                  onClose={() => setViewingOrder(null)}
                  onMarkPacked={() => {
                    void handleMarkPacked(viewingOrder);
                  }}
                  onCreateShipment={() => {
                    void handleCreateShipment(viewingOrder);
                  }}
                  onSyncShipment={() => {
                    void handleSyncShipment(viewingOrder);
                  }}
                  onCancelShipment={() => {
                    setCancelShipmentCandidate(viewingOrder);
                  }}
                  onCancelOrder={() => {
                    setCancelCandidate(viewingOrder);
                  }}
                  isUpdating={updatingOrderFor === viewingOrder.id}
                  isCreatingShipment={creatingShipmentFor === viewingOrder.id}
                  isSyncingShipment={syncingShipmentFor === viewingOrder.id}
                  isCancellingShipment={cancellingShipmentFor === viewingOrder.id}
                  variant="page"
                />
              ) : (
                <>
                  <div className="mb-8 flex shrink-0 flex-col items-start justify-between gap-6 md:flex-row md:items-end">
                    <h1 className="font-serif text-3xl md:text-4xl">Orders</h1>
                    <button
                      type="button"
                      onClick={() => void fetchOrders()}
                      className="shrink-0 cursor-pointer bg-[#1a1a1a] px-6 py-3 text-[9px] uppercase tracking-widest text-[#fcfbf9] transition-colors hover:bg-stone-800"
                    >
                      <RotateCcw size={13} />
                      Refresh Orders
                    </button>
                  </div>

                  <div className="mb-6 shrink-0">
                    <div className="admin-scrollbar flex flex-wrap gap-2 overflow-x-auto">
                      {orderQueueOptions.map((queue) => {
                        const isActive = activeOrderQueue === queue.value;

                        return (
                          <button
                            key={queue.value}
                            type="button"
                            onClick={() => setActiveOrderQueue(queue.value)}
                            className={`cursor-pointer rounded-sm border px-4 py-2 text-[9px] uppercase tracking-widest transition-colors ${
                              isActive
                                ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                                : 'border-stone-200 bg-white text-stone-500 hover:border-stone-400'
                            }`}
                          >
                            {queue.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-6 flex w-full shrink-0 flex-col items-start gap-4 border border-stone-200 bg-white p-4 xl:flex-row xl:items-center">
                    <div className="flex w-full flex-1 items-center gap-3 border border-stone-200 px-3 py-2 xl:w-auto">
                      <Search size={14} className="shrink-0 text-stone-400" />
                      <input
                        type="text"
                        value={orderSearch}
                        onChange={(event) => setOrderSearch(event.target.value)}
                        placeholder="Search by order, customer, email, phone..."
                        className="w-full border-none bg-transparent text-[11px] outline-none placeholder:text-stone-400"
                      />
                    </div>

                    <div className="flex w-full flex-wrap gap-3 xl:w-auto">
                      <select
                        value={paymentStatusFilter}
                        onChange={(event) => setPaymentStatusFilter(event.target.value as 'All' | Order['paymentStatus'])}
                        className="cursor-pointer appearance-none border border-stone-200 bg-white px-3 py-2 text-[10px] uppercase tracking-widest outline-none"
                      >
                        <option value="All">Payment: All</option>
                        <option value="pending">Pending</option>
                        <option value="authorized">Authorized</option>
                        <option value="paid">Paid</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                      </select>

                      <select
                        value={orderStatusFilter}
                        onChange={(event) => setOrderStatusFilter(event.target.value as 'All' | OrderStatus)}
                        className="cursor-pointer appearance-none border border-stone-200 bg-white px-3 py-2 text-[10px] uppercase tracking-widest outline-none"
                      >
                        <option value="All">Fulfillment: All</option>
                        {orderStatuses.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>

                      <select
                        value={shippingStatusFilter}
                        onChange={(event) => setShippingStatusFilter(event.target.value as 'All' | Order['shippingStatus'])}
                        className="cursor-pointer appearance-none border border-stone-200 bg-white px-3 py-2 text-[10px] uppercase tracking-widest outline-none"
                      >
                        <option value="All">Shipping: All</option>
                        <option value="not_created">Not Created</option>
                        <option value="created">Created</option>
                        <option value="in_transit">In Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="failed">Failed</option>
                      </select>

                      <div className="flex items-center gap-2 border border-stone-200 bg-white p-1">
                        <input
                          type="date"
                          value={orderStartDate}
                          onChange={(event) => setOrderStartDate(event.target.value)}
                          className="h-full cursor-pointer border-none bg-transparent px-2 py-0.5 text-[10px] uppercase tracking-widest text-[#1a1a1a] outline-none"
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">To</span>
                        <input
                          type="date"
                          value={orderEndDate}
                          onChange={(event) => setOrderEndDate(event.target.value)}
                          className="h-full cursor-pointer border-none bg-transparent px-2 py-0.5 text-[10px] uppercase tracking-widest text-[#1a1a1a] outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setOrderSearch('');
                          setOrderStatusFilter('All');
                          setPaymentStatusFilter('All');
                          setShippingStatusFilter('All');
                          setActiveOrderQueue('all');
                          setOrderStartDate('');
                          setOrderEndDate('');
                        }}
                        className="cursor-pointer px-2 text-[10px] uppercase tracking-widest text-stone-500 underline underline-offset-4 transition-colors hover:text-[#1a1a1a]"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="flex min-h-[400px] w-full flex-1 flex-col overflow-hidden border border-stone-200 bg-white">
                    <div className="admin-scrollbar overflow-auto">
                      <div className="min-w-[800px]">
                        <div className="grid grid-cols-12 gap-4 border-b border-[#1a1a1a] bg-stone-50 p-4 text-[9px] font-semibold uppercase tracking-widest text-stone-400">
                          <div className="col-span-2">Order</div>
                          <div className="col-span-3">Customer</div>
                          <div className="col-span-1 text-center">Payment</div>
                          <div className="col-span-2 text-center">Fulfillment</div>
                          <div className="col-span-2 text-center">Shipping</div>
                          <div className="col-span-1 text-right">Total</div>
                          <div className="col-span-1 text-right">Action</div>
                        </div>

                        <div className="divide-y divide-stone-100">
                          {paginatedOrders.map((order) => {
                            const itemCount = order.items.reduce((acc, current) => acc + current.quantity, 0);
                            const needsAction = canMarkPacked(order) || canCreateShipment(order);

                            return (
                              <button
                                key={order.id}
                                type="button"
                                onClick={() => setViewingOrder(order)}
                                className="group grid w-full cursor-pointer grid-cols-12 items-center gap-4 p-4 text-left transition-colors hover:bg-stone-50"
                              >
                                <div className="col-span-2 flex flex-col gap-1">
                                  <span className="font-sans text-[12px] font-medium text-[#1a1a1a]">{order.id}</span>
                                  <span className="font-sans text-[10px] text-stone-500">{formatDate(order.createdAt)}</span>
                                </div>
                                <div className="col-span-3 flex min-w-0 flex-col">
                                  <span className="truncate font-sans text-[11px] font-medium text-[#1a1a1a]">{order.customer.name}</span>
                                  <span className="truncate font-sans text-[10px] text-stone-500">{order.customer.email || order.customer.phone}</span>
                                  <span className="mt-1 text-[9px] uppercase tracking-widest text-stone-400">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                                </div>
                                <div className="col-span-1 flex items-center justify-center text-center">
                                <span className={`rounded-sm border px-3 py-1 text-[9px] uppercase tracking-widest ${getPaymentStatusBadgeClasses(order.paymentStatus)}`}>
                                    {formatStatusLabel(order.paymentStatus)}
                                  </span>
                                </div>
                                <div className="col-span-2 flex items-center justify-center text-center">
                                <span className={`rounded-sm border px-3 py-1 text-[9px] uppercase tracking-widest ${getOrderStatusBadgeClasses(order.status)}`}>
                                    {order.status}
                                  </span>
                                </div>
                                <div className="col-span-2 flex flex-col items-center justify-center text-center">
                                <span className={`rounded-sm border px-3 py-1 text-[9px] uppercase tracking-widest ${getShippingStatusBadgeClasses(order.shippingStatus)}`}>
                                    {formatStatusLabel(order.shippingStatus)}
                                  </span>
                                {needsAction && <span className="mt-1 text-[9px] uppercase tracking-widest text-amber-700">Action needed</span>}
                                </div>
                                <div className="col-span-1 text-right font-serif text-lg text-[#1a1a1a]">
                                  {formatCurrency(order.total)}
                                </div>
                                <div className="col-span-1 flex justify-end text-right">
                                  <span className="border-b border-transparent pb-0.5 text-[9px] uppercase tracking-widest text-stone-400 transition-colors group-hover:border-[#1a1a1a] group-hover:text-[#1a1a1a]">
                                    Details
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {!isLoading && filteredOrders.length === 0 && (
                      <div className="flex flex-col items-center justify-center px-8 py-20 text-center text-stone-400">
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest">
                          {orders.length === 0 ? 'No orders yet' : 'No matching orders'}
                        </p>
                        <p className="mb-6 text-xs font-light text-stone-500">
                          {orders.length === 0 ? 'Paid checkout orders will appear here after they are created.' : 'Change or clear filters to view more orders.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (orders.length === 0) {
                              void fetchOrders();
                              return;
                            }

                            setOrderSearch('');
                            setOrderStatusFilter('All');
                            setPaymentStatusFilter('All');
                            setShippingStatusFilter('All');
                            setActiveOrderQueue('all');
                            setOrderStartDate('');
                            setOrderEndDate('');
                          }}
                          className="cursor-pointer border-b border-[#1a1a1a] pb-1 text-[9px] font-semibold uppercase tracking-widest text-[#1a1a1a] transition-opacity hover:opacity-60"
                        >
                          {orders.length === 0 ? 'Refresh Orders' : 'Clear Filters'}
                        </button>
                      </div>
                    )}

                    {isLoading && (
                      <div className="px-8 py-20 text-center text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                        Loading orders
                      </div>
                    )}

                    {!isLoading && filteredOrders.length > 0 && orderPageCount > 1 && (
                      <div className="mt-6 flex shrink-0 items-center justify-between border-t border-stone-200 pt-6">
                        <button
                          type="button"
                          disabled={orderPage <= 1}
                          onClick={() => setOrderPage((page) => Math.max(1, page - 1))}
                          className="cursor-pointer border border-stone-200 px-4 py-2 text-[9px] uppercase tracking-widest text-[#1a1a1a] transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          Previous
                        </button>
                        <span className="font-sans text-[11px] text-stone-500">
                          Page {orderPage} of {orderPageCount}
                        </span>
                        <button
                          type="button"
                          disabled={orderPage >= orderPageCount}
                          onClick={() => setOrderPage((page) => Math.min(orderPageCount, page + 1))}
                          className="cursor-pointer border border-stone-200 px-4 py-2 text-[9px] uppercase tracking-widest text-[#1a1a1a] transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'CUSTOMERS' && (
            <div className="flex h-full flex-col">
              {!selectedCustomer ? (
                <>
                  <div className="mb-12 flex items-end justify-between">
                    <h1 className="font-serif text-3xl md:text-4xl">Customers</h1>
                  </div>

                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[600px]">
                      <div className="mb-4 grid grid-cols-4 gap-4 border-b border-[#1a1a1a] pb-4 font-sans text-[9px] font-semibold uppercase tracking-widest text-stone-400">
                        <div className="col-span-1">Name</div>
                        <div className="col-span-1">Email</div>
                        <div className="col-span-1 text-center">Orders</div>
                        <div className="col-span-1 text-right">Action</div>
                      </div>

                      {paginatedCustomers.map((customer) => (
                        <div key={customer.id} className="grid grid-cols-4 items-center gap-4 border-b border-stone-200 py-4 transition-colors hover:bg-stone-50">
                          <div className="font-sans text-[11px] font-medium text-[#1a1a1a]">{customer.name}</div>
                          <div className="truncate font-sans text-[11px] font-normal text-stone-500">{customer.email || 'No email'}</div>
                          <div className="text-center font-sans text-[11px] font-normal text-stone-500">{customer.orderCount}</div>
                          <div className="text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerId(customer.id)}
                              className="cursor-pointer border-b border-[#1a1a1a] pb-1 font-sans text-[9px] font-normal uppercase tracking-widest text-[#1a1a1a] transition-opacity hover:opacity-60"
                            >
                              View Profile
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {customers.length === 0 && (
                      <div className="flex flex-col items-center justify-center border border-dashed border-stone-200 p-12 text-center text-stone-400">
                        <ShoppingBag size={24} strokeWidth={1} className="mb-4" />
                        <span className="font-sans text-[11px] font-normal">Customers will appear here after orders are placed.</span>
                      </div>
                    )}

                    {customerPageCount > 1 && (
                      <div className="mt-4 flex shrink-0 items-center justify-between border-t border-stone-200 pt-4">
                        <span className="font-sans text-[11px] font-normal text-stone-500">
                          Showing {(customerPage - 1) * customerPageSize + 1} to {Math.min(customerPage * customerPageSize, customers.length)} of {customers.length} entries
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setCustomerPage((page) => Math.max(1, page - 1))}
                            disabled={customerPage === 1}
                            className="cursor-pointer border border-stone-200 px-3 py-1 font-sans text-[10px] font-normal uppercase tracking-widest transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Prev
                          </button>
                          <span className="flex items-center px-3 py-1 font-sans text-[11px] font-normal">
                            Page {customerPage} of {customerPageCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCustomerPage((page) => Math.min(customerPageCount, page + 1))}
                            disabled={customerPage === customerPageCount}
                            className="cursor-pointer border border-stone-200 px-3 py-1 font-sans text-[10px] font-normal uppercase tracking-widest transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col">
                  <div className="mb-8">
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerId(null)}
                      className="flex cursor-pointer items-center gap-2 font-sans text-[9px] font-normal uppercase tracking-widest text-stone-400 transition-colors hover:text-[#1a1a1a]"
                    >
                      <ArrowLeft size={12} />
                      Back to Customers
                    </button>
                  </div>

                  <div className="flex flex-1 flex-col gap-12 md:flex-row">
                    <div className="flex w-full flex-col gap-6 md:w-1/3">
                      <div className="flex flex-col items-center border border-stone-200 bg-white p-8 text-center">
                        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-stone-100 font-serif text-3xl text-[#1a1a1a]">
                          {selectedCustomer.name.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="font-serif text-2xl text-[#1a1a1a]">{selectedCustomer.name}</h2>
                        <div className="mt-1 font-sans text-[11px] font-normal text-stone-400">
                          Customer since {new Date(selectedCustomer.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>

                        <div className="my-6 h-px w-full bg-stone-100" />

                        <div className="w-full space-y-4 text-left">
                          <div className="group flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="mb-1 font-sans text-[9px] font-normal uppercase tracking-widest text-stone-400">Email Address</div>
                              <div className="truncate font-sans text-[12px] font-normal text-[#1a1a1a]">{selectedCustomer.email || 'No email'}</div>
                            </div>
                            <CopyButton value={selectedCustomer.email} label="" />
                          </div>

                          <div className="group flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="mb-1 font-sans text-[9px] font-normal uppercase tracking-widest text-stone-400">Phone Number</div>
                              <div className="font-sans text-[12px] font-normal text-[#1a1a1a]">{selectedCustomer.phone || 'No phone'}</div>
                            </div>
                            <CopyButton value={selectedCustomer.phone} label="" />
                          </div>

                          <div>
                            <div className="mb-1 font-sans text-[9px] font-normal uppercase tracking-widest text-stone-400">Default Address</div>
                            <div className="font-sans text-[12px] font-normal leading-relaxed text-[#1a1a1a]">{selectedCustomer.address || 'No address saved'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center border border-stone-200 bg-stone-50 p-8 text-center">
                        <div className="mb-2 font-sans text-[9px] font-normal uppercase tracking-widest text-stone-400">Total Spent</div>
                        <div className="font-serif text-3xl text-[#1a1a1a]">{formatCurrency(selectedCustomer.totalSpent)}</div>
                        <div className="mt-2 font-sans text-[11px] font-normal text-stone-500">Across {selectedCustomer.orderCount} orders</div>
                      </div>
                    </div>

                    <div className="w-full md:w-2/3">
                      <h3 className="mb-6 font-serif text-xl">Recent Orders</h3>
                      {selectedCustomer.recentOrders.length > 0 ? (
                        <div className="space-y-4">
                          {selectedCustomer.recentOrders.slice(0, 5).map((order) => (
                            <button
                              key={order.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomerId(null);
                                navigate(adminTabRoutes.ORDERS);
                                setViewingOrder(order);
                              }}
                              className="group flex w-full cursor-pointer items-center justify-between border border-stone-200 bg-white p-6 text-left transition-colors hover:border-[#1a1a1a]"
                            >
                              <div>
                                <div className="font-sans text-[12px] font-medium text-[#1a1a1a]">{order.id}</div>
                                <div className="mt-1 font-sans text-[10px] font-normal text-stone-400">Placed on {formatDate(order.createdAt)}</div>
                              </div>
                              <div className="flex items-center gap-6">
                                <span className="font-serif text-lg">{formatCurrency(order.total)}</span>
                                <span className={`rounded-sm border px-3 py-1 font-sans text-[9px] font-normal uppercase tracking-widest ${getOrderStatusBadgeClasses(order.status)}`}>
                                  {order.status}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center border border-dashed border-stone-200 p-12 text-center text-stone-400">
                          <ShoppingBag size={24} strokeWidth={1} className="mb-4" />
                          <span className="font-sans text-[11px] font-normal">This customer has not placed any orders yet.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {isModalOpen && (
        <ProductModal
          mode={editingProduct ? 'edit' : 'add'}
          form={productForm}
          onClose={closeModal}
          onSubmit={handleProductSubmit}
          onChange={handleFormChange}
          onImageFilesAdd={handleImageFilesAdd}
          onImageRemove={handleImageRemove}
          isUploading={isProductImageUploading}
        />
      )}

      <AnimatePresence>
        {cancelCandidate && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-[#1a1a1a]/40 backdrop-blur-sm"
              onClick={() => setCancelCandidate(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.4 }}
              className="relative z-10 w-full max-w-sm border border-stone-200 bg-[#fcfbf9] p-8 text-center shadow-2xl"
            >
              <h3 className="mb-4 font-serif text-2xl text-[#1a1a1a]">Cancel Order</h3>
              <p className="mb-8 font-sans text-[11px] leading-relaxed text-stone-500">
                Are you sure you want to cancel <span className="font-semibold text-[#1a1a1a]">{cancelCandidate.id}</span>? Use this only for customer requests, stock issues, or invalid order details.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  disabled={updatingOrderFor === cancelCandidate.id}
                  onClick={() => void confirmCancelOrder()}
                  className="w-full cursor-pointer bg-red-600 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingOrderFor === cancelCandidate.id ? 'Cancelling' : 'Confirm Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => setCancelCandidate(null)}
                  className="w-full cursor-pointer border border-stone-200 bg-transparent py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-[#1a1a1a] transition-colors hover:bg-stone-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cancelShipmentCandidate && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-[#1a1a1a]/40 backdrop-blur-sm"
              onClick={() => setCancelShipmentCandidate(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.4 }}
              className="relative z-10 w-full max-w-sm border border-stone-200 bg-[#fcfbf9] p-8 text-center shadow-2xl"
            >
              <h3 className="mb-4 font-serif text-2xl text-[#1a1a1a]">Cancel Shipment</h3>
              <p className="mb-8 font-sans text-[11px] leading-relaxed text-stone-500">
                Are you sure you want to request Shiprocket cancellation for <span className="font-semibold text-[#1a1a1a]">{cancelShipmentCandidate.id}</span>? This works only before pickup or courier movement begins.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  disabled={cancellingShipmentFor === cancelShipmentCandidate.id}
                  onClick={() => void confirmCancelShipment()}
                  className="w-full cursor-pointer bg-red-600 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancellingShipmentFor === cancelShipmentCandidate.id ? 'Cancelling' : 'Confirm Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => setCancelShipmentCandidate(null)}
                  className="w-full cursor-pointer border border-stone-200 bg-transparent py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-[#1a1a1a] transition-colors hover:bg-stone-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isAdminLogoutModalOpen && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-[#1a1a1a]/40 backdrop-blur-sm"
              onClick={() => setIsAdminLogoutModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.4 }}
              className="relative z-10 w-full max-w-sm border border-stone-200 bg-[#fcfbf9] p-8 text-center shadow-2xl"
            >
              <h3 className="mb-4 font-serif text-2xl text-[#1a1a1a]">Sign Out</h3>
              <p className="mb-8 font-sans text-[11px] leading-relaxed text-stone-500">
                Are you sure you want to end your admin session? You will need to log in again to access the portal.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminLogoutModalOpen(false);
                    clearAdminToken();
                    showSuccess('Signed out successfully.');
                    navigate('/admin/login', { replace: true });
                  }}
                  className="w-full cursor-pointer bg-[#1a1a1a] py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-[#fcfbf9] transition-colors hover:bg-stone-800"
                >
                  Confirm Logout
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdminLogoutModalOpen(false)}
                  className="w-full cursor-pointer border border-stone-200 bg-transparent py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-[#1a1a1a] transition-colors hover:bg-stone-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteProductCandidate && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-[#1a1a1a]/40 backdrop-blur-sm"
              onClick={() => setDeleteProductCandidate(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.4 }}
              className="relative z-10 w-full max-w-sm border border-stone-200 bg-[#fcfbf9] p-8 text-center shadow-2xl"
            >
              <h3 className="mb-4 font-serif text-2xl text-[#1a1a1a]">Delete Product</h3>
              <p className="mb-8 font-sans text-[11px] leading-relaxed text-stone-500">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-[#1a1a1a]">{deleteProductCandidate.name}</span>? This action cannot be undone.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  disabled={deletingProductFor === deleteProductCandidate.id}
                  onClick={() => void confirmDeleteProduct()}
                  className="w-full cursor-pointer bg-red-600 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingProductFor === deleteProductCandidate.id ? 'Deleting' : 'Confirm Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteProductCandidate(null)}
                  className="w-full cursor-pointer border border-stone-200 bg-transparent py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-[#1a1a1a] transition-colors hover:bg-stone-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
