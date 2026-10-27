"use client";
import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, X } from "lucide-react";
import { z } from "zod";
import { requestBff } from "@/shared/api/browser";
import { FormField } from "@/shared/ui/form-field";
import { authMessage } from "@/features/authentication/client";
import { addressInput, addressesSchema, type Address, type AddressInput } from "./contracts";
import { useHydrated } from "@/shared/lib/use-hydrated";

async function addressRequest(path = "", method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET", body?: unknown, signal?: AbortSignal) {
  return requestBff(`/api/account/addresses${path}`, z.unknown(), { method, body, signal });
}
const blank: AddressInput = { label: "", recipientName: "", phone: "", addressLine: "", city: "", district: "", ward: "", isDefault: false };
export function AddressBook({ initial, userId }: { initial: Address[]; userId: string }) {
  const hydrated = useHydrated();
  const queryClient = useQueryClient(); const key = ["addresses", userId];
  const { data = initial, error: loadError } = useQuery({ queryKey: key, queryFn: async ({ signal }) => addressesSchema.parse(await addressRequest("", "GET", undefined, signal)), initialData: initial });
  const dialog = useRef<HTMLDialogElement>(null); const [open, setOpen] = useState(false); const [editing, setEditing] = useState<string | null>(null); const [message, setMessage] = useState("");
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<AddressInput>({ defaultValues: blank });
  useEffect(() => { if (open) { dialog.current?.showModal(); document.body.style.overflow = "hidden"; } else { dialog.current?.close(); document.body.style.overflow = ""; } return () => { document.body.style.overflow = ""; }; }, [open]);
  const mutation = useMutation({ mutationFn: async ({ path, method, body }: { path: string; method: "POST" | "PUT" | "PATCH" | "DELETE"; body: unknown }) => addressRequest(path, method, body), onSuccess: async () => { setOpen(false); setMessage("Đã cập nhật sổ địa chỉ."); await queryClient.invalidateQueries({ queryKey: key }); }, onError: (error) => setMessage(authMessage(error)) });
  const edit = (address?: Address) => { setEditing(address?.id ?? null); reset(address ? { label: address.label ?? "", recipientName: address.recipientName, phone: address.phone, addressLine: address.addressLine, city: address.city, district: address.district, ward: address.ward, isDefault: address.isDefault } : blank); setMessage(""); setOpen(true); };
  function save(values: AddressInput) {
    const parsed = addressInput.safeParse(values);
    if (!parsed.success) { for (const issue of parsed.error.issues) setError(issue.path[0] as keyof AddressInput, { message: issue.message }, { shouldFocus: true }); return; }
    mutation.mutate({ path: editing ? `/${editing}` : "", method: editing ? "PUT" : "POST", body: parsed.data });
  }
  return <><section className="panel panel-heading"><div><h1>Sổ địa chỉ của tôi <small className="muted">{data.length}/10</small></h1><p className="muted">Quản lý địa chỉ giao hàng của bạn (tối đa 10 địa chỉ).</p></div><button className="button" disabled={!hydrated || data.length >= 10} onClick={() => edit()}><Plus size={18}/> Thêm địa chỉ mới</button></section>
    {!open && (message || loadError) && <p role="status" className="notice">{loadError ? authMessage(loadError) : message}</p>}
    {data.length ? <div className="address-grid">{data.map((address) => <article key={address.id} className={`address-card ${address.isDefault ? "is-default" : ""}`}><div className="address-label"><span><MapPin size={14} className="inline"/> {address.label || "Địa chỉ nhận hàng"}</span>{address.isDefault && <strong>Mặc định</strong>}</div><strong>{address.recipientName}</strong><p>{address.phone}</p><p>{[address.addressLine, address.ward, address.district, address.city].join(", ")}</p><div className="address-actions">{!address.isDefault && <button className="text-button" disabled={!hydrated || mutation.isPending} onClick={() => mutation.mutate({ path: `/${address.id}/default`, method: "PATCH", body: {} })}>Đặt làm mặc định</button>}<button className="text-button" disabled={!hydrated || mutation.isPending} onClick={() => edit(address)}>Chỉnh sửa</button><button className="text-button" disabled={!hydrated || mutation.isPending} onClick={() => { if (window.confirm("Bạn muốn xóa địa chỉ này?")) mutation.mutate({ path: `/${address.id}`, method: "DELETE", body: {} }); }}>Xóa</button></div></article>)}</div> : <section className="empty-state"><MapPin className="mx-auto mb-4 text-action" size={36}/><h2>Chưa có địa chỉ nhận hàng</h2><p>Thêm địa chỉ đầu tiên để chuẩn bị cho lần mua sắm tiếp theo.</p><button className="button secondary" disabled={!hydrated} onClick={() => edit()}>Thêm địa chỉ</button></section>}
    <dialog ref={dialog} className="address-dialog" aria-labelledby="address-dialog-title" onCancel={(event) => { if (mutation.isPending) event.preventDefault(); else setOpen(false); }}><div className="dialog-heading"><h2 id="address-dialog-title">{editing ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}</h2><button className="icon-button" aria-label="Đóng biểu mẫu" disabled={!hydrated || mutation.isPending} onClick={() => setOpen(false)}><X/></button></div>
      {message && <p role="alert" className="notice">{message}</p>}<form method="post" onSubmit={(event) => { void handleSubmit(save)(event); }} noValidate><div className="form-grid"><FormField id="recipientName" label="Tên người nhận" autoComplete="name" required error={errors.recipientName?.message} {...register("recipientName")}/><FormField id="addressPhone" label="Số điện thoại" type="tel" autoComplete="tel" required error={errors.phone?.message} {...register("phone")}/></div><FormField id="addressLine" label="Địa chỉ cụ thể (số nhà, tên đường)" autoComplete="address-line1" required error={errors.addressLine?.message} {...register("addressLine")}/><div className="form-grid"><FormField id="city" label="Tỉnh / Thành phố" autoComplete="address-level1" required error={errors.city?.message} {...register("city")}/><FormField id="district" label="Quận / Huyện" autoComplete="address-level2" required error={errors.district?.message} {...register("district")}/><FormField id="ward" label="Phường / Xã" autoComplete="address-level3" required error={errors.ward?.message} {...register("ward")}/><FormField id="label" label="Nhãn địa chỉ (không bắt buộc)" placeholder="Nhà riêng, Công ty…" error={errors.label?.message} {...register("label")}/></div><label className="form-check"><input type="checkbox" {...register("isDefault")}/>Đặt làm địa chỉ giao hàng mặc định</label><div className="form-actions"><button type="button" className="button secondary" disabled={!hydrated || mutation.isPending} onClick={() => setOpen(false)}>Hủy</button><button className="button" disabled={!hydrated || mutation.isPending}>{mutation.isPending ? "Đang lưu…" : "Lưu địa chỉ"}</button></div></form></dialog></>;
}
