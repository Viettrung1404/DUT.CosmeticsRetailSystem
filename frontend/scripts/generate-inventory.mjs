import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const design = new URL("../docs/4-stitch_design/", root);
const plan = await readFile(new URL("../docs/3-planning/fe/02_screen_inventory.md", root), "utf8");
const rows = plan.split(/\r?\n/).filter((line) => /^\| [SB]\d{2} \|/.test(line));
const screens = rows.map((line) => {
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  const [id, source] = cells;
  const stitch = id.startsWith("S");
  const raw = cells[stitch ? 3 : 2].replaceAll("`", "");
  const kind = id === "S24" ? "overlay" : ["S01", "S30"].includes(id) ? "boundary" : "page";
  const routes = kind !== "page" ? [] : raw.split(";").map((route) => route.trim().split(/[? ]/)[0].replace("<pageSlug>", "[pageSlug]"));
  return {
    id,
    label: stitch ? cells[2] : source,
    source: stitch ? source.match(/\.\.\/\.\.\/4-stitch_design\/([^/]+)\//)?.[1] : "design_1.md",
    kind,
    routes,
    phase: stitch ? cells[5] : "FE-06",
    dependencies: [...new Set(cells[stitch ? 4 : 4].match(/[AGO]\d{2}/g) ?? [])],
    status: "TODO",
  };
});
if (screens.length !== 46 || screens.filter((s) => s.id.startsWith("S")).length !== 41) throw new Error("Screen inventory must contain S01–S41 and B01–B05.");
if (screens.some((s) => !s.source)) throw new Error("Screen source could not be resolved.");

const entries = await readdir(design, { withFileTypes: true }).catch((error) => {
  if (error.code !== "ENOENT" || !process.argv.includes("--check")) throw error;
  console.log("Stitch source is gitignored and absent: checking committed asset manifest only.");
  return null;
});
const assets = [];
for (const entry of (entries ?? []).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
  if (!entry.isDirectory()) continue;
  const folder = new URL(`${entry.name}/`, design);
  const files = await readdir(folder);
  const html = files.includes("code.html") ? await readFile(new URL("code.html", folder), "utf8") : "";
  const urls = [...new Set([...html.matchAll(/(?:src\s*=\s*["']([^"']+)["']|url\(\s*["']?([^\s)'"\t]+)["']?\s*\))/g)].map((match) => match[1] ?? match[2]))].sort();
  const localImages = [];
  for (const name of files.filter((name) => /\.(png|jpe?g|webp|svg)$/i.test(name))) {
    const data = await readFile(new URL(name, folder));
    const png = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    localImages.push({ name, bytes: data.length, ...(png && data.length >= 24 ? { width: data.readUInt32BE(16), height: data.readUInt32BE(20) } : {}) });
  }
  assets.push({
    source: entry.name,
    role: entry.name === "image.png_3" ? "reference-only-do-not-publish" : entry.name.startsWith("image.png_") ? "brand-reference-needs-export" : "design-reference",
    html: files.includes("code.html"),
    images: localImages,
    references: urls,
    review: "Source rights, availability, alt text and optimized export required before publication; no hotlinks approved.",
  });
}
if (!entries) assets.push(...JSON.parse(await readFile(new URL("docs/asset-inventory.json", root), "utf8")));
if (assets.filter((asset) => asset.html && asset.images.some((image) => image.name === "screen.png")).length !== 41) throw new Error("Expected 41 HTML/screenshot pairs.");

const outputs = [
  ["src/shared/config/screen-inventory.json", screens],
  ["docs/asset-inventory.json", assets],
];
for (const [name, data] of outputs) {
  const output = new URL(name, root);
  const text = JSON.stringify(data, null, 2) + "\n";
  if (process.argv.includes("--check")) {
    const current = await readFile(output, "utf8").catch(() => "");
    if (current.replace(/\r\n/g, "\n") !== text) throw new Error(`Inventory drift: run npm run inventory:generate (${name}).`);
  } else {
    await mkdir(new URL("./", output), { recursive: true });
    await writeFile(output, text);
  }
}
console.log(`Inventory verified: ${screens.length} screens, 41 HTML/screenshot pairs, ${assets.reduce((sum, asset) => sum + asset.references.length, 0)} asset references.`);
