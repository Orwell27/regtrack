import geography from "@/data/mandate/jurisdictions.json";
import { normalizeMandateText } from "./model";

const aliases = [...new Set([...geography.jurisdictions.flatMap(item => item.name.split("/")), "Baleares", "Islas Baleares", "Las Palmas", "Castellón", "Castelló", "La Coruña"].map(name =>
  normalizeMandateText(name).replace(/^(comunidad foral de |comunidad de |ciudad autonoma de |principado de |region de )/, ""),
))];

/** Conservative scope boundary: the national reader has no disaggregated evidence. */
export function asksTerritorialBalance(question: string): boolean {
  const text = ` ${normalizeMandateText(question).replace(/[^a-z0-9]+/g, " ").trim()} `;
  if (aliases.some(name => text.includes(` ${name.replace(/[^a-z0-9]+/g, " ")} `))) return true;
  return /\b(ayuntamiento|alcaldia|alcalde|alcaldesa)\b/.test(text)
    || /\b(balance|mandato|gobierno|promesas|cumplimiento)\b.*\b(municipal|autonomico|autonomica)\b/.test(text);
}
