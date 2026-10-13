import { readFileSync, writeFileSync } from "node:fs";

// One capital per province, using the five-digit INE municipal identifier.
// Ceuta/Melilla appear once, as autonomous cities, not as provincial capitals.
const capitals = "01059 02003 03014 04013 05019 06015 07040 08019 09059 10037 11012 12040 13034 14021 15030 16078 17079 18087 19130 20069 21041 22125 23050 24089 25120 26089 27028 28079 29067 30030 31201 32054 33044 34120 35016 36038 37274 38038 39075 40194 41091 42173 43148 44216 45168 46250 47186 48020 49275 50297".split(" ");
const geography = JSON.parse(readFileSync("public/observatorio/geo/territories.json", "utf8")) as { id: string; name: string; level: string; region: string; province: string }[];
const selected = [...geography.filter(item => item.level === "region"), ...capitals.map(code => {
  const item = geography.find(item => item.id === `m-${code}`);
  if (!item || item.province !== `p-${code.slice(0, 2)}`) throw Error(`Capital no resuelta: ${code}`);
  return item;
})];
if (selected.length !== 69 || new Set(selected.map(item => item.id)).size !== 69) throw Error("Cobertura territorial inesperada");
const jurisdictions = selected.map(item => ({
  id: item.id, name: item.name,
  level: item.level === "municipality" ? "municipality" : ["r-18", "r-19"].includes(item.id) ? "autonomous-city" : "region",
  region: item.region, province: item.level === "municipality" ? item.province : null,
}));
writeFileSync("data/mandate/jurisdictions.json", JSON.stringify({
  schemaVersion: 1, scopeAgreedAt: "2026-10-10", geographySource: "https://api-features.ign.es/collections/administrativeunit/items",
  selection: "17 comunidades, Ceuta y Melilla y las 50 capitales de provincia. España se incorpora desde el inventario nacional. Selección editorial de capitales; nombres y códigos proceden del catálogo geográfico IGN del proyecto.", jurisdictions,
}, null, 2) + "\n");
console.log(`${jurisdictions.length} territorios distintos, más España.`);
