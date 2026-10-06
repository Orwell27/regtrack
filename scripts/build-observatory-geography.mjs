import { mkdir, writeFile, readFile } from "node:fs/promises";
const base = "https://api-features.ign.es/collections/administrativeunit/items";
async function get(params) {
  const url = new URL(base);
  Object.entries({ f: "json", limit: "10000", ...params }).forEach(([k, v]) =>
    url.searchParams.set(k, v),
  );
  const r = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!r.ok) throw Error(`IGN ${r.status}`);
  return r.json();
}
await mkdir(".artifacts/geo", { recursive: true });
let index;
try {
  index = JSON.parse(await readFile(".artifacts/geo/index-raw.json", "utf8"));
} catch {
  index = await get({ skipGeometry: "true" });
}
console.log("index", index.numberMatched, index.numberReturned, [
  ...new Set(index.features.map((f) => f.properties.nationallevelname)),
]);
await mkdir("public/observatorio/geo", { recursive: true });
await writeFile(".artifacts/geo/index-raw.json", JSON.stringify(index));
function identity(p) {
  const c = p.nationalcode;
  const level = p.nationallevelname;
  return level === "Comunidad autónoma"
    ? `r-${c.slice(2, 4)}`
    : level === "Provincia"
      ? `p-${c.slice(4, 6)}`
      : `m-${c.slice(6)}`;
}
const features = index.features.filter(
  (f) =>
    ["Comunidad autónoma", "Provincia", "Municipio"].includes(
      f.properties.nationallevelname,
    ) && Number(f.properties.nationalcode.slice(2, 4)) <= 19,
);
const territories = features.map(({ properties: p }) => ({
  id: identity(p),
  name: p.nameunit,
  level:
    p.nationallevelname === "Municipio"
      ? "municipality"
      : p.nationallevelname === "Provincia"
        ? "province"
        : "region",
  region: `r-${p.nationalcode.slice(2, 4)}`,
  province: `p-${p.nationalcode.slice(4, 6)}`,
  code: p.nationalcode,
}));
if (new Set(territories.map((t) => t.id)).size !== territories.length)
  throw Error("Duplicate territory codes");
await writeFile(
  "public/observatorio/geo/territories.json",
  JSON.stringify(territories),
);
function project([x, y]) {
  return y < 31
    ? [(x + 19) * 34 + 10, (30 - y) * 40 + 626]
    : [(x + 10) * 58, (44.4 - y) * 76];
}
function simplify(points, tolerance) {
  if (points.length <= 4) return points;
  let max = tolerance * tolerance,
    at = 0;
  const a = points[0],
    b = points.at(-1);
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i],
      dx = b[0] - a[0],
      dy = b[1] - a[1];
    const t = Math.max(
      0,
      Math.min(
        1,
        ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1),
      ),
    );
    const d = (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2;
    if (d > max) {
      max = d;
      at = i;
    }
  }
  return at
    ? [
        ...simplify(points.slice(0, at + 1), tolerance).slice(0, -1),
        ...simplify(points.slice(at), tolerance),
      ]
    : [a, b];
}
function shape(f) {
  const polygons =
    f.geometry.type === "Polygon"
      ? [f.geometry.coordinates]
      : f.geometry.coordinates;
  const rings = polygons.flatMap((poly) =>
    poly.map((ring) => {
      const points = ring.map(project);
      const simple = simplify(points, 0.1);
      return simple.length >= 4 ? simple : points.slice(0, 4);
    }),
  );
  const coords = rings.flat();
  const xs = coords.map((p) => p[0]),
    ys = coords.map((p) => p[1]);
  const bounds = [
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs),
    Math.max(...ys),
  ].map((n) => +n.toFixed(2));
  return {
    id: identity(f.properties),
    d: rings
      .map(
        (r) =>
          "M" +
          r.map((p) => p.map((n) => n.toFixed(2)).join(",")).join("L") +
          "Z",
      )
      .join(""),
    bounds,
  };
}
for (const [name, level] of [
  ["regions", "Comunidad autónoma"],
  ["provinces", "Provincia"],
]) {
  const file = `public/observatorio/geo/${name}.json`;
  try {
    await readFile(file);
    console.log("cached", name);
    continue;
  } catch {}
  const data = await get({ nationallevelname: level });
  const selected = data.features.filter(
    (f) => Number(f.properties.nationalcode.slice(2, 4)) <= 19,
  );
  await writeFile(file, JSON.stringify(selected.map(shape)));
  console.log(name, selected.length);
}
const nuts = [
  ...new Set(
    features
      .filter((f) => f.properties.nationallevelname === "Municipio")
      .map((f) => f.properties.codnut3)
      .filter(Boolean),
  ),
];
await mkdir(".artifacts/geo", { recursive: true });
let cursor = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (cursor < nuts.length) {
      const nut = nuts[cursor++],
        file = `.artifacts/geo/v2-${nut}.json`;
      try {
        await readFile(file);
        continue;
      } catch {}
      const d = await get({ codnut3: nut, nationallevelname: "Municipio" });
      await writeFile(file, JSON.stringify(d.features.map(shape)));
      console.log("municipalities", nut, d.features.length);
    }
  }),
);
const all = (
  await Promise.all(
    nuts.map(async (n) =>
      JSON.parse(await readFile(`.artifacts/geo/v2-${n}.json`, "utf8")),
    ),
  )
).flat();
const byId = new Map(all.map((x) => [x.id, x]));
for (const p of territories.filter((t) => t.level === "province")) {
  const members = territories.filter(
    (t) => t.level === "municipality" && t.province === p.id,
  );
  const shapes = members.map((t) => byId.get(t.id));
  if (shapes.some((x) => !x)) throw Error(`Missing geometry ${p.id}`);
  await writeFile(
    `public/observatorio/geo/${p.id}.json`,
    JSON.stringify(shapes),
  );
}
await writeFile(
  "public/observatorio/geo/provenance.json",
  JSON.stringify(
    {
      source: base,
      license:
        "https://www.ign.es/resources/licencia/Condiciones_licenciaUso_IGN.pdf",
      attribution: "Obra derivada de BDLJE CC-BY 4.0 ign.es",
      retrievedAt: new Date().toISOString(),
      regions: territories.filter((t) => t.level === "region").length,
      provinces: territories.filter((t) => t.level === "province").length,
      municipalities: territories.filter((t) => t.level === "municipality")
        .length,
      simplification:
        "0.10 screen units; illustrative boundaries, not cadastral/legal evidence",
    },
    null,
    2,
  ),
);
console.log("Complete", territories.length);
