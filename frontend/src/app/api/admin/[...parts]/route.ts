import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/shared/config/env";
import { authRuntime, sessionId } from "@/shared/auth/server";
import { ApiError } from "@/shared/api/errors";
import { ALLOWED_STAFF_ROLES } from "@/shared/auth/roles";

export const runtime = "nodejs";

async function handleProxy(request: NextRequest, { params }: { params: Promise<{ parts: string[] }> }) {
  try {
    const { parts } = await params;
    const targetSubPath = parts.join("/");

    // 1. Lấy session id và access token
    let sid: string;
    try {
      sid = await sessionId();
    } catch {
      return NextResponse.json(
        { message: "Phiên đăng nhập đã hết hạn hoặc không tồn tại (401 Unauthorized)." },
        { status: 401 }
      );
    }

    const { broker } = authRuntime();
    const session = await broker.session(sid);

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { message: "Phiên làm việc không có token hợp lệ." },
        { status: 401 }
      );
    }

    // 2. Kiểm tra RBAC (Customer không được gọi Admin API)
    const userRole = (session.user?.roleName || (session.user as { role?: string })?.role || "").toUpperCase();
    if (userRole === "CUSTOMER" || (userRole && !ALLOWED_STAFF_ROLES.includes(userRole as (typeof ALLOWED_STAFF_ROLES)[number]))) {
      return NextResponse.json(
        { message: "Tài khoản của bạn không có quyền truy cập chức năng quản trị (403 Forbidden)." },
        { status: 403 }
      );
    }

    // 3. Xây dựng URL upstream đến Backend
    const env = getServerEnv();
    const baseApi = env.BACKEND_API_BASE_URL.replace(/\/$/, "");
    const search = request.nextUrl.search || "";
    const backendUrl = `${baseApi}/admin/${targetSubPath}${search}`;

    // 4. Chuẩn bị headers chuyển tiếp (kèm x-store-id từ client)
    const storeScope = request.headers.get("x-store-id");
    const forwardHeaders: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
      "X-Request-Id": crypto.randomUUID(),
    };

    if (storeScope) {
      forwardHeaders["x-store-id"] = storeScope;
    }

    const contentType = request.headers.get("content-type");
    let body: BodyInit | undefined = undefined;

    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      if (contentType?.includes("application/json")) {
        forwardHeaders["Content-Type"] = "application/json";
        body = await request.text();
      } else if (contentType) {
        forwardHeaders["Content-Type"] = contentType;
        body = await request.arrayBuffer();
      }
    }

    // 5. Gửi request sang Backend với timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.BACKEND_TIMEOUT_MS || 10000);

    try {
      const upstreamRes = await fetch(backendUrl, {
        method: request.method,
        headers: forwardHeaders,
        body,
        signal: controller.signal,
      });

      const responseText = await upstreamRes.text();
      let responseData: unknown;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      return NextResponse.json(responseData, {
        status: upstreamRes.status,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Lỗi giao tiếp với Backend Gateway.";
    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
