"use client";
import { useRef, useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, House, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { z } from "zod";
import { requestBff } from "@/shared/api/browser";
import { FormField } from "@/shared/ui/form-field";
import { authMessage } from "@/features/authentication/client";
import { addressInput, addressesSchema, type Address, type AddressInput } from "./contracts";
import { useHydrated } from "@/shared/lib/use-hydrated";
import { AddressFields } from "./address-fields";
import { isCurrentAddress } from "./vietnam-divisions";

async function addressRequest(
  path = "",
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
  signal?: AbortSignal,
) {
  return requestBff(`/api/account/addresses${path}`, z.unknown(), { method, body, signal });
}
const blank: AddressInput = {
  label: "",
  recipientName: "",
  phone: "",
  addressLine: "",
  city: "",
  district: "",
  ward: "",
  isDefault: false,
  latitude: null,
  longitude: null,
};

export function AddressBook({ initial, userId }: { initial: Address[]; userId: string }) {
  const hydrated = useHydrated();
  const queryClient = useQueryClient();
  const key = ["addresses", userId];
  const { data = initial, error: loadError } = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) =>
      addressesSchema.parse(await addressRequest("", "GET", undefined, signal)),
    initialData: initial,
  });
  const editor = useRef<HTMLElement>(null);
  const editTrigger = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    setValue,
    formState: { errors },
  } = useForm<AddressInput>({ defaultValues: blank });
  const values = useWatch({ control });
  useEffect(() => {
    if (open) editor.current?.querySelector("input")?.focus();
    else editTrigger.current?.focus();
  }, [open, editing]);
  const mutation = useMutation({
    mutationFn: async ({
      path,
      method,
      body,
    }: {
      path: string;
      method: "POST" | "PUT" | "PATCH" | "DELETE";
      body: unknown;
    }) => addressRequest(path, method, body),
    onSuccess: async () => {
      setOpen(false);
      setMessage("Đã cập nhật sổ địa chỉ.");
      await queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (error) => setMessage(authMessage(error)),
  });
  const edit = (address?: Address) => {
    editTrigger.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditing(address?.id ?? null);
    reset(
      address
        ? {
            label: address.label ?? "",
            recipientName: address.recipientName,
            phone: address.phone,
            addressLine: address.addressLine,
            city: address.city,
            district: address.district,
            ward: address.ward,
            isDefault: address.isDefault,
            latitude: address.latitude,
            longitude: address.longitude,
          }
        : blank,
    );
    setMessage("");
    setOpen(true);
  };
  function save(values: AddressInput) {
    if (!isCurrentAddress({ ...values, district: "" })) {
      setMessage("Vui lòng chọn tỉnh/thành và phường/xã hiện tại trong danh sách.");
      return;
    }
    const parsed = addressInput.safeParse({ ...values, district: "" });
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        setError(
          issue.path[0] as keyof AddressInput,
          { message: issue.message },
          { shouldFocus: true },
        );
      return;
    }
    mutation.mutate({
      path: editing ? `/${editing}` : "",
      method: editing ? "PUT" : "POST",
      body: parsed.data,
    });
  }
  return (
    <>
      <section className="panel panel-heading">
        <div>
          <h1>
            Sổ địa chỉ của tôi <small>{data.length}/10</small>
          </h1>
          <p className="muted">
            Quản lý các địa chỉ giao hàng để đặt hàng nhanh chóng hơn (Tối đa 10 địa chỉ).
          </p>
        </div>
        <button
          className="button"
          disabled={!hydrated || mutation.isPending || data.length >= 10}
          onClick={() => edit()}
        >
          <MapPin size={17} /> Thêm địa chỉ mới
        </button>
      </section>
      {!open && (message || loadError) && (
        <p role="status" className="notice">
          {loadError ? authMessage(loadError) : message}
        </p>
      )}
      {data.length ? (
        <div className="address-grid">
          {data.map((address) => (
            <article
              key={address.id}
              className={`address-card ${address.isDefault ? "is-default" : ""}`}
            >
              <div className="address-label">
                <span>
                  {address.label?.toLowerCase().includes("công ty") ? (
                    <Building2 size={13} />
                  ) : (
                    <House size={13} />
                  )}{" "}
                  {address.label || "Địa chỉ nhận hàng"}
                </span>
                {address.isDefault && (
                  <strong>
                    <Check size={11} className="inline" /> Mặc định
                  </strong>
                )}
              </div>
              <div className="address-recipient">
                <strong>{address.recipientName}</strong>
                <span>{address.phone}</span>
              </div>
              <p>
                <MapPin size={15} />
                {[address.addressLine, address.ward, address.district, address.city]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <div className="address-actions">
                {!address.isDefault && (
                  <button
                    className="text-button set-default"
                    disabled={!hydrated || mutation.isPending}
                    onClick={() =>
                      mutation.mutate({ path: `/${address.id}/default`, method: "PATCH", body: {} })
                    }
                  >
                    Đặt làm mặc định
                  </button>
                )}
                <button
                  className="text-button"
                  disabled={!hydrated || mutation.isPending}
                  onClick={() => edit(address)}
                >
                  <Pencil size={13} /> Chỉnh sửa
                </button>
                <button
                  className="text-button"
                  disabled={!hydrated || mutation.isPending}
                  onClick={() => {
                    if (window.confirm("Bạn muốn xóa địa chỉ này?"))
                      mutation.mutate({ path: `/${address.id}`, method: "DELETE", body: {} });
                  }}
                >
                  <Trash2 size={13} /> Xóa
                </button>
              </div>
            </article>
          ))}
          {data.length < 10 && (
            <button
              className="address-card address-add-card"
              disabled={!hydrated || mutation.isPending}
              onClick={() => edit()}
            >
              <span className="add-icon">
                <Plus size={25} />
              </span>
              <strong>Thêm địa chỉ giao hàng mới</strong>
              <small>
                Lưu địa chỉ để thuận tiện hơn
                <br />
                trong lần mua sắm tiếp theo.
              </small>
              <span className="address-count">Tạo địa chỉ thứ {data.length + 1} / 10</span>
            </button>
          )}
        </div>
      ) : (
        <section className="empty-state">
          <MapPin className="mx-auto mb-4 text-action" size={36} />
          <h2>Chưa có địa chỉ nhận hàng</h2>
          <p>Thêm địa chỉ đầu tiên để chuẩn bị cho lần mua sắm tiếp theo.</p>
          <button
            className="button secondary"
            disabled={!hydrated || mutation.isPending}
            onClick={() => edit()}
          >
            Thêm địa chỉ
          </button>
        </section>
      )}
      {open && (
        <section
          ref={editor}
          className="panel address-editor"
          aria-labelledby="address-editor-title"
        >
          <div className="dialog-heading">
            <span className="editor-icon">
              <MapPin size={20} />
            </span>
            <h2 id="address-editor-title">{editing ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}</h2>
            <button
              className="icon-button"
              aria-label="Đóng biểu mẫu"
              disabled={!hydrated || mutation.isPending}
              onClick={() => setOpen(false)}
            >
              <X />
            </button>
          </div>
          {message && (
            <p role="alert" className="notice">
              {message}
            </p>
          )}
          <form
            method="post"
            onSubmit={(event) => {
              void handleSubmit(save)(event);
            }}
            noValidate
          >
            <AddressFields
              value={{
                recipientName: values.recipientName ?? "",
                phone: values.phone ?? "",
                city: values.city ?? "",
                ward: values.ward ?? "",
                district: values.district ?? "",
                addressLine: values.addressLine ?? "",
                latitude: values.latitude,
                longitude: values.longitude,
              }}
              onChange={(next) => {
                setValue("recipientName", next.recipientName);
                setValue("phone", next.phone);
                setValue("city", next.city);
                setValue("ward", next.ward ?? "");
                setValue("district", next.district ?? "");
                setValue("addressLine", next.addressLine);
                setValue("latitude", next.latitude ?? null);
                setValue("longitude", next.longitude ?? null);
              }}
              prefix="account-address"
            />
            {Object.values(errors).length > 0 && (
              <p role="alert" className="cart-warning">
                Vui lòng kiểm tra tên, số điện thoại và địa chỉ nhận hàng.
              </p>
            )}
            <FormField
              id="label"
              label="Nhãn địa chỉ (không bắt buộc)"
              placeholder="Nhà riêng, Công ty…"
              error={errors.label?.message}
              {...register("label")}
            />
            <label className="form-check">
              <input type="checkbox" {...register("isDefault")} />
              Đặt làm địa chỉ giao hàng mặc định cho tài khoản này
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                disabled={!hydrated || mutation.isPending}
                onClick={() => setOpen(false)}
              >
                Hủy
              </button>
              <button className="button" disabled={!hydrated || mutation.isPending}>
                <Check size={17} />
                {mutation.isPending ? "Đang lưu…" : "Lưu địa chỉ"}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
