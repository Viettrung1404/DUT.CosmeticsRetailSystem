// Isolated contract fixtures. These never count as staging/provider acceptance.
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
const sessions = new Map();
const books = new Map();
const users = new Map();
const oauthFlows = new Map();
function oauthUser(email) {
  if (!users.has(email)) users.set(email, { id: randomUUID(), email, fullName: "Lan OAuth" });
  return users.get(email);
}
const envelope = (response, data, status = 200) => {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify({ statusCode: status, success: true, message: "OK", data, timestamp: new Date().toISOString() }));
};
const fail = (response, status, code, headers = {}) => { response.writeHead(status, { "Content-Type": "application/json", ...headers }); response.end(JSON.stringify({ code })); };
function issue(user) {
  const accessToken = randomUUID(); const refreshToken = randomUUID();
  sessions.set(accessToken, user); sessions.set(refreshToken, user);
  return { user, accessToken, refreshToken };
}
createServer(async (request, response) => {
  const path = request.url?.replace(/^\/api\/v1/, "");
  if (path === "/health/live") return envelope(response, { status: "ok" });
  const chunks = []; for await (const chunk of request) chunks.push(chunk);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
  if (["/auth/oauth/google", "/auth/oauth/facebook"].includes(path)) {
    const token = body.idToken || body.accessToken || "";
    if (!/^fixture:(google|facebook):(login|verify|link|invalid|offline):provider-token$/.test(token)) return fail(response, 401, "INVALID_PROVIDER_TOKEN");
    if (token.includes(":invalid:")) return fail(response, 401, "INVALID_PROVIDER_TOKEN");
    if (token.includes(":offline:")) return fail(response, 503, "OAUTH_PROVIDER_UNAVAILABLE");
    if (token.includes(":login:")) return envelope(response, issue(oauthUser("oauth@example.com")));
    if (!/^[a-f0-9]{64}$/.test(body.clientNonce)) return fail(response, 400, "MISSING_BINDING");
    const challenge = randomBytes(32).toString("hex");
    const code = token.includes(":link:") ? "ACCOUNT_LINK_REQUIRED" : "EMAIL_VERIFICATION_REQUIRED";
    oauthFlows.set(challenge, { nonce: body.clientNonce, code, expiresAt: Date.now() + 600000 });
    return envelope(response, { code, challenge, expiresIn: 600 });
  }
  if (["/auth/oauth/email", "/auth/oauth/complete", "/auth/oauth/link"].includes(path)) {
    const flow = oauthFlows.get(body.challenge);
    if (!flow || flow.nonce !== body.clientNonce || flow.expiresAt <= Date.now()) return fail(response, 401, "OAUTH_FLOW_EXPIRED");
    if (path === "/auth/oauth/email") { flow.email = body.email; return envelope(response, { message: "SENT" }); }
    if (!flow.email || body.verificationToken !== "e".repeat(64)) return fail(response, 401, "INVALID_EMAIL_PROOF");
    const target = sessions.get(request.headers.authorization?.replace(/^Bearer /, ""));
    if (path === "/auth/oauth/link" && (!target || target.email !== flow.email)) return fail(response, 401, "TARGET_LOGIN_REQUIRED");
    if (flow.code === "ACCOUNT_LINK_REQUIRED" && path !== "/auth/oauth/link") return fail(response, 403, "ACCOUNT_LINK_REQUIRED");
    oauthFlows.delete(body.challenge);
    return envelope(response, issue(target || oauthUser(flow.email)));
  }
  if (path === "/auth/login") {
    if (body.email === "limited@example.com") return fail(response, 429, "RATE_LIMITED", { "Retry-After": "2" });
    if (body.email === "offline@example.com") return fail(response, 503, "SERVICE_UNAVAILABLE");
    if (body.password === "WrongPass2026") return fail(response, 401, "INVALID_CREDENTIALS");
    if (!users.has(body.email)) users.set(body.email, { id: randomUUID(), email: body.email, fullName: body.email.startsWith("b+") || body.email === "b@example.com" ? "Bảo" : "Lan" });
    return envelope(response, issue(users.get(body.email)));
  }
  if (path === "/auth/refresh-token") {
    const user = sessions.get(body.refreshToken);
    if (!user) return fail(response, 401, "REVOKED");
    sessions.delete(body.refreshToken); return envelope(response, issue(user));
  }
  if (path === "/auth/logout") { sessions.delete(body.refreshToken); return envelope(response, { message: "LOGGED_OUT" }); }
  if (["/auth/register", "/auth/verify-email", "/auth/resend-verification", "/auth/forgot-password", "/auth/reset-password"].includes(path)) {
    if (body.token === "expired") return fail(response, 401, "TOKEN_EXPIRED");
    return envelope(response, { message: "DONE" }, path === "/auth/register" ? 201 : 200);
  }
  const user = sessions.get(request.headers.authorization?.replace(/^Bearer /, ""));
  if (!user) return fail(response, 401, "UNAUTHORIZED");
  if (path === "/auth/me") return envelope(response, user);
  if (path === "/cart/merge") return envelope(response, { items: [] });
  if (path?.startsWith("/customers/me/addresses")) {
    const list = books.get(user.id) || []; books.set(user.id, list);
    const id = path.split("/")[4];
    if (request.method === "GET") return envelope(response, list);
    if (request.method === "POST") {
      const address = { ...body, id: randomUUID(), customerId: user.id, createdAt: new Date().toISOString() }; list.push(address);
      return envelope(response, address, 201);
    }
    const index = list.findIndex((address) => address.id === id); if (index === -1) return fail(response, 404, "NOT_FOUND");
    if (request.method === "PUT") { Object.assign(list[index], body); return envelope(response, list[index]); }
    if (request.method === "DELETE") { list.splice(index, 1); return envelope(response, { success: true, message: "DONE" }); }
    if (request.method === "PATCH") { for (const address of list) address.isDefault = address.id === id; return envelope(response, { success: true, message: "DONE" }); }
  }
  fail(response, 404, "NOT_FOUND");
}).listen(3100, "127.0.0.1");
