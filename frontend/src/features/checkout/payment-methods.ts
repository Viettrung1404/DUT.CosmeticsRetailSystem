import { z } from "zod";

export const paymentMethodsSchema = z.object({ COD: z.boolean(), SEPAY: z.boolean() });
