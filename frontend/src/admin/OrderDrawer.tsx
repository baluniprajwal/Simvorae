import { ArrowLeft, ExternalLink, X } from 'lucide-react';
import type { Order } from '../store/orderStore';
import CopyButton from './CopyButton';

const neutralBadgeClasses = 'bg-stone-100 text-[#1a1a1a] border-stone-200';
const successBadgeClasses = 'bg-green-50 text-green-700 border-green-100';
const warningBadgeClasses = 'bg-amber-50 text-amber-700 border-amber-100';
const dangerBadgeClasses = 'bg-red-50 text-red-600 border-red-100';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const formatStatusLabel = (status: string) =>
  status.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

const getOrderStatusBadgeClasses = (status: string) => {
  if (status === 'Delivered') return successBadgeClasses;
  if (['Pending', 'Confirmed', 'Packed', 'Shipped'].includes(status)) return warningBadgeClasses;
  if (status === 'Cancelled') return dangerBadgeClasses;
  return neutralBadgeClasses;
};

const getPaymentStatusBadgeClasses = (status: string) => {
  if (status === 'paid') return successBadgeClasses;
  if (status === 'pending' || status === 'refund_pending') return warningBadgeClasses;
  if (['failed', 'refunded'].includes(status)) return dangerBadgeClasses;
  return neutralBadgeClasses;
};

const getShippingStatusBadgeClasses = (status: string) => {
  if (status === 'delivered') return successBadgeClasses;
  if (['created', 'awb_assigned', 'pickup_scheduled', 'shipped', 'in_transit', 'not_created', 'cancellation_pending'].includes(status)) return warningBadgeClasses;
  if (['failed', 'cancelled'].includes(status)) return dangerBadgeClasses;
  return neutralBadgeClasses;
};

export default function OrderDrawer({
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
  const canRetryAwb = Boolean(order.shipmentId && !order.awbCode && order.shippingStatus === 'created');
  const canCreateShipment = order.paymentStatus === 'paid' && order.status === 'Packed' && (
    ['not_created', 'failed'].includes(order.shippingStatus) || canRetryAwb
  );
  const canCancelOrder = order.paymentStatus === 'paid' && !hasShipment && !['Shipped', 'Delivered', 'Cancelled'].includes(order.status);
  const hasShipmentCancellationRequested = ['cancellation_pending', 'cancelled'].includes(order.shippingStatus);
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

            {hasShipment && (
              <div className="border-t border-stone-100 px-6 py-4 font-sans text-[11px] font-normal leading-relaxed text-stone-500">
                Print the official label and invoice, add an e-way bill when applicable, and request pickup from the Shiprocket dashboard.
              </div>
            )}

            {order.total > 50000 && (
              <div className="border-t border-amber-100 bg-amber-50 px-6 py-4 font-sans text-[11px] font-normal leading-relaxed text-amber-800">
                This order exceeds INR 50,000. An e-way bill may be required; complete the applicable documentation in Shiprocket before requesting pickup.
              </div>
            )}

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
                    {isCreatingShipment ? 'Working' : canRetryAwb ? 'Retry AWB' : 'Create Shipment'}
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

