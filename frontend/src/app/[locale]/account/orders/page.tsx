"use client";

import Link from 'next/link';
import { Package, Truck, CheckCircle2, Search } from 'lucide-react';
import { useState } from 'react';

// Mock Data for Orders
const MOCK_ORDERS = [
  {
    id: "GLW-8931",
    date: "Oct 5, 2026",
    status: "Delivered",
    total: 1250000,
    items: [
      { id: 1, name: "Radiant Silk Foundation", image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?q=80&w=400&auto=format&fit=crop" },
      { id: 2, name: "Velvet Matte Lipstick", image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=400&auto=format&fit=crop" }
    ]
  },
  {
    id: "GLW-8842",
    date: "Sep 28, 2026",
    status: "Processing",
    total: 890000,
    items: [
      { id: 3, name: "Luminous Night Serum", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=400&auto=format&fit=crop" }
    ]
  },
  {
    id: "GLW-8719",
    date: "Aug 15, 2026",
    status: "Delivered",
    total: 2100000,
    items: [
      { id: 4, name: "Hydrating Rose Mist", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=400&auto=format&fit=crop" },
      { id: 5, name: "Golden Glow Highlighter", image: "https://images.unsplash.com/photo-1599305090598-fe179d501227?q=80&w=400&auto=format&fit=crop" },
      { id: 6, name: "Nourishing Lip Oil", image: "https://images.unsplash.com/photo-1617897903246-719242758050?q=80&w=400&auto=format&fit=crop" }
    ]
  }
];

export default function AccountOrders() {
  const [filter, setFilter] = useState("All");

  const filteredOrders = MOCK_ORDERS.filter(o => filter === "All" ? true : o.status === filter);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Order History</h1>
          <p className="text-sm text-text-secondary mt-1">Track, return, or repurchase items.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input 
            type="text" 
            placeholder="Search orders..." 
            className="w-full md:w-64 rounded-full border border-nude/60 bg-surface py-2 pl-9 pr-4 text-sm focus:border-primary-rose focus:outline-none focus:ring-1 focus:ring-primary-rose transition"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-nude/40 overflow-x-auto no-scrollbar">
        {["All", "Processing", "Shipped", "Delivered"].map(tab => (
          <button 
            key={tab}
            onClick={() => setFilter(tab)}
            className={`text-sm font-semibold pb-3 transition-colors relative whitespace-nowrap ${
              filter === tab ? "text-primary-rose" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab}
            {filter === tab && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary-rose rounded-t-full"></span>
            )}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-5">
        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-nude/30 bg-surface/50">
            <Package className="h-12 w-12 mx-auto text-nude/80 mb-3" />
            <h3 className="font-semibold text-text-primary">No orders found</h3>
            <p className="text-sm text-text-secondary mt-1">You do not have any {filter.toLowerCase()} orders at the moment.</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="group rounded-2xl border border-nude/40 bg-surface p-6 transition-all hover:border-primary-rose/50 hover:shadow-md">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                
                {/* Order Meta */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-text-primary text-lg">Order #{order.id}</h3>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                      order.status === 'Delivered' ? 'bg-status-success/10 text-status-success' :
                      order.status === 'Processing' ? 'bg-status-warning/10 text-status-warning' :
                      'bg-text-secondary/10 text-text-secondary'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">Placed on {order.date}</p>
                  <p className="text-sm font-bold text-text-primary mt-2">{order.total.toLocaleString("vi-VN")}đ</p>
                </div>

                {/* Items Thumbnails */}
                <div className="flex items-center gap-2">
                  {order.items.slice(0, 3).map(item => (
                    <div key={item.id} className="relative h-16 w-16 overflow-hidden rounded-xl border border-nude/30 bg-background">
                      {/* Using regular img tag to avoid Next.js Image config issues during dev, in real app use next/image */}
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-nude/20 text-xs font-semibold text-text-secondary">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>

                {/* Action */}
                <div className="flex items-center justify-end md:w-32">
                  <Link 
                    href={`/account/orders/${order.id}`} 
                    className="flex items-center text-sm font-semibold text-primary-rose hover:text-primary-pink transition"
                  >
                    View Details
                  </Link>
                </div>

              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}