import { z } from "zod";
const text = (max: number) => z.string().trim().min(1, "Vui lòng điền thông tin này.").max(max);
export const addressInput = z
  .object({
    label: z.string().max(50).optional(),
    recipientName: text(100),
    phone: z
      .string()
      .regex(/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/, "Số điện thoại di động Việt Nam chưa hợp lệ."),
    addressLine: text(255),
    city: text(100),
    district: text(100),
    ward: text(100),
    isDefault: z.boolean(),
  })
  .strict();
export const addressSchema = addressInput
  .omit({ label: true })
  .extend({ id: z.uuid(), label: z.string().nullable().optional() })
  .strip();
export const addressesSchema = z.array(addressSchema);
export type Address = z.infer<typeof addressSchema>;
export type AddressInput = z.infer<typeof addressInput>;
