import { type ChangeEvent, type DragEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
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
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
};

const categoryOptions = ['Classic Tote', 'Hobo Shoulder Bag', 'Top Handle Bag', 'Crossbody Bag', 'Chain Clutch'];
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
          table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
          th { text-align: left; border-bottom: 1px solid #d6d3d1; padding: 10px 8px; font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #78716c; }
          td { border-bottom: 1px solid #f5f5f4; padding: 12px 8px; vertical-align: top; }
          .checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-family: Arial, sans-serif; font-size: 12px; }
          .check { display: flex; align-items: center; gap: 8px; border: 1px solid #e7e5e4; padding: 10px; }
          .check-box { width: 12px; height: 12px; flex: 0 0 12px; border: 1px solid #111; }
          .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #d6d3d1; font-family: Arial, sans-serif; font-size: 10px; color: #78716c; }
          @media print { body { padding: 0; } .page { border: 0; max-width: none; } }
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
          table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
          th { text-align: left; border-bottom: 1px solid #d6d3d1; padding: 10px 8px; font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #78716c; }
          td { border-bottom: 1px solid #f5f5f4; padding: 12px 8px; vertical-align: top; }
          th:nth-child(3), td:nth-child(3) { text-align: center; }
          th:nth-child(4), td:nth-child(4), th:nth-child(5), td:nth-child(5) { text-align: right; }
          .totals { margin-left: auto; width: 320px; font-family: Arial, sans-serif; font-size: 12px; }
          .total-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f5f5f4; padding: 10px 0; }
          .grand-total { font-weight: 700; font-size: 15px; border-bottom: 1px solid #111; }
          .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #d6d3d1; font-family: Arial, sans-serif; font-size: 10px; line-height: 1.6; color: #78716c; }
          @media print { body { padding: 0; } .page { border: 0; max-width: none; } }
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
    <div className="fixed inset-0 bg-[#0c0c0c]/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-[#fcfbf9] border border-stone-200/90 w-full max-w-2xl rounded-[1.75rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 md:p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
          <div>
            <span className="text-[9px] text-stone-400 font-mono tracking-widest uppercase block mb-1">PRODUCT PORTAL</span>
            <h3 className="font-serif text-2xl font-medium">{mode === 'add' ? 'Add New Product' : 'Edit Product'}</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 font-sans text-xs">
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
  onCancelOrder,
  isUpdating,
  isCreatingShipment,
}: {
  order: Order;
  onClose: () => void;
  onMarkPacked: () => void;
  onCreateShipment: () => void;
  onCancelOrder: () => void;
  isUpdating: boolean;
  isCreatingShipment: boolean;
}) {
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const isShiprocketControlledStatus = order.status === 'Shipped' || order.status === 'Delivered';
  const canMarkPacked = order.paymentStatus === 'paid' && order.status === 'Confirmed';
  const canCreateShipment = order.paymentStatus === 'paid' && order.status === 'Packed' && ['not_created', 'failed'].includes(order.shippingStatus);
  const canCancelOrder = !['Shipped', 'Delivered', 'Cancelled'].includes(order.status);

  return (
    <div className="fixed inset-0 bg-[#0c0c0c]/85 backdrop-blur-sm z-[200] flex items-center justify-end">
      <div className="bg-[#fcfbf9] w-full max-w-lg h-full p-8 shadow-2xl flex flex-col justify-between overflow-y-auto relative border-l border-stone-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

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

          <div className="space-y-3 border-t border-[#1a1a1a]/10 pt-6">
            <h4 className="font-bold uppercase tracking-widest text-stone-400 text-[9px]">Payment & Shipment</h4>

            <div className="overflow-hidden rounded-[1rem] border border-stone-200 bg-white px-4">
              <DetailRow label="Payment Status" value={formatStatusLabel(order.paymentStatus)} copyable={false} />
              <DetailRow label="Razorpay Order ID" value={order.razorpayOrderId} />
              <DetailRow label="Razorpay Payment ID" value={order.razorpayPaymentId} />
              <DetailRow label="Shipping Status" value={formatStatusLabel(order.shippingStatus)} copyable={false} />
              <DetailRow label="Shiprocket Order ID" value={order.shiprocketOrderId} />
              <DetailRow label="Shipment ID" value={order.shipmentId} />
              <DetailRow label="AWB Code" value={order.awbCode} />
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

            <div className="overflow-hidden rounded-[1rem] border border-stone-200 bg-white px-4">
              <DetailRow label="Customer Email" value={order.customer.email} />
              <DetailRow label="Customer Phone" value={order.customer.phone} />
              <DetailRow label="Full Address" value={order.customer.address} />
            </div>
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
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const {
    products,
    isLoading: isProductsLoading,
    isUploading: isProductImageUploading,
    error: productError,
    fetchProducts,
    uploadProductImage,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useProductStore();
  const { orders, isLoading, error, fetchOrders, markPacked, cancelOrder, createShipment } = useOrderStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [productForm, setProductForm] = useState<ProductFormState>(createEmptyForm());
  const [editingProduct, setEditingProduct] = useState<ProductStoreItem | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [cancelCandidate, setCancelCandidate] = useState<Order | null>(null);
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
  const [creatingShipmentFor, setCreatingShipmentFor] = useState('');
  const [updatingOrderFor, setUpdatingOrderFor] = useState('');
  const [deletingProductFor, setDeletingProductFor] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    void fetchOrders();
    void fetchProducts();
  }, [fetchOrders, fetchProducts]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

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
  const canCancelOrder = (order: Order) => !['Shipped', 'Delivered', 'Cancelled'].includes(order.status);

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

      <div className="relative z-10 flex min-h-screen flex-col md:flex-row">
        <aside className="w-full border-b border-stone-800/10 bg-[#141414] p-6 text-[#fcfbf9] md:sticky md:top-0 md:h-screen md:w-72 md:border-b-0 md:border-r">
          <div className="flex h-full flex-col justify-between gap-10">
            <div>
              <div className="mb-12 flex items-center justify-between">
                <div>
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.3em] text-stone-500">Admin Portal</p>
                  <button onClick={() => navigate('/')} className="cursor-pointer font-serif text-3xl tracking-tight transition-all hover:italic">
                    SIMVORAE
                  </button>
                </div>
                <button onClick={() => navigate('/')} className="flex cursor-pointer items-center gap-2 rounded-full border border-stone-700 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-stone-400 hover:border-white hover:text-white">
                  <ArrowLeft size={12} />
                  Exit
                </button>
              </div>

              <nav className="space-y-2">
                {[
                  { id: 'OVERVIEW' as const, label: 'Overview', icon: LayoutDashboard },
                  { id: 'CATALOG' as const, label: `Catalog (${products.length})`, icon: ShoppingBag },
                  { id: 'ORDERS' as const, label: `Orders (${orders.length})`, icon: FileText },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex w-full cursor-pointer items-center gap-3.5 rounded-xl px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isActive ? 'bg-[#fcfbf9] text-[#111111] shadow-md' : 'text-stone-400 hover:bg-stone-900/40 hover:text-white'}`}
                    >
                      <Icon size={15} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-stone-800 pt-6">
              <button onClick={() => navigate('/shop')} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-800 py-3 text-[10px] font-semibold uppercase tracking-widest text-stone-400 hover:border-white hover:text-white">
                <span>Preview Shop</span>
                <ExternalLink size={11} />
              </button>
            </div>
          </div>
        </aside>

        <main className="w-full flex-1 p-6 md:p-8 lg:px-10 lg:py-8">
          <header className="mb-8 flex flex-col gap-5 border-b border-stone-200 pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-1.5 flex items-center gap-2.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-stone-400">Simvorae Dashboard</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
              <h1 className="font-serif text-[2.55rem] leading-none tracking-tight text-stone-900">
                {activeTab === 'OVERVIEW' && 'Overview'}
                {activeTab === 'CATALOG' && 'Product Catalog'}
                {activeTab === 'ORDERS' && 'Order Management'}
              </h1>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <div className="flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 text-xs shadow-[0_1px_0_rgba(0,0,0,0.02)]">
                <Clock size={12} className="text-stone-400" />
                <span>{new Date().toLocaleTimeString('en-IN')}</span>
              </div>
              <button
                onClick={() => void fetchOrders()}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-[9px] font-bold uppercase tracking-[0.22em] shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-colors hover:border-stone-900"
              >
                <RotateCcw size={12} />
                Refresh Orders
              </button>
              <button
                onClick={() => {
                  window.localStorage.removeItem('simvorae_admin_token');
                  navigate('/admin/login', { replace: true });
                }}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-[9px] font-bold uppercase tracking-[0.22em] shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-colors hover:border-stone-900"
              >
                <LockKeyhole size={12} />
                Logout
              </button>
            </div>
          </header>

          {(error || productError) && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-xs font-medium text-red-700">
              {error || productError}
            </div>
          )}

          {activeTab === 'OVERVIEW' && (
            <div className="space-y-8">
              <div className="flex flex-col gap-3 rounded-[1.1rem] border border-stone-200 bg-white px-4 py-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)] md:flex-row md:items-center md:justify-between">
                <div className="flex items-baseline gap-3">
                  <p className="text-[8.5px] font-bold uppercase tracking-[0.24em] text-stone-400">Period</p>
                  <h2 className="font-serif text-[1.35rem] font-medium leading-none tracking-tight text-stone-900">{rangeLabel}</h2>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={dashboardRange}
                    onChange={(event) => setDashboardRange(event.target.value as DashboardRange)}
                    className="h-10 cursor-pointer rounded-xl border border-stone-200 bg-stone-50 px-3.5 text-[9px] font-bold uppercase tracking-[0.22em] text-stone-700 outline-none transition-colors hover:border-stone-400 focus:border-stone-500"
                  >
                    {dashboardRangeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {dashboardRange === 'custom' && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(event) => setCustomStartDate(event.target.value)}
                        className="h-10 cursor-pointer rounded-xl border border-stone-200 bg-stone-50 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-stone-700 outline-none transition-colors hover:border-stone-400 focus:border-stone-500"
                      />
                      <span className="hidden text-[9px] font-bold uppercase tracking-widest text-stone-400 sm:inline">to</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(event) => setCustomEndDate(event.target.value)}
                        className="h-10 cursor-pointer rounded-xl border border-stone-200 bg-stone-50 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-stone-700 outline-none transition-colors hover:border-stone-400 focus:border-stone-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {statCards.map((card) => {
                  const Icon = card.icon;
                  const content = (
                    <>
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <span className="text-[9px] tracking-[0.22em] uppercase text-stone-500 font-semibold">{card.label}</span>
                        <div className={`rounded-lg bg-stone-100 p-2 ${card.tone}`}>
                          <Icon size={14} />
                        </div>
                      </div>
                      <p className="mb-2 font-serif text-[2rem] font-medium leading-none text-[#111]">
                        {card.value}
                      </p>
                      <div className={`flex items-center gap-1.5 font-mono text-[10px] font-medium leading-5 ${card.tone}`}>
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
                        className="relative cursor-pointer overflow-hidden rounded-[1.15rem] border border-stone-200 bg-white p-5 text-left shadow-sm transition-all duration-500 hover:border-[#1a1a1a]"
                      >
                        {content}
                      </button>
                    );
                  }

                  return (
                    <div key={card.label} className="relative overflow-hidden rounded-[1.15rem] border border-stone-200 bg-white p-5 shadow-sm transition-all duration-500 hover:border-[#1a1a1a]">
                      {content}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
                <div className="rounded-[1.25rem] border border-stone-200 bg-white p-5 shadow-sm md:p-6 lg:col-span-8">
                  <div className="mb-7 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="mb-1 font-serif text-[1.65rem] font-medium tracking-tight">Sales Revenue Trend</h3>
                      <p className="text-xs text-stone-400 font-light font-sans">Paid revenue trend for {rangeLabel} in Indian Rupees (INR)</p>
                    </div>
                    <span className="text-[10px] bg-stone-100/80 text-[#1a1a1a] font-mono tracking-widest uppercase px-3 py-1 rounded-full border border-stone-200">{rangeLabel}</span>
                  </div>

                  <div className="relative mt-2 aspect-[21/9] min-h-[190px] max-h-[280px] w-full">
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

                <div className="rounded-[1.25rem] border border-stone-200 bg-white p-5 shadow-sm md:p-6 lg:col-span-4">
                  <h3 className="mb-1 font-serif text-[1.65rem] font-medium tracking-tight">Category Ratios</h3>
                  <p className="mb-6 text-xs font-light font-sans text-stone-400">Product distribution across categories</p>

                  <div className="space-y-4">
                    {categoryOptions.map((catName) => {
                      const matchedProds = products.filter((product) => product.category === catName);
                      const count = matchedProds.length;
                      const ratio = products.length > 0 ? Math.round((count / products.length) * 100) : 0;
                      return (
                        <div key={catName} className="space-y-1.5 font-sans">
                          <div className="flex justify-between items-center text-xs font-medium">
                            <span className="text-stone-700">{catName}</span>
                            <span className="text-[#1a1a1a] font-bold font-mono">{count} ({ratio}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <div className="bg-stone-800 h-full rounded-full transition-all duration-[1s]" style={{ width: `${ratio}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 border-t border-stone-100 pt-5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-400 font-light">Catalog Value Spanned:</span>
                      <span className="font-mono font-medium text-stone-700 text-[10px] uppercase font-bold">Standard Mix</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-stone-200 bg-white p-5 shadow-sm md:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="font-serif text-[1.65rem] font-medium tracking-tight">Recent Orders</h3>
                  <button onClick={() => setActiveTab('ORDERS')} className="text-xs font-bold border-b border-[#1a1a1a] pb-0.5 uppercase tracking-widest text-[#1a1a1a] hover:text-stone-500 transition-colors cursor-pointer">
                    View All Orders
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-stone-100 text-stone-400 uppercase tracking-widest text-[9px] font-bold">
                        <th className="pb-3.5 font-semibold">ID</th>
                        <th className="pb-3.5 font-semibold">Customer</th>
                        <th className="pb-3.5 font-semibold">City</th>
                        <th className="pb-3.5 font-semibold">Ordered Items</th>
                        <th className="pb-3.5 font-semibold">Total Price</th>
                        <th className="pb-3.5 font-semibold text-right">Fulfillment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {recentOrders.slice(0, 4).map((order) => (
                        <tr key={order.id} className="group hover:bg-stone-50/40 transition-colors">
                          <td className="py-4 font-mono font-bold text-stone-900">{order.id}</td>
                          <td className="py-4 font-medium text-[#111]">{order.customer.name}</td>
                          <td className="py-4 text-stone-500">{order.customer.city}</td>
                          <td className="py-4 text-stone-600 max-w-sm truncate" title={order.items.map((item) => item.name).join(', ')}>
                            {order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}
                          </td>
                          <td className="py-4 font-mono font-bold text-[#111]">{formatCurrency(order.total)}</td>
                          <td className="py-4 text-right">
                            <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${
                              order.status === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'Shipped'
                                  ? 'bg-blue-100 text-blue-800'
                                  : order.status === 'Confirmed' || order.status === 'Packed'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-stone-100 text-stone-700'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
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
                      {filteredCatalog.map((product) => {
                        const inventoryStatus = getInventoryStatus(product);

                        return (
                          <tr key={product.id} className="group hover:bg-stone-50/40 transition-colors">
                            <td className="py-4 px-6 font-mono text-stone-500">#{product.id}</td>
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
              </div>
            </div>
          )}

          {activeTab === 'ORDERS' && (
            <div className="space-y-6">
              <div className="rounded-[1.15rem] border border-stone-200 bg-white/85 px-3 py-2.5 shadow-sm">
                <div className="flex gap-1.5 overflow-x-auto">
                  {orderQueueOptions.map((queue) => {
                    const isActive = activeOrderQueue === queue.value;

                    return (
                      <button
                        key={queue.value}
                        type="button"
                        onClick={() => setActiveOrderQueue(queue.value)}
                        className={`min-w-[124px] cursor-pointer rounded-[0.9rem] border px-3.5 py-2.5 text-left transition-all ${
                          isActive
                            ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#fcfbf9] shadow-sm'
                            : 'border-transparent bg-transparent text-stone-500 hover:border-stone-200 hover:bg-[#fcfbf9]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-[0.2em]">{queue.label}</span>
                          <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center font-mono text-[9px] font-bold ${
                            isActive ? 'bg-white/15 text-white' : 'bg-stone-100 text-stone-500'
                          }`}>
                            {orderQueueCounts[queue.value] ?? 0}
                          </span>
                        </div>
                        <p className={`mt-1 text-[8px] font-light ${isActive ? 'text-stone-300' : 'text-stone-400'}`}>
                          {queue.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[1.15rem] border border-stone-200 bg-white/85 px-4 py-3 shadow-sm">
                <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12">
                  <div className="relative lg:col-span-4">
                    <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                      placeholder="Search order, customer, phone, email..."
                      className="h-10 w-full rounded-[0.85rem] border border-stone-200 bg-[#fcfbf9] pl-9 pr-3 text-[11px] font-light tracking-wide outline-none transition-colors hover:border-stone-300 focus:border-stone-500"
                    />
                  </div>

                  <select
                    value={orderStatusFilter}
                    onChange={(event) => setOrderStatusFilter(event.target.value as 'All' | OrderStatus)}
                    className="h-10 cursor-pointer rounded-[0.85rem] border border-stone-200 bg-[#fcfbf9] px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-stone-600 outline-none transition-colors hover:border-stone-300 focus:border-stone-500 lg:col-span-2"
                  >
                    <option value="All">All Fulfillment</option>
                    {orderStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>

                  <select
                    value={paymentStatusFilter}
                    onChange={(event) => setPaymentStatusFilter(event.target.value as 'All' | Order['paymentStatus'])}
                    className="h-10 cursor-pointer rounded-[0.85rem] border border-stone-200 bg-[#fcfbf9] px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-stone-600 outline-none transition-colors hover:border-stone-300 focus:border-stone-500 lg:col-span-2"
                  >
                    <option value="All">All Payments</option>
                    <option value="pending">Pending</option>
                    <option value="authorized">Authorized</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>

                  <select
                    value={shippingStatusFilter}
                    onChange={(event) => setShippingStatusFilter(event.target.value as 'All' | Order['shippingStatus'])}
                    className="h-10 cursor-pointer rounded-[0.85rem] border border-stone-200 bg-[#fcfbf9] px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-stone-600 outline-none transition-colors hover:border-stone-300 focus:border-stone-500 lg:col-span-2"
                  >
                    <option value="All">All Shipping</option>
                    <option value="not_created">Not Created</option>
                    <option value="created">Created</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="failed">Failed</option>
                  </select>

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
                    className="h-10 cursor-pointer rounded-[0.85rem] border border-stone-200 bg-white px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-stone-500 transition-colors hover:border-stone-900 hover:text-stone-900 lg:col-span-2"
                  >
                    Clear Filters
                  </button>
                </div>

                <div className="mt-3 flex flex-col gap-3 border-t border-stone-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="text-[8px] font-bold uppercase tracking-[0.24em] text-stone-400">Order Date</span>
                    <input
                      type="date"
                      value={orderStartDate}
                      onChange={(event) => setOrderStartDate(event.target.value)}
                      className="h-9 cursor-pointer rounded-[0.8rem] border border-stone-200 bg-[#fcfbf9] px-3 text-[8px] font-bold uppercase tracking-[0.18em] text-stone-600 outline-none transition-colors hover:border-stone-300 focus:border-stone-500"
                    />
                    <span className="hidden text-[8px] font-bold uppercase tracking-widest text-stone-400 sm:inline">to</span>
                    <input
                      type="date"
                      value={orderEndDate}
                      onChange={(event) => setOrderEndDate(event.target.value)}
                      className="h-9 cursor-pointer rounded-[0.8rem] border border-stone-200 bg-[#fcfbf9] px-3 text-[8px] font-bold uppercase tracking-[0.18em] text-stone-600 outline-none transition-colors hover:border-stone-300 focus:border-stone-500"
                    />
                  </div>

                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">
                    Showing {filteredOrders.length} of {orders.length} orders
                  </p>
                </div>
              </div>

              <div className="bg-white border border-stone-200 rounded-[1.5rem] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-stone-100 text-stone-400 uppercase tracking-widest text-[9px] font-bold bg-stone-50/50">
                        <th className="py-4 px-6 font-semibold">Order ID</th>
                        <th className="py-4 px-6 font-semibold">Date Placed</th>
                        <th className="py-4 px-6 font-semibold">Customer Name</th>
                        <th className="py-4 px-6 font-semibold">Total Price</th>
                        <th className="py-4 px-6 font-semibold">Items Count</th>
                        <th className="py-4 px-6 font-semibold">Payment</th>
                        <th className="py-4 px-6 font-semibold">Shipping</th>
                        <th className="py-4 px-6 font-semibold">Fulfillment Status</th>
                        <th className="py-4 px-6 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="group hover:bg-stone-50/40 transition-colors">
                          <td className="py-4 px-6 font-mono font-bold text-stone-900">{order.id}</td>
                          <td className="py-4 px-6 text-stone-500 font-mono">
                            {new Date(order.createdAt).toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-4 px-6">
                            <h4 className="font-semibold text-[#111] mb-0.5">{order.customer.name}</h4>
                            <p className="text-[10px] text-stone-400 tracking-wide">{order.customer.phone}</p>
                          </td>
                          <td className="py-4 px-6 font-mono font-bold text-[#111]">{formatCurrency(order.total)}</td>
                          <td className="py-4 px-6 font-mono text-stone-500 font-medium">
                            {order.items.reduce((acc, current) => acc + current.quantity, 0)} items
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getPaymentStatusClasses(order.paymentStatus)}`}>
                              {formatStatusLabel(order.paymentStatus)}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getShippingStatusClasses(order.shippingStatus)}`}>
                              {formatStatusLabel(order.shippingStatus)}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-block rounded-full px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${getStatusClasses(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex min-w-[132px] flex-col items-end gap-2">
                              {(canMarkPacked(order) || canCreateShipment(order)) && (
                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest text-amber-700">
                                  Action Needed
                                </span>
                              )}
                              <button
                                onClick={() => setViewingOrder(order)}
                                className="cursor-pointer rounded-full border border-[#1a1a1a] px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-[#1a1a1a] transition-colors hover:bg-[#1a1a1a] hover:text-[#fcfbf9]"
                              >
                                View Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!isLoading && filteredOrders.length === 0 && (
                  <div className="p-16 text-center text-stone-400 flex flex-col items-center justify-center">
                    <p className="text-[10px] tracking-[0.25em] uppercase font-bold mb-3">
                      {orders.length === 0 ? 'No orders yet' : 'No matching orders'}
                    </p>
                    <p className="text-xs font-light text-stone-500 mb-6">
                      {orders.length === 0 ? 'Paid checkout orders will appear here after they are created.' : 'Change or clear filters to view more orders.'}
                    </p>
                    <button
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
                      className="cursor-pointer border-b border-[#1a1a1a] pb-0.5 text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]"
                    >
                      {orders.length === 0 ? 'Refresh Orders' : 'Clear Filters'}
                    </button>
                  </div>
                )}

                {isLoading && (
                  <div className="p-16 text-center text-xs font-bold uppercase tracking-[0.25em] text-stone-400">
                    Loading orders
                  </div>
                )}
              </div>
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
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[#0c0c0c]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[1.25rem] border border-stone-200 bg-[#fcfbf9] shadow-2xl">
            <div className="flex items-start justify-between gap-5 border-b border-stone-200 bg-white/60 px-6 py-5">
              <div>
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-stone-400">Order Action</p>
                <h3 className="font-serif text-[2rem] font-medium leading-none tracking-tight text-[#111]">Cancel order</h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelCandidate(null)}
                className="cursor-pointer rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-[9px] font-bold uppercase tracking-widest text-stone-500 transition-colors hover:border-stone-400 hover:text-stone-900"
              >
                Close
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="mb-5 text-xs font-light leading-6 text-stone-500">
                This will cancel <span className="font-mono font-bold text-[#111]">{cancelCandidate.id}</span>. Use this only for stock issues, customer requests, fraud checks, or invalid order details.
              </p>

              <div className="grid grid-cols-1 overflow-hidden rounded-[1rem] border border-stone-200 bg-white sm:grid-cols-2">
                <div className="border-b border-stone-200 p-4 sm:border-b-0 sm:border-r">
                  <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-stone-400">Customer</p>
                  <p className="mt-2 text-sm font-semibold text-[#111]">{cancelCandidate.customer.name}</p>
                  <p className="mt-1 text-xs text-stone-400">{cancelCandidate.customer.phone}</p>
                </div>
                <div className="p-4 text-right">
                  <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-stone-400">Order Total</p>
                  <p className="mt-2 font-mono text-sm font-bold text-[#111]">{formatCurrency(cancelCandidate.total)}</p>
                  <p className="mt-1 text-xs text-stone-400">{cancelCandidate.status}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-stone-200 bg-white/70 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelCandidate(null)}
                className="cursor-pointer rounded-xl border border-stone-200 bg-[#fcfbf9] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-900"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={updatingOrderFor === cancelCandidate.id}
                onClick={() => void confirmCancelOrder()}
                className="cursor-pointer rounded-xl border border-[#1a1a1a] bg-[#1a1a1a] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#fcfbf9] transition-colors hover:bg-black disabled:cursor-not-allowed disabled:border-stone-400 disabled:bg-stone-400"
              >
                {updatingOrderFor === cancelCandidate.id ? 'Cancelling' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteProductCandidate && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[#0c0c0c]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[1.25rem] border border-stone-200 bg-[#fcfbf9] shadow-2xl">
            <div className="flex items-start justify-between gap-5 border-b border-stone-200 bg-white/60 px-6 py-5">
              <div>
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-stone-400">Catalog Action</p>
                <h3 className="font-serif text-[2rem] font-medium leading-none tracking-tight text-[#111]">Delete product</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteProductCandidate(null)}
                className="cursor-pointer rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-[9px] font-bold uppercase tracking-widest text-stone-500 transition-colors hover:border-stone-400 hover:text-stone-900"
              >
                Close
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="mb-5 text-xs font-light leading-6 text-stone-500">
                This will remove <span className="font-semibold text-[#111]">{deleteProductCandidate.name}</span> from the catalog and delete its uploaded product images from storage.
              </p>

              <div className="overflow-hidden rounded-[1rem] border border-stone-200 bg-white">
                <div className="flex gap-4 p-4">
                  <div className="h-24 w-18 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
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
                      #{deleteProductCandidate.id} · {deleteProductCandidate.category}
                    </p>
                    <p className="mt-3 font-mono text-xs font-bold text-[#111]">{formatCurrency(deleteProductCandidate.price)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-stone-200 bg-white/70 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteProductCandidate(null)}
                className="cursor-pointer rounded-xl border border-stone-200 bg-[#fcfbf9] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-900"
              >
                Keep Product
              </button>
              <button
                type="button"
                disabled={deletingProductFor === deleteProductCandidate.id}
                onClick={() => void confirmDeleteProduct()}
                className="cursor-pointer rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-red-700 transition-colors hover:border-red-300 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:border-stone-300 disabled:bg-stone-200 disabled:text-stone-500"
              >
                {deletingProductFor === deleteProductCandidate.id ? 'Deleting' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingOrder && (
        <OrderDrawer
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onMarkPacked={() => {
            void handleMarkPacked(viewingOrder);
          }}
          onCreateShipment={() => {
            void handleCreateShipment(viewingOrder);
          }}
          onCancelOrder={() => {
            setCancelCandidate(viewingOrder);
          }}
          isUpdating={updatingOrderFor === viewingOrder.id}
          isCreatingShipment={creatingShipmentFor === viewingOrder.id}
        />
      )}
    </div>
  );
}
