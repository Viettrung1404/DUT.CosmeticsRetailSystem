import { NextRequest, NextResponse } from "next/server";
import { upstream } from "@/shared/auth/server";
import { z } from "zod";

const trackRequestSchema = z.object({
  orderNumber: z.string().min(1),
  phone: z.string().min(1),
});

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const input = trackRequestSchema.parse(raw);
    const data = await upstream("/guest/orders/track", z.any(), input, undefined, "POST");
    return NextResponse.json(data);
  } catch (err: any) {
    const status = err?.status || err?.statusCode || 404;
    return NextResponse.json(
      { message: err?.message || "Không tìm thấy thông tin đơn hàng phù hợp" },
      { status },
    );
  }
}
