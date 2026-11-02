import { mkdir, writeFile } from "node:fs/promises";

const source = "https://tinhthanhpho.com/data/";
const load = async (name) => {
  const response = await fetch(`${source}${name}.json`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Cannot load ${name}: ${response.status}`);
  return response.json();
};
const [provinces, wards] = await Promise.all([load("provinces"), load("wards")]);
if (provinces.data.length !== 34 || wards.data.length < 3300)
  throw new Error("Unexpected administrative dataset; review before updating.");
const division = (row) => ({
  code: row.code,
  name: `${row.type} ${row.name}`,
  latitude: Number(row.centroid_lat),
  longitude: Number(row.centroid_lng),
});
const data = {
  version: provinces.metadata.data_version,
  updatedAt: provinces.metadata.generated_at,
  source: "https://tinhthanhpho.com/en/api-docs#open-data",
  license: "CC BY 4.0",
  provinces: provinces.data.map((province) => ({
    ...division(province),
    wards: wards.data.filter((ward) => ward.province_code === province.code).map(division),
  })),
};
if (data.provinces.flatMap((province) => province.wards).length !== wards.data.length)
  throw new Error("Unmatched ward/province codes.");
const dir = new URL("../src/features/addresses/data/", import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(new URL("vietnam-divisions.json", dir), `${JSON.stringify(data)}\n`);
console.log(
  `Updated ${data.provinces.length} provinces and ${wards.data.length} wards (${data.version}).`,
);
