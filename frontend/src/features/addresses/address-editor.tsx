"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, X } from "lucide-react";
import { requestBff } from "@/shared/api/browser";
import { apiErrorMessage } from "@/shared/api/errors";
import { AddressFields, blankDeliveryAddress } from "./address-fields";
import { addressInput, addressSchema, type Address, type AddressInput } from "./contracts";
import { isCurrentAddress } from "./vietnam-divisions";

export function AddressEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Address;
  onClose: () => void;
  onSaved: (address: Address) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const client = useQueryClient();
  const [value, setValue] = useState<AddressInput>(() =>
    initial
      ? {
          label: initial.label ?? "",
          recipientName: initial.recipientName,
          phone: initial.phone,
          addressLine: initial.addressLine,
          city: initial.city,
          ward: initial.ward,
          district: initial.district,
          isDefault: initial.isDefault,
          latitude: initial.latitude,
          longitude: initial.longitude,
        }
      : { ...blankDeliveryAddress, ward: "", district: "", label: "Nhà riêng", isDefault: false },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  async function save() {
    const parsed = addressInput.safeParse({ ...value, district: "" });
    if (!parsed.success || !isCurrentAddress({ ...value, district: "" })) {
      setError("Vui lòng kiểm tra tên, số điện thoại và chọn tỉnh/thành, phường/xã hiện tại.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await requestBff(
        initial ? `/api/account/addresses/${initial.id}` : "/api/account/addresses",
        addressSchema,
        { method: initial ? "PUT" : "POST", body: parsed.data },
      );
      await client.invalidateQueries({ queryKey: ["addresses"] });
      onSaved(saved);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="delivery-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="delivery-dialog-title"
    >
      <div className="delivery-dialog-heading">
        <span className="checkout-section-icon">
          <MapPin size={20} />
        </span>
        <h2 id="delivery-dialog-title">
          {initial ? "Cập nhật địa chỉ nhận hàng" : "Thêm địa chỉ mới"}
        </h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Đóng biểu mẫu địa chỉ"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) void save();
        }}
      >
        <AddressFields
          value={value}
          onChange={(address) =>
            setValue({
              ...value,
              ...address,
              ward: address.ward ?? "",
              district: address.district ?? "",
            })
          }
          prefix="saved-address"
        />
        <label className="delivery-label">
          Nhãn địa chỉ
          <input
            value={value.label ?? ""}
            maxLength={50}
            placeholder="Nhà riêng, Công ty…"
            onChange={(event) => setValue({ ...value, label: event.target.value })}
          />
        </label>
        <label className="delivery-default">
          <input
            type="checkbox"
            disabled={initial?.isDefault}
            checked={value.isDefault}
            onChange={(event) => setValue({ ...value, isDefault: event.target.checked })}
          />{" "}
          Đặt làm địa chỉ mặc định
        </label>
        {error && (
          <p role="alert" className="cart-warning">
            {error}
          </p>
        )}
        <div className="delivery-dialog-actions">
          <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="button" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu và sử dụng địa chỉ"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
