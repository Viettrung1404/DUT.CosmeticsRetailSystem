"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Check, Clock3, Copy, FlaskConical, QrCode, ShieldCheck } from "lucide-react";
import { parseSepayTransfer } from "./sepay-transfer";
import { formatPrice } from "@/features/catalog/components";

export function SepayQr({
  raw,
  expiresAt,
}: {
  raw: string | null | undefined;
  expiresAt?: string | null;
}) {
  const transfer = parseSepayTransfer(raw);
  const [now, setNow] = useState(() => Date.now());
  const [copyStatus, setCopyStatus] = useState("");
  const [copied, setCopied] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [imageRetry, setImageRetry] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!transfer || !expiresAt || !Number.isFinite(Date.parse(expiresAt)))
    return (
      <p role="status">
        Chưa tải được hướng dẫn chuyển khoản. Vui lòng tra cứu lại trước khi thanh toán.
      </p>
    );
  const remaining = Math.max(0, Math.floor((Date.parse(expiresAt) - now) / 1000));
  if (!remaining)
    return (
      <p role="status" className="sepay-notice">
        Đã hết thời gian thanh toán. Vui lòng kiểm tra đơn hàng trước khi chuyển tiền.
      </p>
    );
  const sandbox = transfer.mode === "sandbox";
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setCopyStatus(`Đã sao chép ${label.toLowerCase()}.`);
    } catch {
      setCopyStatus("Không thể sao chép tự động. Bạn có thể chọn và sao chép thông tin bên dưới.");
    }
  }
  const fields = [
    { label: "Ngân hàng", value: transfer.bank },
    { label: "Chủ tài khoản", value: transfer.accountName },
    { label: "Số tài khoản", value: transfer.accountNumber, copyable: true },
    {
      label: "Số tiền",
      value: formatPrice(transfer.amount),
      copyValue: String(transfer.amount),
      copyable: true,
    },
    { label: "Nội dung chuyển khoản", value: transfer.content, copyable: true },
  ];
  return (
    <section className="sepay-transfer" aria-label="Chuyển khoản SePay">
      <header className="sepay-heading">
        <div>
          <span>GLOWUP / SEPAY</span>
          <h2>Thanh toán chuyển khoản</h2>
        </div>
        <span className="sepay-countdown" aria-label="Thời gian thanh toán còn lại">
          <Clock3 size={16} aria-hidden="true" />
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
        </span>
      </header>
      {sandbox && (
        <p className="sepay-notice" role="status">
          <FlaskConical size={18} aria-hidden="true" />
          Chế độ thử nghiệm — không chuyển tiền thật. Mô phỏng giao dịch trong SePay Test mode bằng
          thông tin bên dưới.
        </p>
      )}
      <div className="sepay-grid">
        <div className="sepay-qr-panel">
          <h3>{sandbox ? "Mã VietQR thử nghiệm" : "Quét mã bằng ứng dụng ngân hàng"}</h3>
          <div className="sepay-qr-frame">
            {imageFailed ? (
              <div className="sepay-qr-placeholder">
                <QrCode size={48} aria-hidden="true" />
                <p>Chưa tải được mã QR. Bạn có thể chuyển khoản theo thông tin bên cạnh.</p>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setImageRetry((value) => value + 1);
                    setImageFailed(false);
                  }}
                >
                  Tải lại QR
                </button>
              </div>
            ) : (
              <Image
                key={`${transfer.imageUrl}-${imageRetry}`}
                unoptimized
                loading="eager"
                src={transfer.imageUrl}
                width={300}
                height={360}
                alt={
                  sandbox
                    ? "Mã VietQR thử nghiệm SePay"
                    : "Mã VietQR chuyển khoản thanh toán đơn hàng"
                }
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
              />
            )}
          </div>
          <p>
            {sandbox
              ? "Dùng chức năng Mô phỏng giao dịch trên SePay Test mode. Không quét bằng ứng dụng ngân hàng thật."
              : "Mở ứng dụng ngân hàng → Quét QR → Kiểm tra và xác nhận chuyển khoản."}
          </p>
          {sandbox && (
            <a
              className="button secondary"
              href="https://my.sepay.vn"
              target="_blank"
              rel="noreferrer"
            >
              Mở dashboard SePay
            </a>
          )}
        </div>
        <div className="sepay-details">
          <h3>Thông tin chuyển khoản{sandbox ? " thử nghiệm" : ""}</h3>
          <dl>
            {fields.map((field) => (
              <div className="sepay-detail" key={field.label}>
                <dt>{field.label}</dt>
                <dd>
                  <strong
                    className={
                      field.label === "Nội dung chuyển khoản" ? "sepay-reference" : undefined
                    }
                  >
                    {field.value}
                  </strong>
                  {field.copyable && (
                    <button
                      type="button"
                      className="sepay-copy"
                      aria-label={`Sao chép ${field.label.toLowerCase()}`}
                      onClick={() => void copy(field.copyValue ?? field.value, field.label)}
                    >
                      {copied === field.label ? (
                        <Check size={16} aria-hidden="true" />
                      ) : (
                        <Copy size={16} aria-hidden="true" />
                      )}
                    </button>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="sepay-copy-status" role="status">
            {copyStatus}
          </p>
          <p className="sepay-instruction">
            Giữ nguyên <strong>số tiền</strong> và <strong>nội dung chuyển khoản</strong> để hệ
            thống nhận diện đúng đơn hàng.
          </p>
        </div>
      </div>
      <footer className="sepay-waiting">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>
          Trang tự cập nhật khi hệ thống xác nhận tiền về. Nếu đã chuyển khoản, vui lòng chờ và
          không thanh toán thêm.
        </p>
      </footer>
    </section>
  );
}
