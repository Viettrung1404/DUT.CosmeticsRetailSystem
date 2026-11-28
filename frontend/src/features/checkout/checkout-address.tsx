"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Home, MapPin, Pencil, Plus, UserRound, X } from "lucide-react";
import { AddressFields, type DeliveryAddress } from "@/features/addresses/address-fields";
import { AddressEditor } from "@/features/addresses/address-editor";
import { type Address } from "@/features/addresses/contracts";
import { formatAddress, isCurrentAddress } from "@/features/addresses/vietnam-divisions";

function AddressPickerDialog({
  addresses,
  selectedId,
  onSelect,
  onEdit,
  onAddNew,
  onClose,
}: {
  addresses: Address[];
  selectedId: string;
  onSelect: (address: Address) => void;
  onEdit: (address: Address) => void;
  onAddNew: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="delivery-dialog checkout-address-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
      aria-labelledby="address-picker-title"
    >
      <div className="delivery-dialog-heading">
        <span className="checkout-section-icon">
          <MapPin size={20} />
        </span>
        <h2 id="address-picker-title">Chọn địa chỉ nhận hàng ({addresses.length})</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Đóng danh sách địa chỉ"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="checkout-address-picker-list" role="radiogroup" aria-label="Sổ địa chỉ">
        {addresses.map((address) => {
          const isSelected = address.id === selectedId;
          return (
            <article
              key={address.id}
              className={`checkout-picker-card ${isSelected ? "is-selected" : ""}`}
            >
              <label>
                <input
                  type="radio"
                  name="picker_delivery_address"
                  checked={isSelected}
                  onChange={() => {
                    onSelect(address);
                    onClose();
                  }}
                />
                <div className="checkout-address-person">
                  <strong>{address.recipientName}</strong>
                  <span>{address.phone}</span>
                  {address.isDefault && <span className="checkout-address-default">Mặc định</span>}
                </div>
                <p>{formatAddress(address)}</p>
                <div className="checkout-address-meta">
                  <span className="checkout-address-label">
                    <Home size={13} />
                    {address.label || "Địa chỉ nhận hàng"}
                  </span>
                  {isSelected && (
                    <span className="checkout-address-selected">
                      <Check size={13} /> Đã chọn
                    </span>
                  )}
                </div>
              </label>
              {!isCurrentAddress(address) && (
                <p className="checkout-address-legacy">
                  Cần cập nhật tỉnh/thành và phường/xã theo địa giới mới.
                </p>
              )}
              <button
                type="button"
                className="checkout-address-edit"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(address);
                }}
              >
                <Pencil size={13} /> Chỉnh sửa
              </button>
            </article>
          );
        })}
      </div>
      <div className="delivery-dialog-actions checkout-picker-actions">
        <button
          type="button"
          className="checkout-text-action"
          disabled={addresses.length >= 10}
          onClick={onAddNew}
        >
          <Plus size={16} /> Thêm địa chỉ mới
        </button>
        <button type="button" className="button secondary" onClick={onClose}>
          Đóng
        </button>
      </div>
    </dialog>
  );
}

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedAddress =
    addresses.find((address) => address.id === selectedId) ??
    addresses.find((address) => address.isDefault) ??
    addresses[0];

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
                ? "Địa chỉ đang chọn từ sổ địa chỉ của bạn"
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
        ) : selectedAddress ? (
          <div className="checkout-address-single">
            <article className="checkout-address-card is-selected is-single">
              <label>
                <input type="radio" name="delivery_address" checked readOnly />
                <div className="checkout-address-person">
                  <strong>{selectedAddress.recipientName}</strong>
                  <span>{selectedAddress.phone}</span>
                  {selectedAddress.isDefault && (
                    <span className="checkout-address-default">Mặc định</span>
                  )}
                </div>
                <p>{formatAddress(selectedAddress)}</p>
                <div className="checkout-address-meta">
                  <span className="checkout-address-label">
                    <Home size={13} />
                    {selectedAddress.label || "Địa chỉ nhận hàng"}
                  </span>
                  <span className="checkout-address-selected">
                    <Check size={13} /> Đã chọn
                  </span>
                </div>
              </label>
              {!isCurrentAddress(selectedAddress) && (
                <p className="checkout-address-legacy">
                  Cần cập nhật tỉnh/thành và phường/xã theo địa giới mới.
                </p>
              )}
              <div className="checkout-address-actions">
                <button
                  type="button"
                  className="checkout-address-edit"
                  onClick={() => setEditor({ initial: selectedAddress })}
                >
                  <Pencil size={13} /> Chỉnh sửa
                </button>
                <button
                  type="button"
                  className="checkout-address-change"
                  onClick={() => setPickerOpen(true)}
                >
                  Thay đổi
                </button>
              </div>
            </article>
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
      {pickerOpen && selectedAddress && (
        <AddressPickerDialog
          addresses={addresses}
          selectedId={selectedAddress.id}
          onSelect={onSelect}
          onEdit={(address) => {
            setPickerOpen(false);
            setEditor({ initial: address });
          }}
          onAddNew={() => {
            setPickerOpen(false);
            setEditor({});
          }}
          onClose={() => setPickerOpen(false)}
        />
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
