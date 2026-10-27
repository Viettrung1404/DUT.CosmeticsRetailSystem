// Contract fixture only: this is not proof that the real Nest backend is ready.
import { createServer } from "node:http";

createServer((request, response) => {
  if (request.method !== "GET" || request.url !== "/api/v1/health/live") {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify({ statusCode: 200, success: true, message: "OK", data: { status: "ok" }, timestamp: new Date().toISOString() }));
}).listen(3100, "127.0.0.1");
