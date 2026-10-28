export function canAcceptQuote(
  value: {
    returnType: string;
    status: string;
    quoteSnapshot: unknown;
    quoteExpiresAt: string | null;
    settlement: unknown;
  },
  now: number,
): boolean {
  return (
    value.returnType === "EXCHANGE" &&
    value.status === "INSPECTED" &&
    value.quoteSnapshot != null &&
    value.settlement == null &&
    value.quoteExpiresAt != null &&
    Number.isFinite(new Date(value.quoteExpiresAt).getTime()) &&
    new Date(value.quoteExpiresAt).getTime() > now
  );
}
