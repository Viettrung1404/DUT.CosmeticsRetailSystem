"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { useCartStore } from "@/store/useCartStore";
import { useCurrency } from "@/hooks/useCurrency";
import { ChevronRight, Lock, MapPin, CreditCard, Truck } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getSubtotal, clearCart } = useCartStore();
  const { formatPrice } = useCurrency();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const subtotal = getSubtotal();
  const shipping = subtotal > 500000 || subtotal === 0 ? 0 : 30000;
  const total = subtotal + shipping;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call to backend Checkout POST /api/v1/orders
    setTimeout(() => {
      const orderNumber = "GLW-" + Math.floor(100000 + Math.random() * 900000);
      clearCart();
      router.push(`/order-success/${orderNumber}`);
    }, 1500);
  };

  if (items.length === 0 && !isSubmitting) {
    return (
      <div className="bg-transparent min-h-[70vh] flex items-center justify-center p-4 font-poppins">
        <div className="text-center bg-white p-10 rounded-3xl border border-[#F3E5E8] shadow-sm max-w-md">
          <h1 className="text-2xl font-bold text-text-primary mb-4 font-serif">Giỏ hàng của bạn đang trống</h1>
          <p className="text-sm text-text-secondary mb-6">Vui lòng chọn sản phẩm trước khi thanh toán.</p>
          <Link href="/shop" className="inline-flex rounded-full bg-text-primary px-6 py-3 text-xs font-bold text-white hover:bg-primary-rose transition">
            Quay Lại Cửa Hàng
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-transparent min-h-screen font-poppins">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-text-secondary mb-10 uppercase tracking-wider font-semibold">
          <Link href="/cart" className="hover:text-primary-rose transition">Giỏ Hàng</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-bold text-text-primary">Thanh Toán</span>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-10">
              
              {/* Contact section */}
              <section>
                <div className="flex justify-between items-end mb-6">
                  <h2 className="text-2xl font-bold text-text-primary font-serif">Thông Tin Liên Hệ</h2>
                  <p className="text-xs text-text-secondary">Đã có tài khoản? <Link href="/login" className="text-primary-rose hover:underline font-bold">Đăng nhập</Link></p>
                </div>
                <input required type="email" placeholder="Địa chỉ email" className="w-full rounded-xl border border-nude/60 bg-surface py-3.5 px-4 outline-none focus:border-primary-rose transition text-sm" />
              </section>

              {/* Delivery section */}
              <section>
                <h2 className="text-2xl font-bold text-text-primary mb-6 font-serif flex items-center gap-2"><MapPin className="h-5 w-5 text-[#065F46]" /> Địa Chỉ Giao Hàng</h2>
                <div className="grid grid-cols-2 gap-4">
                  <input required type="text" placeholder="Họ và tên đệm" className="col-span-1 w-full rounded-xl border border-nude/60 bg-surface py-3.5 px-4 outline-none focus:border-primary-rose transition text-sm" />
                  <input required type="text" placeholder="Tên" className="col-span-1 w-full rounded-xl border border-nude/60 bg-surface py-3.5 px-4 outline-none focus:border-primary-rose transition text-sm" />
                  <input required type="text" placeholder="Địa chỉ nhà, tên đường" className="col-span-2 w-full rounded-xl border border-nude/60 bg-surface py-3.5 px-4 outline-none focus:border-primary-rose transition text-sm" />
                  <input type="text" placeholder="Tòa nhà, số phòng (tùy chọn)" className="col-span-2 w-full rounded-xl border border-nude/60 bg-surface py-3.5 px-4 outline-none focus:border-primary-rose transition text-sm" />
                  <input required type="text" placeholder="Thành phố / Tỉnh" className="col-span-2 sm:col-span-1 w-full rounded-xl border border-nude/60 bg-surface py-3.5 px-4 outline-none focus:border-primary-rose transition text-sm" />
                  <input required type="text" placeholder="Quận / Huyện" className="col-span-2 sm:col-span-1 w-full rounded-xl border border-nude/60 bg-surface py-3.5 px-4 outline-none focus:border-primary-rose transition text-sm" />
                  <input required type="tel" placeholder="Số điện thoại nhận hàng" className="col-span-2 w-full rounded-xl border border-nude/60 bg-surface py-3.5 px-4 outline-none focus:border-primary-rose transition text-sm" />
                </div>
              </section>

              {/* Shipping Method */}
              <section>
                <h2 className="text-2xl font-bold text-text-primary mb-6 font-serif flex items-center gap-2"><Truck className="h-5 w-5 text-[#065F46]" /> Phương Thức Vận Chuyển</h2>
                <div className="border border-[#065F46] bg-emerald-50/50 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-text-primary text-sm">Giao Hàng Tiêu Chuẩn</p>
                    <p className="text-text-secondary text-xs mt-1">2-3 ngày làm việc (Giao hỏa tốc 2H trong nội thành)</p>
                  </div>
                  <span className="font-bold text-[#065F46] text-sm">{shipping === 0 ? "Miễn phí" : formatPrice(shipping)}</span>
                </div>
              </section>

              {/* Payment section */}
              <section>
                <h2 className="text-2xl font-bold text-text-primary mb-6 font-serif flex items-center gap-2"><CreditCard className="h-5 w-5 text-[#065F46]" /> Phương Thức Thanh Toán</h2>
                <p className="text-xs text-text-secondary mb-4">Tất cả giao dịch đều được mã hóa SSL an toàn 100%.</p>
                <div className="border border-nude/60 rounded-2xl bg-surface overflow-hidden">
                  <div className="p-4 border-b border-nude/60 flex items-center gap-3 bg-pink-50/20">
                    <input type="radio" id="cod" name="payment" defaultChecked className="w-4 h-4 accent-primary-rose cursor-pointer" />
                    <label htmlFor="cod" className="font-bold text-text-primary text-sm cursor-pointer">Thanh toán khi nhận hàng (COD)</label>
                  </div>
                  <div className="p-5 text-xs text-text-secondary bg-surface">
                    Quý khách có thể kiểm tra hàng trước khi thanh toán tiền mặt cho nhân viên giao hàng.
                  </div>
                </div>
              </section>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full flex items-center justify-center rounded-full bg-text-primary py-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-primary-rose transition shadow-md disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang xử lý đơn hàng...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Đặt Hàng Ngay
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl bg-white border border-[#F3E5E8] p-6 sm:p-8 sticky top-8 shadow-sm">
              <h2 className="text-lg font-bold text-text-primary mb-6 hidden lg:block font-serif">Đơn Hàng Của Bạn</h2>
              
              <div className="space-y-4 mb-6 pb-6 border-b border-nude/40">
                {items.map(item => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-white shrink-0 border border-nude/30">
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                      <span className="absolute -top-1 -right-1 bg-text-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center z-10">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-text-primary text-xs truncate">{item.name}</h3>
                      {item.variant && <p className="text-[11px] text-text-secondary truncate">{item.variant}</p>}
                    </div>
                    <p className="font-bold text-[#065F46] text-xs">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-xs text-text-secondary mb-6 pb-6 border-b border-nude/40">
                <div className="flex justify-between">
                  <span>Tạm tính</span>
                  <span className="text-text-primary font-bold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển</span>
                  <span className="text-text-primary font-bold">{shipping === 0 ? "Miễn phí" : formatPrice(shipping)}</span>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <span className="text-base font-bold text-text-primary font-serif">Tổng Cộng</span>
                <span className="text-2xl font-bold text-[#065F46]">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
