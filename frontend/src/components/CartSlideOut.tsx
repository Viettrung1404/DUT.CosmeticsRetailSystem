"use client";

import { useCartStore } from "@/store/useCartStore";
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Truck, 
  Sparkles, 
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCurrency } from "@/hooks/useCurrency";
import toast from "react-hot-toast";

// Ngưỡng miễn phí vận chuyển toàn quốc (500.000₫)
const FREE_SHIPPING_THRESHOLD = 500000;

// Gợi ý sản phẩm mua kèm thông minh (Smart Cross-sell TokyoLife-style)
const CROSS_SELL_ITEMS = [
  {
    id: "cross-bio-cotton",
    productId: "prod-bio-cotton",
    name: "Bông tẩy trang Swiss Bio-Cotton (80 miếng)",
    price: 45000,
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=200",
    variant: "Hộp 80 miếng",
  },
  {
    id: "cross-mini-glaze",
    productId: "prod-mini-glaze",
    name: "Mini Peptide Glaze Discovery Elixir (15ml)",
    price: 180000,
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=200",
    variant: "Chai du lịch 15ml",
  },
];

export default function CartSlideOut({ 
  isOpen: propIsOpen, 
  onClose: propOnClose 
}: { 
  isOpen?: boolean; 
  onClose?: () => void 
}) {
  const { 
    items, 
    removeItem, 
    updateQuantity, 
    getSubtotal, 
    getTotalItems,
    isDrawerOpen, 
    closeDrawer,
    addItem
  } = useCartStore();
  
  const { formatPrice } = useCurrency();
  const [mounted, setMounted] = useState(false);

  // Hỗ trợ cả control từ props và control toàn cục từ store
  const isOpen = propIsOpen !== undefined ? propIsOpen : isDrawerOpen;
  const handleClose = propOnClose || closeDrawer;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Đóng bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Khóa thanh cuộn giỏ hàng: gán overflow = "hidden" khi mở, trả về "unset" khi đóng hoặc unmount
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const subtotal = getSubtotal();
  const totalItems = getTotalItems();
  const diffToFreeShip = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

  const handleAddCrossSell = (crossItem: typeof CROSS_SELL_ITEMS[0]) => {
    addItem({
      id: crossItem.id,
      productId: crossItem.productId,
      name: crossItem.name,
      price: crossItem.price,
      image: crossItem.image,
      quantity: 1,
      variant: crossItem.variant,
    });
    toast.success(`Đã thêm ${crossItem.name} vào giỏ hàng!`, {
      style: {
        borderRadius: "12px",
        background: "#211a1c",
        color: "#fff",
        fontSize: "12px",
      },
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop mờ mềm mại */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={handleClose}
      />

      {/* Slide Out Panel */}
      <div 
        className="relative z-10 h-screen w-full sm:w-[450px] bg-surface shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ease-out border-l border-outline-variant/30"
      >
        {/* 1. Header Giỏ hàng */}
        <div className="flex items-center justify-between border-b border-outline-variant/20 px-6 py-4.5 bg-surface-container-low/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-primary">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface font-serif">
                Giỏ Hàng Của Bạn
              </h2>
              <span className="text-[11px] font-medium text-on-surface-variant">
                {totalItems} sản phẩm đã chọn
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleClose}
            className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition"
            aria-label="Đóng giỏ hàng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2. Free Shipping Gamification Bar (Phong cách TokyoLife) */}
        <div className="bg-surface-container/60 border-b border-outline-variant/20 px-6 py-3.5">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="flex items-center gap-1.5 text-on-surface">
              <Truck className={`h-4 w-4 ${progressPercent >= 100 ? "text-emerald-600" : "text-primary"}`} />
              {progressPercent >= 100 ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Bạn đã được MIỄN PHÍ VẬN CHUYỂN!
                </span>
              ) : (
                <span>
                  Mua thêm <strong className="text-primary font-bold">{formatPrice(diffToFreeShip)}</strong> để được Freeship
                </span>
              )}
            </span>
            <span className="text-[11px] font-bold text-primary">{progressPercent}%</span>
          </div>

          {/* Progress track */}
          <div className="h-2 w-full rounded-full bg-outline-variant/30 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                progressPercent >= 100 
                  ? "bg-emerald-500" 
                  : "bg-gradient-to-r from-primary to-secondary"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 3. Danh sách sản phẩm trong giỏ */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 divide-y divide-outline-variant/15">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-16">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-surface-container text-primary/40 mb-4">
                <ShoppingBag className="h-10 w-10" />
              </div>
              <h3 className="text-base font-bold text-on-surface font-serif mb-1">
                Giỏ hàng của bạn đang trống
              </h3>
              <p className="text-xs text-on-surface-variant max-w-xs mb-6">
                Khám phá các tinh chất thực vật sinh học Thụy Sĩ và bắt đầu chu trình chăm sóc da chuẩn lâm sàng.
              </p>
              <button 
                onClick={handleClose} 
                className="rounded-full bg-primary px-7 py-3 text-xs font-bold text-white hover:bg-secondary transition shadow-sm"
              >
                Khám Phá Cửa Hàng
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {items.map((item) => (
                <div key={item.id} className="pt-4 first:pt-0 flex gap-3.5 group">
                  {/* Thumbnail */}
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-surface-container-low border border-outline-variant/30">
                    {item.image ? (
                      <Image 
                        src={item.image} 
                        alt={item.name} 
                        fill 
                        className="object-cover" 
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-on-surface-variant">
                        No img
                      </div>
                    )}
                  </div>
                  
                  {/* Content & Controls */}
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="line-clamp-2 text-xs font-bold text-on-surface leading-snug font-serif">
                          {item.name}
                        </h4>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-on-surface-variant/60 hover:text-status-danger p-1 transition"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {item.variant && (
                        <span className="inline-block rounded-md bg-surface-container px-2 py-0.5 text-[10px] font-medium text-primary mt-1">
                          {item.variant}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center rounded-full border border-outline-variant/40 bg-surface shadow-2xs">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2.5 py-1 text-on-surface-variant hover:text-primary disabled:opacity-30 transition"
                          disabled={item.quantity <= 1}
                          aria-label="Giảm số lượng"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold text-on-surface">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2.5 py-1 text-on-surface-variant hover:text-primary transition"
                          aria-label="Tăng số lượng"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      
                      <p className="text-xs font-bold text-primary font-serif">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. Gợi ý Cross-sell (Mua kèm nhận thêm ưu đãi) */}
          {items.length > 0 && (
            <div className="pt-5 mt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Mua Kèm Ưu Đãi (Cross-sell)
                </span>
                <span className="text-[10px] text-on-surface-variant">Khuyên dùng cùng</span>
              </div>

              <div className="space-y-2.5">
                {CROSS_SELL_ITEMS.map((cross) => {
                  const isAlreadyInCart = items.some(item => item.id === cross.id);
                  return (
                    <div 
                      key={cross.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl border border-outline-variant/30 bg-surface-container-low/40 hover:bg-surface-container-low transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative h-11 w-11 rounded-xl overflow-hidden bg-white border border-outline-variant/20 flex-shrink-0">
                          <Image src={cross.image} alt={cross.name} fill className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-on-surface truncate">{cross.name}</p>
                          <p className="text-[10px] font-bold text-primary font-serif">{formatPrice(cross.price)}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddCrossSell(cross)}
                        disabled={isAlreadyInCart}
                        className={`rounded-full px-3 py-1 text-[10px] font-bold transition flex-shrink-0 ${
                          isAlreadyInCart
                            ? "bg-outline-variant/40 text-on-surface-variant cursor-not-allowed"
                            : "bg-surface border border-primary text-primary hover:bg-primary hover:text-white"
                        }`}
                      >
                        {isAlreadyInCart ? "Đã có" : "+ Thêm"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 5. Footer & Checkout CTA */}
        {items.length > 0 && (
          <div className="border-t border-outline-variant/20 bg-surface px-6 py-5 shadow-lg space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Tạm tính ({totalItems} sản phẩm)</span>
                <span className="font-semibold text-on-surface">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Phí vận chuyển</span>
                <span className="font-semibold text-emerald-600">
                  {progressPercent >= 100 ? "Miễn phí" : "Tính tại thanh toán"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 text-base font-bold text-on-surface">
                <span>Tổng cộng ước tính</span>
                <span className="text-lg font-serif text-primary">
                  {formatPrice(subtotal)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Link 
                href="/cart"
                onClick={handleClose}
                className="flex items-center justify-center rounded-full border border-outline-variant/60 bg-surface py-3 text-xs font-bold text-on-surface transition hover:border-primary hover:text-primary text-center"
              >
                Xem Toàn Bộ Giỏ
              </Link>
              <Link 
                href="/checkout"
                onClick={handleClose}
                className="flex items-center justify-center rounded-full bg-primary py-3 text-xs font-bold text-white transition hover:bg-secondary shadow-md text-center"
              >
                Thanh Toán Ngay
              </Link>
            </div>

            <div className="flex items-center justify-center gap-4 text-[10px] text-on-surface-variant pt-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600" /> 100% Chính hãng Thụy Sĩ
              </span>
              <span>•</span>
              <span>Đổi trả 30 ngày miễn phí</span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
