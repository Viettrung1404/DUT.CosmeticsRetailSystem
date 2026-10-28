import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Override SITE_URL for this process only so BFF Origin checks and Secure cookies
// agree with HTTPS, while npm run dev keeps its existing HTTP configuration.
const child = spawn(process.execPath, [fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url)), "dev", "--port", "3001", "--experimental-https"], {
  stdio: "inherit",
  windowsHide: true,
  env: { ...process.env, SITE_URL: "https://localhost:3001" },
});
child.on("error", () => { console.error("Không thể khởi động Next HTTPS."); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
