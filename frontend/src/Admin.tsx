import { type ChangeEvent, type DragEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  LockKeyhole,
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

type AdminTab = 'OVERVIEW' | 'CATALOG' | 'ORDERS';
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

const adminTabRoutes: Record<AdminTab, string> = {
  OVERVIEW: '/admin/overview',
  CATALOG: '/admin/catalog',
  ORDERS: '/admin/orders',
};

const adminPathToTab = (pathname: string): AdminTab => {
  if (pathname.startsWith('/admin/catalog')) {
    return 'CATALOG';
  }

  if (pathname.startsWith('/admin/orders')) {
    return 'ORDERS';
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

const getStatusClasses = (status: OrderStatus) => {
  switch (status) {
    case 'Delivered':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Shipped':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Cancelled':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-stone-100 text-stone-700 border-stone-200';
  }
};

const formatStatusLabel = (status: string) =>
  status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getPaymentStatusClasses = (status: Order['paymentStatus']) => {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'refunded':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-stone-100 text-stone-700';
  }
};

const getShippingStatusClasses = (status: Order['shippingStatus']) => {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-100 text-emerald-800';
    case 'created':
    case 'in_transit':
      return 'bg-blue-100 text-blue-800';
    case 'failed':
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-stone-100 text-stone-700';
  }
};

const getInventoryStatus = (product: { isActive?: boolean; stockQuantity?: number; lowStockThreshold?: number }) => {
  const stockQuantity = product.stockQuantity ?? 0;
  const lowStockThreshold = product.lowStockThreshold ?? 3;

  if (!product.isActive) {
    return { label: 'Hidden', className: 'bg-stone-100 text-stone-600' };
  }

  if (stockQuantity <= 0) {
    return { label: 'Out of Stock', className: 'bg-red-50 text-red-700' };
  }

  if (stockQuantity <= lowStockThreshold) {
    return { label: 'Low Stock', className: 'bg-amber-50 text-amber-700' };
  }

  return { label: 'Active', className: 'bg-emerald-50 text-emerald-700' };
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

  return (
    <div className="flex flex-col gap-3 border-t border-stone-100 bg-white/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">
        Showing {startItem}-{endItem} of {totalCount} {label}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-stone-200 bg-[#fcfbf9] px-3 text-[9px] font-bold uppercase tracking-widest text-stone-600 transition-colors hover:border-stone-900 hover:text-stone-900 disabled:cursor-not-allowed disabled:border-stone-100 disabled:text-stone-300"
        >
          <ChevronLeft size={12} />
          Prev
        </button>

        <span className="rounded-full border border-stone-200 bg-white px-3 py-2 font-mono text-[10px] font-bold text-stone-500">
          {page} / {safePageCount}
        </span>

        <button
          type="button"
          disabled={page >= safePageCount}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-stone-200 bg-[#fcfbf9] px-3 text-[9px] font-bold uppercase tracking-widest text-stone-600 transition-colors hover:border-stone-900 hover:text-stone-900 disabled:cursor-not-allowed disabled:border-stone-100 disabled:text-stone-300"
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1a1a1a]/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border border-stone-200 bg-[#fcfbf9] shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 p-6 md:p-8">
          <div>
            <span className="text-[9px] text-stone-400 font-mono tracking-widest uppercase block mb-1">PRODUCT PORTAL</span>
            <h3 className="font-serif text-2xl font-medium">{mode === 'add' ? 'Add New Product' : 'Edit Product'}</h3>
          </div>
          <button onClick={onClose} className="cursor-pointer border border-stone-200 bg-white p-2 transition-colors hover:bg-stone-100">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="admin-scrollbar p-6 md:p-8 space-y-6 overflow-y-auto flex-1 font-sans text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-semibold">Product Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(event) => onChange('name', event.target.value)}
                placeholder="e.g., Brutalist Suede Pouch"
                className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-light"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-semibold">Retail Price (INR)</label>
              <input
                type="number"
                required
                min="0"
                value={form.price}
                onChange={(event) => onChange('price', Number(event.target.value))}
                placeholder="Rs. value"
                className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-semibold">Collection Category</label>
              <select
                value={form.category}
                onChange={(event) => onChange('category', event.target.value)}
                className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-medium text-stone-600 cursor-pointer"
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-semibold">Material Grade</label>
              <select
                value={form.material}
                onChange={(event) => onChange('material', event.target.value)}
                className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-medium text-stone-600 cursor-pointer"
              >
                {materialOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-semibold">Surface Color</label>
              <select
                value={form.color}
                onChange={(event) => onChange('color', event.target.value)}
                className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-medium text-stone-600 cursor-pointer"
              >
                {colorOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-semibold">Stock Quantity</label>
              <input
                type="number"
                required
                min="0"
                value={form.stockQuantity}
                onChange={(event) => onChange('stockQuantity', Number(event.target.value))}
                placeholder="Available units"
                className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-semibold">Low Stock Alert</label>
              <input
                type="number"
                required
                min="0"
                value={form.lowStockThreshold}
                onChange={(event) => onChange('lowStockThreshold', Number(event.target.value))}
                placeholder="Alert threshold"
                className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-semibold">Product Visibility</label>
              <select
                value={form.isActive ? 'active' : 'hidden'}
                onChange={(event) => onChange('isActive', event.target.value === 'active')}
                className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-medium text-stone-600 cursor-pointer"
              >
                <option value="active">Active in storefront</option>
                <option value="hidden">Hidden from storefront</option>
              </select>
            </div>

            <div className="space-y-3 md:col-span-2 rounded-[1.1rem] border border-stone-200 bg-white/70 p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-stone-500">Shiprocket Package Details</p>
                <p className="mt-1 text-[10px] font-light text-stone-400">Required for shipment pricing, AWB creation, and courier allocation.</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] tracking-widest uppercase text-stone-500 font-semibold">Length (cm)</label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.1"
                    value={form.packageLengthCm}
                    onChange={(event) => onChange('packageLengthCm', Number(event.target.value))}
                    className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-mono font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] tracking-widest uppercase text-stone-500 font-semibold">Breadth (cm)</label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.1"
                    value={form.packageBreadthCm}
                    onChange={(event) => onChange('packageBreadthCm', Number(event.target.value))}
                    className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-mono font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] tracking-widest uppercase text-stone-500 font-semibold">Height (cm)</label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.1"
                    value={form.packageHeightCm}
                    onChange={(event) => onChange('packageHeightCm', Number(event.target.value))}
                    className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-mono font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] tracking-widest uppercase text-stone-500 font-semibold">Weight (kg)</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={form.packageWeightKg}
                    onChange={(event) => onChange('packageWeightKg', Number(event.target.value))}
                    className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3.5 md:col-span-2">
              <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-bold">Product Images (Multiple Direct Photo Uploads)</label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('add-product-photos-input')?.click()}
                className={`border-2 border-dashed rounded-[1.25rem] p-8 text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-3 group relative ${
                  isDragging
                    ? 'border-stone-800 bg-stone-100'
                    : 'border-stone-200 hover:border-stone-400 bg-stone-50/50 hover:bg-stone-50'
                }`}
              >
                <input
                  id="add-product-photos-input"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                <div className="p-4 bg-white rounded-full shadow-sm text-stone-500 group-hover:scale-105 transition-transform duration-300">
                  <UploadCloud size={20} className="text-stone-700" />
                </div>

                <div className="space-y-1">
                      <p className="font-medium text-xs text-stone-800">
                        {isUploading ? 'Uploading product photographs...' : 'Drag & drop product photographs here, or '}
                        {!isUploading && <span className="underline font-bold text-black">browse files</span>}
                      </p>
                  <p className="text-[10px] text-stone-400 font-light font-sans">
                    Supports JPEG, PNG, or WebP. Try uploading multiple angles of your design.
                  </p>
                </div>
              </div>

              {form.images.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] tracking-wider uppercase font-extrabold text-stone-400">Uploaded Gallery ({form.images.length})</span>
                    <span className="text-[9px] text-stone-400 font-light font-sans italic">First photo is set as the hero cover view</span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3.5 pt-1.5">
                    {form.images.map((imageUrl, index) => (
                      <div key={`${imageUrl}-${index}`} className="group/thumb relative aspect-[3/4] bg-stone-100 rounded-xl overflow-hidden border border-stone-200/60 shadow-sm animate-scale-up">
                        <img src={imageUrl} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />

                        {index === 0 && (
                          <span className="absolute top-1.5 left-1.5 bg-stone-900/90 backdrop-blur-xs text-white text-[8px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded font-extrabold">
                            Cover
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onImageRemove(index);
                          }}
                          className="absolute top-1.5 right-1.5 bg-red-600/90 hover:bg-red-700 text-white p-1 rounded-full shadow-md opacity-100 sm:opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-200 cursor-pointer"
                          title="Delete picture"
                        >
                          <X size={11} />
                        </button>

                        <span className="absolute bottom-1.5 right-1.5 bg-white/80 backdrop-blur-xs text-black font-semibold text-[8px] font-mono px-1 rounded">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-semibold">Product Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => onChange('description', event.target.value)}
                placeholder="e.g., Premium leather shoulder bag with spacious compartments."
                className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-light resize-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-semibold">Key Features</label>
              <textarea
                rows={3}
                value={form.keyFeaturesText}
                onChange={(event) => onChange('keyFeaturesText', event.target.value)}
                placeholder={'One feature per line, e.g.\nFits 15" Laptop\nZipper Closure'}
                className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-light resize-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-semibold">Why You'll Love It?</label>
              <textarea
                rows={3}
                value={form.whyLoveIt}
                onChange={(event) => onChange('whyLoveIt', event.target.value)}
                placeholder="Shown inside the Why You'll Love It accordion."
                className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-light resize-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-semibold">Dimensions</label>
              <input
                type="text"
                value={form.dimensions}
                onChange={(event) => onChange('dimensions', event.target.value)}
                placeholder="e.g., 38 x 29 x 14 cm"
                className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-light"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-semibold">Shipping & Returns</label>
              <textarea
                rows={2}
                value={form.shippingReturns}
                onChange={(event) => onChange('shippingReturns', event.target.value)}
                className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-light resize-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[10px] tracking-widest uppercase text-stone-500 font-semibold">More Information</label>
              <textarea
                rows={2}
                value={form.moreInformation}
                onChange={(event) => onChange('moreInformation', event.target.value)}
                className="w-full bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none p-3 rounded-lg font-light resize-none"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-stone-100 flex justify-end gap-3.5">
            <button
              type="button"
              onClick={onClose}
              className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-6 py-3 rounded-xl uppercase tracking-widest font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#1a1a1a] hover:bg-black text-[#fcfbf9] px-8 py-3 rounded-xl uppercase tracking-widest font-bold cursor-pointer"
            >
              {mode === 'add' ? 'Publish Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
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
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-widest text-stone-500 transition-colors hover:border-stone-900 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {copied ? <CheckCircle size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : label}
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
      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-stone-600 transition-colors hover:border-stone-900 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
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
        <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-stone-400">{label}</p>
        <p className="mt-1 break-words font-mono text-[10px] font-semibold text-[#111]">{displayValue}</p>
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
  const canMarkPacked = order.paymentStatus === 'paid' && order.status === 'Confirmed';
  const canCreateShipment = order.paymentStatus === 'paid' && order.status === 'Packed' && ['not_created', 'failed'].includes(order.shippingStatus);
  const hasShipment = Boolean(order.awbCode || order.shiprocketOrderId || order.shipmentId);
  const canCancelOrder = !hasShipment && !['Shipped', 'Delivered', 'Cancelled'].includes(order.status);
  const hasShipmentCancellationRequested = order.shippingStatus === 'cancelled' || order.currentShippingStatus.toLowerCase().includes('cancel');
  const canCancelShipment = Boolean(
    (order.awbCode || order.shiprocketOrderId) &&
      !hasShipmentCancellationRequested &&
      !['in_transit', 'delivered'].includes(order.shippingStatus),
  );

  const content = (
    <>
      {variant === 'drawer' && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      )}

      {variant === 'page' && (
        <div className="mb-6 flex flex-col gap-4 border-b border-stone-200 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              type="button"
              onClick={onClose}
              className="mb-3 flex cursor-pointer items-center gap-2 text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400 transition-colors hover:text-[#111]"
            >
              <ArrowLeft size={12} />
              Back to Orders
            </button>
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-stone-400">Order Detail</p>
            <h2 className="mt-1 font-serif text-[2.4rem] leading-none tracking-tight text-[#111]">{order.id}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-wider ${getPaymentStatusClasses(order.paymentStatus)}`}>
              {formatStatusLabel(order.paymentStatus)}
            </span>
            <span className={`rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-wider ${getShippingStatusClasses(order.shippingStatus)}`}>
              {formatStatusLabel(order.shippingStatus)}
            </span>
            <span className={`rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-wider ${getStatusClasses(order.status)}`}>
              {order.status}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-8 font-sans text-xs">
        <div className="border-b border-[#1a1a1a]/15 pb-6">
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-[10px] font-bold tracking-widest uppercase text-stone-400">Order Receipt Invoice</span>
          </div>
          <h3 className="font-serif text-3xl font-medium tracking-tight mb-2">Simvorae</h3>
          <div className="flex justify-between items-center text-stone-500 font-mono text-[10px]">
            <span>Order: <strong className="text-black font-semibold">{order.id}</strong></span>
            <span>Date: {new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="bg-stone-50 border border-[#1a1a1a]/5 p-5 rounded-[1rem] flex justify-between items-center">
          <div>
            <span className="text-[8px] tracking-widest uppercase font-bold text-stone-400 block mb-1">Fulfillment Status</span>
            <p className="font-sans font-medium text-black">
              {isShiprocketControlledStatus ? 'Managed by Shiprocket' : 'Update internal order stage'}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <span className={`rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-wider ${getStatusClasses(order.status)}`}>
              {order.status}
            </span>
            {canMarkPacked && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={onMarkPacked}
                className="cursor-pointer rounded-xl bg-[#1a1a1a] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#fcfbf9] hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {isUpdating ? 'Updating' : 'Mark Packed'}
              </button>
            )}
            {canCreateShipment && (
              <button
                type="button"
                disabled={isCreatingShipment}
                onClick={onCreateShipment}
                className="cursor-pointer rounded-xl bg-[#1a1a1a] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#fcfbf9] hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {isCreatingShipment ? 'Creating' : 'Create Shipment'}
              </button>
            )}
            {canCancelOrder && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={onCancelOrder}
                className="cursor-pointer rounded-xl border border-stone-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:border-stone-900 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className={variant === 'page' ? 'grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]' : 'space-y-8'}>
          <div className="space-y-8">
            <div className="space-y-4">
              <h4 className="font-bold uppercase tracking-widest text-stone-400 text-[9px]">Ordered Products</h4>
              <div className="space-y-3.5">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="w-12 aspect-[4/5] bg-stone-100 rounded-lg overflow-hidden border border-[#1a1a1a]/5 flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover mix-blend-multiply" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-[13px] truncate">{item.name}</h4>
                      <p className="text-[10px] text-stone-400 tracking-wide font-mono mt-0.5">
                        {formatCurrency(item.price)} x {item.quantity}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-[13px]">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#1a1a1a]/10 pt-4 space-y-2.5 font-light text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-black font-mono">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping & Handling</span>
                <span className="font-medium text-emerald-700 uppercase font-mono">Free via Shiprocket</span>
              </div>
              <div className="flex justify-between border-t border-[#1a1a1a]/15 pt-4 text-base font-medium text-black">
                <span className="font-serif text-lg tracking-tight">Invoice Total</span>
                <span className="font-mono text-lg font-bold">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {order.shipmentAttempts.length > 0 && (
            <div className="space-y-3 border-t border-[#1a1a1a]/10 pt-6">
              <h4 className="font-bold uppercase tracking-widest text-stone-400 text-[9px]">Previous Shipment Attempts</h4>

              <div className="space-y-2">
                {order.shipmentAttempts.map((attempt, index) => (
                  <div key={`${attempt.shipmentId || attempt.shiprocketOrderId || index}-${index}`} className="rounded-xl border border-stone-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">Attempt {index + 1}</span>
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest text-red-700">
                        {formatStatusLabel(attempt.status)}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-[10px] sm:grid-cols-2">
                      <DetailRow label="Shiprocket Order" value={attempt.shiprocketOrderId} />
                      <DetailRow label="Shipment ID" value={attempt.shipmentId} />
                      <DetailRow label="AWB" value={attempt.awbCode} />
                      <DetailRow label="Courier" value={attempt.courierName} copyable={false} />
                    </div>
                    {attempt.cancelledAt && (
                      <p className="mt-2 font-mono text-[9px] text-stone-400">
                        Cancelled: {formatDate(attempt.cancelledAt)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-8">
            <div className="space-y-3 border-t border-[#1a1a1a]/10 pt-6 xl:border-t-0 xl:pt-0">
              <h4 className="font-bold uppercase tracking-widest text-stone-400 text-[9px]">Payment & Shipment</h4>

              <div className="overflow-hidden rounded-[1rem] border border-stone-200 bg-white px-4">
                <DetailRow label="Payment Status" value={formatStatusLabel(order.paymentStatus)} copyable={false} />
                <DetailRow label="Razorpay Order ID" value={order.razorpayOrderId} />
                <DetailRow label="Razorpay Payment ID" value={order.razorpayPaymentId} />
                <DetailRow label="Shipping Status" value={formatStatusLabel(order.shippingStatus)} copyable={false} />
                <DetailRow label="Current Courier Status" value={order.currentShippingStatus} copyable={false} />
                <DetailRow label="Courier" value={order.courierName} copyable={false} />
                <DetailRow label="Shiprocket Order ID" value={order.shiprocketOrderId} />
                <DetailRow label="Shipment ID" value={order.shipmentId} />
                <DetailRow label="AWB Code" value={order.awbCode} />
                <DetailRow label="Pickup Status" value={order.pickupStatus} copyable={false} />
                <DetailRow label="Tracking URL" value={order.trackingUrl} />
              </div>
            </div>

            <div className="space-y-3 border-t border-[#1a1a1a]/10 pt-6">
              <h4 className="font-bold uppercase tracking-widest text-stone-400 text-[9px]">Operational Actions</h4>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => printPackingSlip(order)}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-stone-600 transition-colors hover:border-stone-900 hover:text-stone-900"
                >
                  <FileText size={12} />
                  Print Packing Slip
                </button>
                <DrawerCopyAction value={order.customer.address} label="Copy Address" />
                <button
                  type="button"
                  disabled={(!order.shipmentId && !order.awbCode) || isSyncingShipment}
                  onClick={onSyncShipment}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-600 transition-colors hover:border-stone-900 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCcw size={13} />
                  {isSyncingShipment ? 'Syncing' : 'Sync Shipment'}
                </button>
                {canCancelShipment && (
                  <button
                    type="button"
                    disabled={isCancellingShipment}
                    onClick={onCancelShipment}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-red-700 transition-colors hover:border-red-300 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X size={13} />
                    {isCancellingShipment ? 'Cancelling' : 'Cancel Shipment'}
                  </button>
                )}
                <button
                  type="button"
                  disabled={!order.trackingUrl}
                  onClick={() => window.open(order.trackingUrl, '_blank', 'noopener,noreferrer')}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-stone-600 transition-colors hover:border-stone-900 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ExternalLink size={12} />
                  Open Tracking
                </button>
                <DrawerCopyAction value={order.awbCode} label="Copy AWB" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-[#1a1a1a]/10 pt-6">
          <h4 className="font-bold uppercase tracking-widest text-stone-400 text-[9px]">Shipping & Customer Details</h4>

          <div className="space-y-3 font-light text-stone-600">
            <p className="flex items-start gap-2">
              <User size={13} className="mt-0.5 text-stone-400" />
              <span className="text-black font-medium">{order.customer.name}</span>
            </p>
            <p className="flex items-start gap-2">
              <Mail size={13} className="mt-0.5 text-stone-400" />
              <span>{order.customer.email}</span>
            </p>
            <p className="flex items-start gap-2">
              <Phone size={13} className="mt-0.5 text-stone-400" />
              <span>{order.customer.phone}</span>
            </p>
            <p className="flex items-start gap-2">
              <MapPin size={13} className="mt-0.5 text-stone-400" />
              <span>{order.customer.address}</span>
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-[#1a1a1a]/10">
          <button
            onClick={() => printInvoice(order)}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] py-3.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#fcfbf9] transition-all duration-300 hover:bg-black"
          >
            <span>Print Invoice</span>
          </button>
        </div>
      </div>
    </>
  );

  if (variant === 'page') {
    return (
      <div className="rounded-[1.5rem] border border-stone-200 bg-white/90 p-5 shadow-sm md:p-7">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0c0c0c]/85 backdrop-blur-sm z-[200] flex items-center justify-end">
      <div className="admin-scrollbar bg-[#fcfbf9] w-full max-w-3xl h-full p-8 shadow-2xl flex flex-col justify-between overflow-y-auto relative border-l border-stone-200">
        {content}
      </div>
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const setActiveTab = (tab: AdminTab) => navigate(adminTabRoutes[tab]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [productForm, setProductForm] = useState<ProductFormState>(createEmptyForm());
  const [editingProduct, setEditingProduct] = useState<ProductStoreItem | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [cancelCandidate, setCancelCandidate] = useState<Order | null>(null);
  const [cancelShipmentCandidate, setCancelShipmentCandidate] = useState<Order | null>(null);
  const [deleteProductCandidate, setDeleteProductCandidate] = useState<ProductStoreItem | null>(null);
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
  const [creatingShipmentFor, setCreatingShipmentFor] = useState('');
  const [syncingShipmentFor, setSyncingShipmentFor] = useState('');
  const [cancellingShipmentFor, setCancellingShipmentFor] = useState('');
  const [updatingOrderFor, setUpdatingOrderFor] = useState('');
  const [deletingProductFor, setDeletingProductFor] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
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
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    const hasOpenOverlay = Boolean(isModalOpen || viewingOrder || cancelCandidate || cancelShipmentCandidate || deleteProductCandidate);
    const previousOverflow = document.body.style.overflow;

    if (hasOpenOverlay) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [cancelCandidate, cancelShipmentCandidate, deleteProductCandidate, isModalOpen, viewingOrder]);

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
        setToast({ type: 'success', message: `${productForm.name} updated.` });
      } else {
        await addProduct(payload);
        setToast({ type: 'success', message: `${productForm.name} created.` });
      }

      closeModal();
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save product.' });
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
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to upload product image.' });
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
      setToast({ type: 'success', message: `${deleteProductCandidate.name} deleted.` });
      setDeleteProductCandidate(null);
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to delete product.' });
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
      setToast({ type: 'success', message: `${order.id} marked packed.` });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to mark order packed.' });
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
      setToast({ type: 'success', message: `${order.id} cancelled.` });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to cancel order.' });
    } finally {
      setUpdatingOrderFor('');
    }
  };

  const handleCreateShipment = async (order: Order) => {
    setCreatingShipmentFor(order.id);

    try {
      const updatedOrder = await createShipment(order.id);
      setViewingOrder((current) => (current?.id === order.id ? updatedOrder : current));
      setToast({ type: 'success', message: `Shipment created for ${order.id}.` });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to create shipment.' });
    } finally {
      setCreatingShipmentFor('');
    }
  };

  const handleSyncShipment = async (order: Order) => {
    try {
      setSyncingShipmentFor(order.id);
      const updatedOrder = await syncShipment(order.id);
      setViewingOrder(updatedOrder);
      setToast({ type: 'success', message: `Shipment synced for ${order.id}.` });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to sync shipment.' });
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
      setToast({ type: 'success', message: `Shiprocket cancellation requested for ${cancelShipmentCandidate.id}.` });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to cancel shipment.' });
    } finally {
      setCancellingShipmentFor('');
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] font-sans text-[#1a1a1a]">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }} />

      {toast && (
        <div className="fixed right-5 top-5 z-[260] w-[min(360px,calc(100vw-2.5rem))]">
          <div className={`flex items-start gap-3 rounded-[1rem] border bg-[#fcfbf9] p-4 shadow-2xl ${
            toast.type === 'success' ? 'border-emerald-200' : 'border-red-200'
          }`}>
            <div className={`mt-0.5 rounded-full p-1.5 ${
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>
              {toast.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-stone-400">
                {toast.type === 'success' ? 'Action Complete' : 'Action Failed'}
              </p>
              <p className="mt-1 text-xs font-medium leading-5 text-[#111]">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-auto cursor-pointer rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

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
            <span className="mt-2 block font-sans text-[8px] font-bold tracking-[0.3em] text-stone-400">ADMIN PORTAL</span>
          </Link>
        </div>

        <nav className="flex flex-grow flex-col gap-6">
          {[
            { id: 'OVERVIEW' as const, label: 'Dashboard', icon: LayoutDashboard },
            { id: 'ORDERS' as const, label: `Orders (${orders.length})`, icon: FileText },
            { id: 'CATALOG' as const, label: `Products (${products.length})`, icon: ShoppingBag },
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
            className="mb-6 flex w-full cursor-pointer items-center justify-center gap-2 border border-stone-200 py-3 text-[10px] font-semibold uppercase tracking-widest text-stone-500 transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
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
              onClick={() => {
                window.localStorage.removeItem('simvorae_admin_token');
                navigate('/admin/login', { replace: true });
              }}
              className="cursor-pointer p-2 text-stone-400 transition-colors hover:text-[#1a1a1a]"
              title="Logout"
            >
              <LockKeyhole size={14} />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-[100dvh] overflow-x-hidden pt-24 lg:ml-64 lg:pt-0">
        <main className="mx-auto w-full max-w-7xl p-4 md:p-8 lg:p-12">
          {(error || productError) && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-xs font-medium text-red-700">
              {error || productError}
            </div>
          )}

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
                              <span className={`inline-block rounded-full px-3 py-1 ${
                                order.status === 'Delivered' ? 'bg-stone-50 text-stone-500' : 'bg-stone-100 text-[#1a1a1a]'
                              }`}>
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
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-stone-200">
                <div className="relative w-full md:w-80">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    placeholder="Search catalog, materials, SKUs..."
                    className="w-full bg-stone-50/50 hover:bg-stone-50 border border-stone-200 focus:border-stone-400 focus:outline-none pl-10 pr-4 py-2.5 rounded-xl text-xs font-light tracking-wide transition-all"
                  />
                </div>

                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                  <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mr-2">Category:</span>
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="cursor-pointer rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-600 transition-colors hover:border-stone-400 focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>

                  <button
                    onClick={openAddModal}
                    className="bg-[#1a1a1a] hover:bg-black text-[#fcfbf9] px-6 py-2 rounded-xl text-[10px] tracking-widest uppercase font-bold flex items-center gap-2 transition-all duration-300 ml-auto cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Add Product</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[
                  { label: 'Active SKUs', value: catalogInventorySummary.active, tone: 'text-emerald-700', note: 'Visible storefront' },
                  { label: 'Low Stock', value: catalogInventorySummary.lowStock, tone: 'text-amber-700', note: 'At or below alert' },
                  { label: 'Out of Stock', value: catalogInventorySummary.outOfStock, tone: 'text-red-700', note: 'Cannot fulfill' },
                  { label: 'Hidden', value: catalogInventorySummary.hidden, tone: 'text-stone-600', note: 'Not visible' },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-stone-400">{item.label}</p>
                    <p className={`mt-2 font-serif text-2xl leading-none ${item.tone}`}>{item.value}</p>
                    <p className="mt-1 text-[9px] font-medium text-stone-400">{item.note}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-stone-200 rounded-[1.5rem] shadow-sm overflow-hidden">
                <div className="admin-scrollbar max-h-[620px] overflow-auto">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="border-b border-stone-100 text-stone-400 uppercase tracking-widest text-[9px] font-bold bg-stone-50/50">
                        <th className="py-4 px-6 font-semibold">ID</th>
                        <th className="py-4 px-6 font-semibold">Preview</th>
                        <th className="py-4 px-2 font-semibold">Product Name</th>
                        <th className="py-4 px-6 font-semibold">Category</th>
                        <th className="py-4 px-6 font-semibold">Material & Color</th>
                        <th className="py-4 px-6 font-semibold">Inventory</th>
                        <th className="py-4 px-6 font-semibold">Status</th>
                        <th className="py-4 px-6 font-semibold">Price</th>
                        <th className="py-4 px-6 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {paginatedCatalog.map((product) => {
                        const inventoryStatus = getInventoryStatus(product);

                        return (
                          <tr key={product.id} className="group hover:bg-stone-50/40 transition-colors">
                            <td className="py-4 px-6 font-mono text-stone-500">{product.id.slice(-6).toUpperCase()}</td>
                            <td className="py-4 px-6">
                              <div className="w-12 aspect-[3/4] bg-stone-100 rounded-lg overflow-hidden border border-[#1a1a1a]/5">
                                <img src={product.image} className="w-full h-full object-cover mix-blend-multiply" alt={product.name} />
                              </div>
                            </td>
                            <td className="py-4 px-2">
                              <h4 className="font-serif text-[15px] font-medium text-[#111] mb-0.5">{product.name}</h4>
                              <p className="text-[10px] text-stone-400 tracking-wide font-sans max-w-[200px] truncate" title={product.description}>
                                {product.description || 'No description.'}
                              </p>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-stone-400 text-[10px] uppercase tracking-widest">{product.category}</span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <span className="bg-stone-100 font-medium text-stone-700 text-[10px] uppercase px-2.5 py-1 rounded-md">{product.material}</span>
                                <span className="bg-stone-100 font-medium text-stone-700 text-[10px] uppercase px-2.5 py-1 rounded-md">{product.color}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <p className="font-mono text-xs font-bold text-[#111]">{product.stockQuantity}</p>
                              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-stone-400">Low at {product.lowStockThreshold}</p>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-block rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${inventoryStatus.className}`}>
                                {inventoryStatus.label}
                              </span>
                            </td>
                            <td className="py-4 px-6 font-mono font-bold text-[#111]">{formatCurrency(product.price)}</td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => openEditModal(product)}
                                  className="p-2 bg-stone-50 hover:bg-[#1a1a1a] hover:text-[#fcfbf9] text-stone-500 rounded-xl transition-all duration-300 border border-stone-200 cursor-pointer"
                                  title="Edit product info"
                                >
                                  <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product)}
                                className="p-2 bg-stone-50 hover:bg-red-600 hover:text-white text-stone-500 rounded-xl transition-all duration-300 border border-stone-200 cursor-pointer"
                                title="Remove product"
                              >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {isProductsLoading && (
                  <div className="p-16 text-center text-xs font-bold uppercase tracking-[0.25em] text-stone-400">
                    Loading catalog
                  </div>
                )}

                {!isProductsLoading && filteredCatalog.length === 0 && (
                  <div className="p-16 text-center text-stone-400 flex flex-col items-center justify-center">
                    <p className="text-[10px] tracking-[0.25em] uppercase font-bold mb-3">Void product list</p>
                    <p className="text-xs font-light text-stone-500 mb-6">No matching items were found matching your filters.</p>
                    <button
                      onClick={() => {
                        setProductSearch('');
                        setSelectedCategory('All');
                      }}
                      className="cursor-pointer border-b border-[#1a1a1a] pb-0.5 text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]"
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
                            className={`cursor-pointer rounded-full border px-4 py-2 text-[9px] uppercase tracking-widest transition-colors ${
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
                                  <span className={`rounded-sm border px-3 py-1 text-[9px] uppercase tracking-widest ${getPaymentStatusClasses(order.paymentStatus)}`}>
                                    {formatStatusLabel(order.paymentStatus)}
                                  </span>
                                </div>
                                <div className="col-span-2 flex items-center justify-center text-center">
                                  <span className={`rounded-sm border px-3 py-1 text-[9px] uppercase tracking-widest ${getStatusClasses(order.status)}`}>
                                    {order.status}
                                  </span>
                                </div>
                                <div className="col-span-2 flex flex-col items-center justify-center text-center">
                                  <span className={`rounded-sm border px-3 py-1 text-[9px] uppercase tracking-widest ${getShippingStatusClasses(order.shippingStatus)}`}>
                                    {formatStatusLabel(order.shippingStatus)}
                                  </span>
                                  {needsAction && <span className="mt-1 text-[8px] uppercase tracking-widest text-amber-700">Action needed</span>}
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
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em]">
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
                          className="cursor-pointer border-b border-[#1a1a1a] pb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#1a1a1a]"
                        >
                          {orders.length === 0 ? 'Refresh Orders' : 'Clear Filters'}
                        </button>
                      </div>
                    )}

                    {isLoading && (
                      <div className="px-8 py-20 text-center text-xs font-bold uppercase tracking-[0.3em] text-stone-400">
                        Loading orders
                      </div>
                    )}

                    {!isLoading && filteredOrders.length > 0 && (
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

      {cancelCandidate && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[#1a1a1a]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden border border-stone-200 bg-[#fcfbf9] text-center shadow-2xl">
            <div className="border-b border-stone-200 px-8 py-7">
              <div>
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-stone-400">Order Action</p>
                <h3 className="font-serif text-[2rem] font-medium leading-none tracking-tight text-[#111]">Cancel order</h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelCandidate(null)}
                className="sr-only"
              >
                Close
              </button>
            </div>

            <div className="px-8 py-6">
              <p className="mb-5 text-xs font-light leading-6 text-stone-500">
                This will cancel <span className="font-mono font-bold text-[#111]">{cancelCandidate.id}</span>. Use this only for stock issues, customer requests, fraud checks, or invalid order details.
              </p>

              <div className="grid grid-cols-1 overflow-hidden border border-stone-200 bg-white text-left sm:grid-cols-2">
                <div className="border-b border-stone-200 p-4 sm:border-b-0 sm:border-r">
                  <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-stone-400">Customer</p>
                  <p className="mt-2 text-sm font-semibold text-[#111]">{cancelCandidate.customer.name}</p>
                  <p className="mt-1 text-xs text-stone-400">{cancelCandidate.customer.phone}</p>
                </div>
                <div className="p-4 text-left sm:text-right">
                  <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-stone-400">Order Total</p>
                  <p className="mt-2 font-mono text-sm font-bold text-[#111]">{formatCurrency(cancelCandidate.total)}</p>
                  <p className="mt-1 text-xs text-stone-400">{cancelCandidate.status}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-stone-200 px-8 py-6">
              <button
                type="button"
                onClick={() => setCancelCandidate(null)}
                className="w-full cursor-pointer border border-stone-200 bg-transparent px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a] transition-colors hover:bg-stone-50"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={updatingOrderFor === cancelCandidate.id}
                onClick={() => void confirmCancelOrder()}
                className="w-full cursor-pointer border border-[#1a1a1a] bg-[#1a1a1a] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#fcfbf9] transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:border-stone-400 disabled:bg-stone-400"
              >
                {updatingOrderFor === cancelCandidate.id ? 'Cancelling' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelShipmentCandidate && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[#1a1a1a]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden border border-stone-200 bg-[#fcfbf9] text-center shadow-2xl">
            <div className="border-b border-stone-200 px-8 py-7">
              <div>
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-stone-400">Shiprocket Action</p>
                <h3 className="font-serif text-[2rem] font-medium leading-none tracking-tight text-[#111]">Cancel shipment</h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelShipmentCandidate(null)}
                className="sr-only"
              >
                Close
              </button>
            </div>

            <div className="px-8 py-6">
              <p className="mb-5 text-xs font-light leading-6 text-stone-500">
                This will request cancellation in Shiprocket for <span className="font-mono font-bold text-[#111]">{cancelShipmentCandidate.id}</span>. Shipment cancellation works only before pickup or in-transit movement begins.
              </p>

              <div className="grid grid-cols-1 overflow-hidden border border-stone-200 bg-white text-left sm:grid-cols-2">
                <div className="border-b border-stone-200 p-4 sm:border-b-0 sm:border-r">
                  <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-stone-400">AWB</p>
                  <p className="mt-2 font-mono text-sm font-bold text-[#111]">{cancelShipmentCandidate.awbCode || 'Not assigned'}</p>
                  <p className="mt-1 text-xs text-stone-400">{cancelShipmentCandidate.courierName || 'Courier not assigned'}</p>
                </div>
                <div className="p-4 text-left sm:text-right">
                  <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-stone-400">Shiprocket Order</p>
                  <p className="mt-2 font-mono text-sm font-bold text-[#111]">{cancelShipmentCandidate.shiprocketOrderId || 'Not available'}</p>
                  <p className="mt-1 text-xs text-stone-400">{formatStatusLabel(cancelShipmentCandidate.shippingStatus)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-stone-200 px-8 py-6">
              <button
                type="button"
                onClick={() => setCancelShipmentCandidate(null)}
                className="w-full cursor-pointer border border-stone-200 bg-transparent px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a] transition-colors hover:bg-stone-50"
              >
                Keep Shipment
              </button>
              <button
                type="button"
                disabled={cancellingShipmentFor === cancelShipmentCandidate.id}
                onClick={() => void confirmCancelShipment()}
                className="w-full cursor-pointer border border-[#1a1a1a] bg-[#1a1a1a] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#fcfbf9] transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:border-stone-300 disabled:bg-stone-300 disabled:text-stone-500"
              >
                {cancellingShipmentFor === cancelShipmentCandidate.id ? 'Cancelling' : 'Cancel Shipment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteProductCandidate && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[#1a1a1a]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden border border-stone-200 bg-[#fcfbf9] text-center shadow-2xl">
            <div className="border-b border-stone-200 px-8 py-7">
              <div>
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-stone-400">Catalog Action</p>
                <h3 className="font-serif text-[2rem] font-medium leading-none tracking-tight text-[#111]">Delete product</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteProductCandidate(null)}
                className="sr-only"
              >
                Close
              </button>
            </div>

            <div className="px-8 py-6">
              <p className="mb-5 text-xs font-light leading-6 text-stone-500">
                This will remove <span className="font-semibold text-[#111]">{deleteProductCandidate.name}</span> from the catalog and delete its uploaded product images from storage.
              </p>

              <div className="overflow-hidden border border-stone-200 bg-white text-left">
                <div className="flex gap-4 p-4">
                  <div className="h-24 w-18 shrink-0 overflow-hidden border border-stone-200 bg-stone-100">
                    <img
                      src={deleteProductCandidate.image}
                      alt={deleteProductCandidate.name}
                      className="h-full w-full object-cover mix-blend-multiply"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-stone-400">Product</p>
                    <h4 className="mt-2 truncate font-serif text-xl font-medium text-[#111]">{deleteProductCandidate.name}</h4>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                      {deleteProductCandidate.id.slice(-6).toUpperCase()} · {deleteProductCandidate.category}
                    </p>
                    <p className="mt-3 font-mono text-xs font-bold text-[#111]">{formatCurrency(deleteProductCandidate.price)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-stone-200 px-8 py-6">
              <button
                type="button"
                onClick={() => setDeleteProductCandidate(null)}
                className="w-full cursor-pointer border border-stone-200 bg-transparent px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a] transition-colors hover:bg-stone-50"
              >
                Keep Product
              </button>
              <button
                type="button"
                disabled={deletingProductFor === deleteProductCandidate.id}
                onClick={() => void confirmDeleteProduct()}
                className="w-full cursor-pointer border border-[#1a1a1a] bg-[#1a1a1a] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#fcfbf9] transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:border-stone-300 disabled:bg-stone-300 disabled:text-stone-500"
              >
                {deletingProductFor === deleteProductCandidate.id ? 'Deleting' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingOrder && activeTab !== 'ORDERS' && (
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
        />
      )}
    </div>
  );
}
