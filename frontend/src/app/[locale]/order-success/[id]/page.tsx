"use client";

import { Link } from "@/i18n/routing";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { useParams } from "next/navigation";

export default function OrderSuccessPage() {
  const params = useParams();
  const orderNumber = params.id as string;

  return (
    <div className="bg-background min-h-[80vh] flex flex-col items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full text-center">
        
        <div className="flex justify-center mb-8">
          <div className="h-24 w-24 bg-primary-pink/20 rounded-full flex items-center justify-center text-primary-rose">
            <CheckCircle2 className="h-12 w-12" />
          </div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4 font-serif">
          Thank you for your order!
        </h1>
        
        <div className="bg-surface border border-nude/40 rounded-3xl p-8 mb-10 shadow-sm mt-8">
          <p className="text-text-secondary text-lg mb-4">
            Order number: <span className="font-bold text-text-primary">{orderNumber}</span>
          </p>
          <p className="text-text-secondary mb-6 leading-relaxed">
            We've received your order and are getting it ready to be shipped. 
            We will send you an email with the tracking information as soon as your order has shipped.
          </p>
          
          <div className="bg-primary-pink/5 border border-primary-rose/20 rounded-xl p-4 inline-flex flex-col sm:flex-row items-center gap-4 mx-auto">
            <div className="flex-1 text-left sm:pr-8">
              <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-1">Expected Delivery</p>
              <p className="font-bold text-text-primary">3-5 Business Days</p>
            </div>
            <div className="hidden sm:block w-px h-8 bg-primary-rose/20"></div>
            <div className="flex-1 text-left sm:pl-8">
              <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-1">Payment Method</p>
              <p className="font-bold text-text-primary">Cash on Delivery (COD)</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/account/orders" 
            className="inline-flex items-center justify-center rounded-full border border-nude/60 bg-surface px-8 py-4 text-sm font-bold text-text-primary hover:border-text-primary transition"
          >
            Track Order
          </Link>
          <Link 
            href="/" 
            className="inline-flex items-center justify-center gap-2 rounded-full bg-text-primary px-8 py-4 text-sm font-bold text-white hover:bg-primary-rose transition"
          >
            <ShoppingBag className="h-4 w-4" /> Continue Shopping
          </Link>
        </div>

      </div>
    </div>
  );
}
