"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useCartStore } from "@/store/useCartStore";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslations } from "next-intl";
import { Minus, Plus, Trash2 } from "lucide-react";

export default function CartPage() {
  const { items, updateQuantity, removeItem, getSubtotal } = useCartStore();
  const { formatPrice } = useCurrency();
  const tNav = useTranslations("nav");
  const tProd = useTranslations("product");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const subtotal = getSubtotal();
  const shipping = subtotal > 500000 || subtotal === 0 ? 0 : 30000;
  const total = subtotal + shipping;

  return (
    <div className="bg-transparent min-h-screen py-12 font-poppins">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-10 font-serif">{tNav("cart")}</h1>

        {items.length === 0 ? (
          <div className="text-center py-20 rounded-3xl p-8 bg-white border border-[#F3E5E8] shadow-sm">
            <h2 className="text-2xl font-bold text-text-primary mb-4 font-serif">Giỏ hàng của bạn đang trống</h2>
            <p className="text-text-secondary mb-8 text-sm">Hãy khám phá các dòng mỹ phẩm sinh học Thụy Sĩ cao cấp để bắt đầu chăm sóc làn da.</p>
            <Link href="/shop" className="inline-flex items-center justify-center rounded-full bg-text-primary px-8 py-3 text-sm font-bold text-white hover:bg-primary-rose transition shadow-xs">
              Khám Phá Sản Phẩm
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-12">
            {/* Cart Items */}
            <div className="lg:col-span-8">
              <div className="rounded-3xl bg-white border border-[#F3E5E8] shadow-sm overflow-hidden">
                <div className="p-6 sm:p-8">
                  <div className="hidden sm:grid grid-cols-12 text-xs font-bold text-text-secondary uppercase tracking-wider mb-6 pb-4 border-b border-nude/40">
                    <div className="col-span-6">Sản Phẩm</div>
                    <div className="col-span-3 text-center">Số Lượng</div>
                    <div className="col-span-3 text-right">Tổng</div>
                  </div>

                  <div className="space-y-8">
                    {items.map((item) => (
                      <div key={item.id} className="grid sm:grid-cols-12 gap-6 items-center">
                        <div className="col-span-6 flex gap-6">
                          <div className="relative h-24 w-20 rounded-2xl overflow-hidden bg-white shrink-0 border border-nude/30">
                            <Image src={item.image} alt={item.name} fill className="object-cover" />
                          </div>
                          <div className="flex flex-col justify-center">
                            <h3 className="font-bold text-text-primary text-sm mb-1">{item.name}</h3>
                            {item.variant && <p className="text-xs text-text-secondary mb-1">{item.variant}</p>}
                            <p className="text-xs font-semibold text-[#065F46] sm:hidden">{formatPrice(item.price)}</p>
                          </div>
                        </div>

                        <div className="col-span-3 flex justify-start sm:justify-center">
                          <div className="flex items-center border border-nude/60 rounded-full bg-surface-container-low p-1">
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-full text-text-secondary hover:text-primary-rose transition disabled:opacity-40"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-text-primary">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-full text-text-secondary hover:text-primary-rose transition"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <div className="col-span-3 flex justify-between sm:justify-end items-center gap-4">
                          <p className="font-bold text-[#065F46] text-sm">{formatPrice(item.price * item.quantity)}</p>
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="text-text-secondary hover:text-rose-600 transition p-2"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-4">
              <div className="rounded-3xl bg-white border border-[#F3E5E8] p-6 sm:p-8 sticky top-24 shadow-sm">
                <h2 className="text-lg font-bold text-text-primary mb-6">Tóm Tắt Đơn Hàng</h2>
                
                <div className="space-y-4 text-xs text-text-secondary mb-6 pb-6 border-b border-nude/40">
                  <div className="flex justify-between">
                    <span>Tạm tính</span>
                    <span className="text-text-primary font-bold">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phí vận chuyển</span>
                    <span className="text-text-primary font-bold">{shipping === 0 ? "Miễn phí" : formatPrice(shipping)}</span>
                  </div>
                  {shipping > 0 && (
                    <p className="text-[11px] text-[#DE5D83] mt-1 font-medium">Mua thêm {formatPrice(500000 - subtotal)} để được miễn phí vận chuyển 2H.</p>
                  )}
                </div>

                <div className="flex justify-between items-end mb-8">
                  <span className="text-base font-bold text-text-primary">Tổng cộng</span>
                  <span className="text-xl font-bold text-[#065F46]">{formatPrice(total)}</span>
                </div>

                <Link 
                  href="/checkout"
                  className="w-full flex items-center justify-center rounded-full bg-text-primary py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-primary-rose transition shadow-md active:scale-95"
                >
                  Tiến Hành Thanh Toán
                </Link>

                <div className="mt-6 flex items-center justify-center gap-3 text-text-secondary text-[11px]">
                  <span>Bảo mật 100%</span>
                  <span>•</span>
                  <span>Đổi trả 14 ngày</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
