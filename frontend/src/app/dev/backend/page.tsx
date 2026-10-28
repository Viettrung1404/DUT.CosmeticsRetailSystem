import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getBackendHealth } from "@/shared/api/server";
import { ApiError, apiErrorMessage } from "@/shared/api/errors";
import { getServerEnv } from "@/shared/config/env";

export default async function BackendDiagnosticPage() {
  await connection();
  if (process.env.NODE_ENV === "production" || getServerEnv().FE_DIAGNOSTICS !== "true") notFound();

  let message: string;
  let connected = false;
  try {
    const health = await getBackendHealth();
    connected = health.data.status === "ok";
    message = "SSR → backend: kết nối thành công.";
  } catch (error) {
    message = apiErrorMessage(error);
    if (error instanceof ApiError) message += ` (${error.code})`;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-3xl font-semibold">Kiểm tra kết nối FE-00</h1>
      <p className="mt-6" data-testid="backend-status" data-connected={connected}>
        {message}
      </p>
      <p className="mt-4 text-muted-foreground">
        Server Component gọi trực tiếp health/live. Kết quả này chỉ xác nhận tiến trình backend,
        không xác nhận database hay provider.
      </p>
    </main>
  );
}
