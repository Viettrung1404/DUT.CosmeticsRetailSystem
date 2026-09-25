import Image from "next/image";
import Link from "next/link";
import { cartItems } from "@/data/mockCatalog";

export default function CartPage() {
  const items = cartItems;
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Giỏ hàng của bạn</h1>
        <p className="mt-2 text-sm text-gray-500">{items.length} sản phẩm đang chờ bạn thanh toán.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <Image src={item.image} alt={item.name} width={200} height={200} className="h-24 w-24 rounded-2xl object-cover" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">{item.name}</h2>
                <p className="mt-1 text-sm text-gray-500">Số lượng: {item.qty}</p>
                <p className="mt-2 text-sm text-gray-500">Còn {item.stock} sản phẩm</p>
                <p className="mt-2 text-base font-bold text-rose-500">{(item.price * item.qty).toLocaleString("vi-VN")}đ</p>
              </div>
              <button className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-rose-400 hover:text-rose-500">Xóa</button>
            </div>
          ))}
        </div>

        <aside className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">Tóm tắt đơn hàng</h2>
          <div className="mt-6 space-y-3 text-sm text-gray-600">
            <div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toLocaleString("vi-VN")}đ</span></div>
            <div className="flex justify-between"><span>Phí vận chuyển</span><span>0đ</span></div>
            <div className="flex justify-between"><span>Giảm giá</span><span>-45.000đ</span></div>
          </div>
          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between text-lg font-bold text-gray-900">
              <span>Tổng cộng</span>
              <span>{(subtotal - 45000).toLocaleString("vi-VN")}đ</span>
            </div>
          </div>
          <Link href="/products" className="mt-6 block rounded-full border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700 hover:border-rose-400 hover:text-rose-500">
            Tiếp tục mua sắm
          </Link>
          <button className="mt-3 w-full rounded-full bg-rose-500 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-600">
            Tiến hành thanh toán
          </button>
        </aside>
      </div>
    </div>
  );
}
