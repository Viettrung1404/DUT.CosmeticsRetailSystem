import { z } from "zod";
import { ApiError, normalizeApiError } from "./errors";

export interface ApiEnvelope<T> {
  statusCode: number;
  success: true;
  message: string;
  timestamp: string;
  data: T;
}

export async function readApiResponse<T>(
  response: Response,
  dataSchema: z.ZodType<T>,
): Promise<ApiEnvelope<T>> {
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw normalizeApiError(response, body);

  const result = z
    .object({
      statusCode: z.number().int(),
      success: z.literal(true),
      message: z.string(),
      timestamp: z.iso.datetime({ offset: true }),
      data: dataSchema,
    })
    .safeParse(body);

  if (!result.success || result.data.statusCode !== response.status) {
    throw new ApiError(
      502,
      "INVALID_RESPONSE",
      undefined,
      null,
      response.headers.get("x-request-id"),
    );
  }
  // Exactly one envelope. Pagination stays inside data and is endpoint-specific.
  return result.data;
}
