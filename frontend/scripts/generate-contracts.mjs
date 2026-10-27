import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";

const root = new URL("../", import.meta.url);
const source = new URL("../backend/docs/api/openapi.json", root);
const output = new URL("src/shared/api/generated/openapi.d.ts", root);
const text = await readFile(source, "utf8");
const hash = createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
const generated = `// Generated from backend/docs/api/openapi.json. Do not edit.\n// SHA256: ${hash}\n` + astToString(await openapiTS(JSON.parse(text)));
if (process.argv.includes("--check")) {
  const current = await readFile(output, "utf8").catch(() => "");
  if (current.replace(/\r\n/g, "\n") !== generated.replace(/\r\n/g, "\n")) {
    throw new Error("OpenAPI drift: run npm run contracts:generate and review O02 changes.");
  }
  console.log("OpenAPI types match the backend snapshot.");
} else {
  await mkdir(new URL("src/shared/api/generated/", root), { recursive: true });
  await writeFile(output, generated);
  console.log("Generated OpenAPI types (including currently generic schemas; see O02).");
}
