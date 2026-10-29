import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const origin = process.env.FE_ACCEPT_ORIGIN ?? "http://localhost:3001";
const email = process.env.FE_ACCEPT_EMAIL ?? "customer-20@demo.glowup.test";
const credentials = JSON.parse(
  await readFile(resolve(root, "backend/.demo-data/credentials.json"), "utf8"),
);
const catalog = JSON.parse(
  await readFile(resolve(root, "backend/.demo-data/catalog-before-enrichment.json"), "utf8"),
);
const variantId = catalog.products.find((product) => product.variants?.length)?.variants[0]?.id;
if (!credentials[email] || !variantId) throw new Error("Demo credentials or variant unavailable");

let cookie = "";
async function request(path, method = "GET", body) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body ? { "content-type": "application/json", origin } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  if (response.headers.has("set-cookie")) cookie = response.headers.get("set-cookie").split(";")[0];
  const data = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${data.code ?? ""}`);
  return { status: response.status, data };
}

await request("/api/auth/login", "POST", { email, password: credentials[email].password });
const [{ data: addresses }, { data: quote }] = await Promise.all([
  request("/api/account/addresses"),
  request("/api/checkout/preview", "POST", { items: [{ variantId, quantity: 1 }] }),
]);
const selected = addresses.find((address) => address.isDefault) ?? addresses[0];
if (!selected) throw new Error("Demo customer has no address");
const shippingAddress = Object.fromEntries(
  ["recipientName", "phone", "addressLine", "ward", "district", "city"]
    .filter((field) => selected[field] != null)
    .map((field) => [field, selected[field]]),
);
let orderId;
try {
  const { status, data } = await request("/api/checkout/order", "POST", {
    items: [{ variantId, quantity: 1 }],
    quoteVersion: quote.quoteVersion,
    shippingAddress,
    paymentMethod: "COD",
    idempotencyKey: crypto.randomUUID(),
  });
  orderId = data.id;
  console.log(JSON.stringify({ step: "COD order", status, orderId, orderStatus: data.status }));
  const detail = await request(`/api/account/orders/${orderId}`);
  console.log(
    JSON.stringify({
      step: "order detail",
      status: detail.status,
      orderStatus: detail.data.status,
    }),
  );
} finally {
  if (orderId) {
    const cancelled = await request(`/api/account/orders/${orderId}`, "PUT", {
      reason: "Nghiệm thu FE-03: hủy đơn thử sau khi tạo",
    });
    console.log(
      JSON.stringify({
        step: "cancel test order",
        status: cancelled.status,
        orderStatus: cancelled.data.status,
      }),
    );
  }
}
