import { z } from "zod";

const transferSchema = z.object({
  bank: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  amount: z.number().int().positive(),
  content: z.string().regex(/^GU[A-F0-9]{32}$/),
  mode: z.enum(["sandbox", "live"]),
});

export function parseSepayTransfer(raw: string | null | undefined) {
  try {
    const result = transferSchema.safeParse(JSON.parse(raw || "null"));
    if (!result.success) return null;
    const data = result.data;
    // Build the image URL from validated fields, never render an arbitrary URL from storage.
    const image = new URL("https://vietqr.app/img");
    const fields = {
      acc: data.accountNumber,
      bank: data.bank,
      amount: String(data.amount),
      des: data.content,
      holder: data.accountName,
      template: "compact",
    };
    for (const [key, value] of Object.entries(fields)) image.searchParams.set(key, value);
    return { ...data, imageUrl: image.href };
  } catch {
    return null;
  }
}
