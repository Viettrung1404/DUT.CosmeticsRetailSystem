import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const certPath = fileURLToPath(new URL("../certificates/localhost.pem", import.meta.url));
const keyPath = fileURLToPath(new URL("../certificates/localhost-key.pem", import.meta.url));
const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));

const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || "3001", 10);
const INTERNAL_PORT = parseInt(process.env.INTERNAL_PORT || "3002", 10);

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error("Không tìm thấy chứng chỉ HTTPS tại frontend/certificates/localhost.pem");
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
  });

  child.on("exit", (code) => {
    if (isShuttingDown) return;
    if (code !== 0 && code !== null) {
      console.warn(`Next.js production server đã thoát với mã: ${code}. Đang tự động khởi động lại sau 1s...`);
    }
    setTimeout(startNextChild, 1000);
  });
}

startNextChild();

process.on("SIGINT", () => {
  isShuttingDown = true;
  child?.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  isShuttingDown = true;
  child?.kill();
  process.exit(0);
});

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

server.on("upgrade", (req, socket, head) => {
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

server.listen(HTTPS_PORT, () => {
  console.log(`\n> [Production Build] Next.js HTTPS sẵn sàng tại: https://localhost:${HTTPS_PORT}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
    server.close();
    process.exit(0);
  });
}
