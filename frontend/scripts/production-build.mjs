import fs from "node:fs";
import path from "node:path";

// Validate emitted Turbopack references without executing application modules.
export function inspectProductionBuild(rootDir, distDir = ".next") {
  const directory = path.resolve(rootDir, distDir);
  const buildIdPath = path.join(directory, "BUILD_ID");
  if (!fs.existsSync(buildIdPath) || !fs.readFileSync(buildIdPath, "utf8").trim()) {
    throw new Error(`Không có Production Build tại ${directory}. Hãy chạy npm run build trước.`);
  }
  const buildId = fs.readFileSync(buildIdPath, "utf8").trim();
  const serverDir = path.join(directory, "server");
  if (!fs.existsSync(path.join(serverDir, "app-paths-manifest.json"))) {
    throw new Error(`Production Build thiếu app-paths-manifest.json tại ${directory}. Hãy build lại.`);
  }
  const missing = new Set();
  function visit(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const filename = path.join(folder, entry.name);
      if (entry.isDirectory()) visit(filename);
      else if (entry.isFile() && entry.name.endsWith(".js")) {
        const source = fs.readFileSync(filename, "utf8");
        for (const [chunk] of source.matchAll(/server\/chunks\/[^"'`\s]+?\.js/g)) {
          if (!fs.existsSync(path.join(directory, chunk))) missing.add(chunk);
        }
      }
    }
  }
  visit(serverDir);
  if (missing.size) {
    throw new Error(`Production Build thiếu ${missing.size} chunk: ${[...missing].slice(0, 3).join(", ")}. Dừng server rồi chạy npm run build; không build đè khi server đang chạy.`);
  }
  return { directory, buildIdPath, buildId };
}
