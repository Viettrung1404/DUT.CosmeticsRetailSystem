import http from "node:http";
import https from "node:https";
import net from "node:net";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { inspectProductionBuild } from "./production-build.mjs";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const certPath = fileURLToPath(new URL("../certificates/localhost.pem", import.meta.url));
const keyPath = fileURLToPath(new URL("../certificates/localhost-key.pem", import.meta.url));
const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
nextEnv.loadEnvConfig(rootDir, false);

const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || "3001", 10);
const INTERNAL_PORT = parseInt(process.env.INTERNAL_PORT || "3002", 10);

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error("Không tìm thấy chứng chỉ HTTPS tại frontend/certificates/localhost.pem");
  process.exit(1);
}

let build;
try {
  build = inspectProductionBuild(rootDir, process.env.NEXT_DIST_DIR || ".next");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

// Khởi chạy Next.js production server ở cổng nội bộ
let child;
let isShuttingDown = false;

function startNextChild() {
  child = spawn(
    process.execPath,
    [nextBin, "start", "--port", String(INTERNAL_PORT)],
    {
      cwd: rootDir,
      stdio: ["ignore", "inherit", "inherit"],
      windowsHide: true,
      env: {
        ...process.env,
        PORT: String(INTERNAL_PORT),
        SITE_URL: `https://localhost:${HTTPS_PORT}`,
      },
    }
  );

  child.on("error", (err) => {
    console.error("Không thể khởi động Next production server:", err);
    shutdown(1);
  });

  child.on("exit", (code) => {
    if (isShuttingDown) return;
    console.error(`Next.js production server đã thoát (mã ${code ?? "signal"}). Kiểm tra build/cổng trước khi khởi động lại.`);
    shutdown(code || 1);
  });
}

// Proxy HTTPS (port 3001) -> Next.js HTTP (port 3002)
const server = https.createServer(
  {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  },
  (req, res) => {
    const options = {
      hostname: "127.0.0.1",
      port: INTERNAL_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${HTTPS_PORT}`,
        "x-forwarded-proto": "https",
        "x-forwarded-host": `localhost:${HTTPS_PORT}`,
        "x-forwarded-port": String(HTTPS_PORT),
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      const headers = { ...proxyRes.headers };
      if (headers.location) {
        headers.location = headers.location
          .replace(`http://localhost:${INTERNAL_PORT}`, `https://localhost:${HTTPS_PORT}`)
          .replace(`http://127.0.0.1:${INTERNAL_PORT}`, `https://localhost:${HTTPS_PORT}`);
      }
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on("error", () => {
      if (!res.headersSent) {
        res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Next.js server đang khởi động, vui lòng thử lại sau vài giây...");
      }
    });

    req.pipe(proxyReq, { end: true });
  }
);

server.on("upgrade", (req, socket) => {
  const proxyReq = http.request({
    hostname: "127.0.0.1",
    port: INTERNAL_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  });

  proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
    socket.write(
      `HTTP/${proxyRes.httpVersion} ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n` +
        Object.entries(proxyRes.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\r\n") +
        "\r\n\r\n"
    );
    if (proxyHead && proxyHead.length) socket.write(proxyHead);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxyReq.on("error", () => socket.destroy());
  proxyReq.end();
});

function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  fs.unwatchFile(build.buildIdPath);
  server.closeAllConnections();
  server.close();
  child?.kill();
  process.exitCode = code;
}

server.on("error", (error) => {
  console.error(`Không thể mở HTTPS port ${HTTPS_PORT}: ${error.message}`);
  shutdown(1);
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => shutdown());

async function waitForNext() {
  const deadline = Date.now() + 30_000;
  while (!isShuttingDown && Date.now() < deadline) {
    const ready = await new Promise((resolve) => {
      const request = http.get(`http://127.0.0.1:${INTERNAL_PORT}/login`, (response) => {
        response.resume();
        resolve(response.statusCode === 200);
      });
      request.setTimeout(1000, () => request.destroy());
      request.on("error", () => resolve(false));
    });
    if (ready && !isShuttingDown) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Next.js chưa sẵn sàng sau 30 giây hoặc đã thoát.");
}

// Stop instead of continuing with loaded modules from an overwritten build.
fs.watchFile(build.buildIdPath, { interval: 1000 }, () => {
  let id;
  try { id = fs.readFileSync(build.buildIdPath, "utf8").trim(); } catch { id = null; }
  if (id !== build.buildId) {
    console.error("Production Build đã thay đổi. Hãy đợi build hoàn tất rồi chạy lại npm run start:https.");
    shutdown(1);
  }
});
function checkPort(port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(port, () => probe.close(resolve));
  });
}
try {
  if (![HTTPS_PORT, INTERNAL_PORT].every((port) => Number.isInteger(port) && port > 0 && port <= 65535) || HTTPS_PORT === INTERNAL_PORT) {
    throw new Error("HTTPS_PORT và INTERNAL_PORT phải là hai cổng hợp lệ, khác nhau.");
  }
  await checkPort(INTERNAL_PORT);
  await checkPort(HTTPS_PORT);
  startNextChild();
  await waitForNext();
  if (!isShuttingDown) server.listen(HTTPS_PORT, () => {
    console.log(`\n> [Production Build] Next.js HTTPS sẵn sàng tại: https://localhost:${HTTPS_PORT}\n`);
  });
} catch (error) {
  if (!isShuttingDown) {
    console.error(error.message);
    shutdown(1);
  }
}
