"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, Home, MapPin, Pencil, Plus, UserRound } from "lucide-react";
import { AddressFields, type DeliveryAddress } from "@/features/addresses/address-fields";
import { AddressEditor } from "@/features/addresses/address-editor";
import { type Address } from "@/features/addresses/contracts";
import { formatAddress, isCurrentAddress } from "@/features/addresses/vietnam-divisions";

export function CheckoutAddress({
  signedIn,
  addresses,
  selectedId,
  onSelect,
  guestAddress,
  onGuestChange,
  loadError,
  retry,
}: {
  signedIn: boolean;
  addresses: Address[];
  selectedId?: string;
  onSelect: (address: Address) => void;
  guestAddress: DeliveryAddress;
  onGuestChange: (address: DeliveryAddress) => void;
  loadError: boolean;
  retry: () => void;
}) {
  const [editor, setEditor] = useState<{ initial?: Address } | null>(null);
  return (
    <section className="checkout-panel">
      <div className="checkout-panel-heading">
        <div className="checkout-section-title">
          <span className="checkout-section-icon">
            <MapPin size={20} />
          </span>
          <div>
            <h2>Địa chỉ nhận hàng</h2>
            <p>
              {signedIn
                ? "Chọn địa chỉ từ sổ địa chỉ của bạn"
                : "Nhập thông tin để giao hàng đến đúng nơi"}
            </p>
          </div>
        </div>
        {signedIn && (
          <button
            type="button"
            className="checkout-text-action"
            disabled={addresses.length >= 10 || loadError}
            onClick={() => setEditor({})}
          >
            <Plus size={17} /> Thêm địa chỉ mới
          </button>
        )}
      </div>
      {signedIn ? (
        loadError ? (
          <p role="alert" className="cart-warning">
            Chưa tải được sổ địa chỉ.{" "}
            <button type="button" onClick={retry}>
              Tải lại
            </button>
          </p>
        ) : addresses.length ? (
          <div className="checkout-address-cards">
            {addresses.map((address) => (
              <article
                key={address.id}
                className={`checkout-address-card ${selectedId === address.id ? "is-selected" : ""}`}
              >
                <label>
                  <input
                    type="radio"
                    name="delivery_address"
                    checked={selectedId === address.id}
                    onChange={() => onSelect(address)}
                  />
                  <div className="checkout-address-person">
                    <strong>{address.recipientName}</strong>
                    <span>{address.phone}</span>
                  </div>
                  {address.isDefault && <span className="checkout-address-default">Mặc định</span>}
                  <p>{formatAddress(address)}</p>
                  <span className="checkout-address-label">
                    <Home size={13} />
                    {address.label || "Địa chỉ nhận hàng"}
                  </span>
                  {selectedId === address.id && (
                    <span className="checkout-address-selected">
                      <Check size={13} /> Đã chọn
                    </span>
                  )}
                </label>
                {!isCurrentAddress(address) && (
                  <p className="checkout-address-legacy">
                    Cần cập nhật tỉnh/thành và phường/xã theo địa giới mới.
                  </p>
                )}
                <button
                  type="button"
                  className="checkout-address-edit"
                  onClick={() => setEditor({ initial: address })}
                >
                  <Pencil size={13} /> Chỉnh sửa
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="checkout-no-address">
            <MapPin size={30} />
            <strong>Bạn chưa có địa chỉ nhận hàng</strong>
            <p>Thêm địa chỉ đầu tiên để tiếp tục đặt hàng.</p>
            <button type="button" className="button secondary" onClick={() => setEditor({})}>
              <Plus size={16} /> Thêm địa chỉ
            </button>
          </div>
        )
      ) : (
        <>
          <div className="checkout-guest-note">
            <UserRound size={21} />
            <p>
              Bạn đang mua hàng không cần tài khoản.{" "}
              <Link href="/login?returnTo=%2Fcheckout">Đăng nhập</Link> để chọn địa chỉ đã lưu và
              dùng ưu đãi thành viên.
            </p>
          </div>
          <AddressFields value={guestAddress} onChange={onGuestChange} />
        </>
      )}
      {editor && (
        <AddressEditor
          initial={editor.initial}
          onClose={() => setEditor(null)}
          onSaved={(saved) => {
            onSelect(saved);
            setEditor(null);
          }}
        />
      )}
    </section>
  );
}
