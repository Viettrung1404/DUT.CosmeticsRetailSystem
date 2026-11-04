"use client";
import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { requestBff } from "@/shared/api/browser";
import { apiErrorMessage } from "@/shared/api/errors";
import { reviewInputSchema, reviewResultSchema } from "./contracts";

export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const input = reviewInputSchema.safeParse({
      productId,
      orderId: undefined,
      rating,
      title: title.trim() || undefined,
      content: content.trim() || undefined,
    });
    if (!input.success) {
      setError("Đánh giá chưa hợp lệ. Vui lòng kiểm tra lại nội dung.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await requestBff("/api/account/commerce/reviews", reviewResultSchema, {
        method: "POST",
        body: {
          productId,
          rating,
          title: title.trim() || undefined,
          content: content.trim() || undefined,
        },
      });
      setDone(true);
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  if (done) {
    return (
      <div className="account-tip" role="status">
        <Check size={20} />
        <p>Đánh giá đã được gửi và đang chờ duyệt. Cảm ơn bạn đã phản hồi!</p>
      </div>
    );
  }
  return (
    <form className="account-form" onSubmit={(event) => void submit(event)}>
      <h3>Viết đánh giá sau mua</h3>
      <p>
        Chỉ tài khoản có đơn đã hoàn thành chứa sản phẩm này mới gửi được đánh giá.{" "}
        <Link href="/account/orders">Xem đơn hàng</Link>
      </p>
      <label>
        Số sao
        <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} sao
            </option>
          ))}
        </select>
      </label>
      <label>
        Tiêu đề
        <input maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        Nội dung
        <textarea
          maxLength={10000}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </label>
      <button className="button" disabled={busy}>
        {busy ? "Đang gửi…" : "Gửi đánh giá"}
      </button>
      {error && (
        <p role="alert" className="cart-warning">
          {error}
        </p>
      )}
    </form>
  );
}
