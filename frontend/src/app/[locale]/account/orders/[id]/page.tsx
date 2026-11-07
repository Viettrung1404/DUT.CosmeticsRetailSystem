"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, CheckCircle2, Package, Truck, Home, MapPin, Receipt, HelpCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

// Mock data (same as orders list but with more details)
const ORDER_DETAILS = {
  "GLW-8931": {
    id: "GLW-8931",
    date: "October 5, 2026 at 2:45 PM",
    status: "Delivered",
    subtotal: 1250000,
    shipping: 0,
    discount: 0,
    total: 1250000,
    address: {
      name: "Elena Vance",
      street: "482 Radiance Way, Penthouse 7B",
      city: "San Francisco, CA 94102",
      phone: "+1 (415) 890-4412"
    },
    items: [
      { id: 1, name: "Radiant Silk Foundation", price: 850000, qty: 1, image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?q=80&w=400&auto=format&fit=crop" },
      { id: 2, name: "Velvet Matte Lipstick", price: 400000, qty: 1, image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=400&auto=format&fit=crop" }
    ]
  }
};

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // For demo, just use the mock or fallback
  const order = ORDER_DETAILS[orderId as keyof typeof ORDER_DETAILS] || {
    ...ORDER_DETAILS["GLW-8931"],
    id: orderId,
    status: "Processing"
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/account/orders" className="p-2 -ml-2 rounded-full hover:bg-nude/30 transition text-text-secondary">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Order #{order.id}</h1>
          <p className="text-sm text-text-secondary mt-1">Placed on {order.date}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        
        {/* Left Column: Tracking & Items */}
        <div className="space-y-8">
          
          {/* Tracking Tracker (Similar to Confirmation Page) */}
          <div className="rounded-2xl border border-nude/40 bg-surface p-6 sm:p-8">
            <h2 className="text-lg font-bold text-text-primary mb-6">Delivery Status</h2>
            
            <div className="relative">
              <div className="space-y-8 relative">
                
                {/* Step 1: Confirmed */}
                <div className="flex gap-4 relative">
                  {order.status !== 'Processing' && (
                    <div className="absolute left-6 top-12 bottom-[-32px] w-0.5 -ml-[1px] bg-primary-rose/50 z-0"></div>
                  )}
                  <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-status-success text-white shadow-[0_0_0_4px_white]">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="pt-3">
                    <h3 className="font-bold text-text-primary">Order Confirmed</h3>
                    <p className="text-xs text-text-secondary mt-1">Oct 5, 2026 - 2:45 PM</p>
                  </div>
                </div>
                
                {/* Step 2: Packed */}
                <div className="flex gap-4 relative">
                  {order.status === 'Delivered' && (
                    <div className="absolute left-6 top-12 bottom-[-32px] w-0.5 -ml-[1px] bg-primary-rose/50 z-0"></div>
                  )}
                  <div className={`relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white shadow-[0_0_0_4px_white] ${order.status !== 'Processing' ? 'bg-primary-rose' : 'bg-status-warning'}`}>
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="pt-3">
                    <h3 className={`font-bold ${order.status !== 'Processing' ? 'text-text-primary' : 'text-status-warning'}`}>Packed & Ready</h3>
                    <p className="text-xs text-text-secondary mt-1">At fulfillment center</p>
                  </div>
                </div>
                
                {/* Step 3: Out for Delivery */}
                <div className={`flex gap-4 relative ${order.status === 'Processing' ? 'opacity-40' : ''}`}>
                  {order.status === 'Delivered' && (
                    <div className="absolute left-6 top-12 bottom-[-32px] w-0.5 -ml-[1px] bg-primary-rose/50 z-0"></div>
                  )}
                  <div className={`relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white shadow-[0_0_0_4px_white] ${order.status === 'Delivered' ? 'bg-primary-rose' : 'bg-nude/40 text-text-secondary'}`}>
                    <Truck className="h-5 w-5" />
                  </div>
                  <div className="pt-3">
                    <h3 className="font-bold text-text-primary">Out for Delivery</h3>
                  </div>
                </div>
                
                {/* Step 4: Delivered */}
                <div className={`flex gap-4 relative ${order.status !== 'Delivered' ? 'opacity-40' : ''}`}>
                  <div className={`relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white shadow-[0_0_0_4px_white] ${order.status === 'Delivered' ? 'bg-status-success shadow-[0_0_0_4px_white,0_0_0_8px_rgba(40,167,69,0.2)]' : 'bg-nude/40 text-text-secondary'}`}>
                    <Home className="h-5 w-5" />
                  </div>
                  <div className="pt-3">
                    <h3 className={`font-bold ${order.status === 'Delivered' ? 'text-status-success' : 'text-text-primary'}`}>Delivered</h3>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-nude/40 bg-surface p-6 sm:p-8">
            <h2 className="text-lg font-bold text-text-primary mb-6">Items Ordered</h2>
            <div className="space-y-6">
              {order.items.map(item => (
                <div key={item.id} className="flex gap-4 border-b border-nude/30 pb-6 last:border-0 last:pb-0">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-nude/20 bg-background">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-semibold text-text-primary line-clamp-1">{item.name}</p>
                        <p className="text-sm text-text-secondary mt-1">Qty: {item.qty}</p>
                      </div>
                      <p className="font-bold text-text-primary">{(item.price * item.qty).toLocaleString("vi-VN")}đ</p>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <button className="text-xs font-medium text-primary-rose hover:underline">Write a Review</button>
                      <button className="text-xs font-medium text-text-secondary hover:text-text-primary hover:underline">Buy Again</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Summary & Address */}
        <div className="space-y-6">
          
          <div className="rounded-2xl border border-nude/40 bg-surface p-6">
            <h2 className="text-lg font-bold text-text-primary mb-5 flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Order Summary
            </h2>
            <div className="space-y-3 text-sm text-text-secondary">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{order.subtotal.toLocaleString("vi-VN")}đ</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{order.shipping === 0 ? "Free" : `${order.shipping.toLocaleString("vi-VN")}đ`}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-status-success">
                  <span>Discount</span>
                  <span>-{order.discount.toLocaleString("vi-VN")}đ</span>
                </div>
              )}
            </div>
            <div className="my-4 h-px w-full bg-nude/40"></div>
            <div className="flex justify-between items-center text-lg font-bold text-text-primary">
              <span>Total</span>
              <span>{order.total.toLocaleString("vi-VN")}đ</span>
            </div>
            
            <button className="w-full mt-6 rounded-full border border-nude/60 py-2.5 text-sm font-semibold text-text-secondary hover:border-primary-rose hover:text-primary-rose transition">
              Download Invoice
            </button>
          </div>

          <div className="rounded-2xl border border-nude/40 bg-surface p-6">
            <h2 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Shipping Address
            </h2>
            <div className="text-sm text-text-secondary space-y-1">
              <p className="font-semibold text-text-primary">{order.address.name}</p>
              <p>{order.address.street}</p>
              <p>{order.address.city}</p>
              <p>{order.address.phone}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-primary-rose/30 bg-primary-pink/5 p-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary-rose/10 text-primary-rose">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-text-primary text-sm">Need help with this order?</h3>
            <p className="mt-1 text-xs text-text-secondary">Return items, report issues, or track delivery.</p>
            <button className="mt-4 w-full rounded-full bg-text-primary py-2 text-xs font-semibold text-white transition hover:bg-gray-800">
              Contact Support
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}