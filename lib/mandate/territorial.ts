import madridInventory from "@/data/mandate/madrid-inventory.json";
import madridReviews from "@/data/mandate/madrid-reviews.json";
import navarraInventory from "@/data/mandate/navarra-inventory.json";
import navarraReviews from "@/data/mandate/navarra-reviews.json";
import euskadiInventory from "@/data/mandate/euskadi-inventory.json";
import euskadiReviews from "@/data/mandate/euskadi-reviews.json";
import catalunyaInventory from "@/data/mandate/catalunya-inventory.json";
import catalunyaReviews from "@/data/mandate/catalunya-reviews.json";
import sources from "@/data/mandate/evidence/territorial/sources.json";
import { validateTerritorialBalance, type TerritorialBalance, type TerritorialRecord, type TerritorialReview, type TerritorialSource } from "./territorial-model";

const TERRITORIES = {
  "r-09": { inventory: catalunyaInventory, reviews: catalunyaReviews, level: "region", mandateSourceId: catalunyaInventory.sourceId, sourceLabel: catalunyaInventory.sourceLabel, governmentCutoff: undefined },
  "m-28079": { inventory: madridInventory, reviews: madridReviews, level: "municipality", mandateSourceId: madridInventory.sourceId, sourceLabel: "Programa", governmentCutoff: undefined },
  "r-15": { inventory: navarraInventory, reviews: navarraReviews, level: "region", mandateSourceId: navarraInventory.mandateSourceId, sourceLabel: navarraInventory.sourceLabel, governmentCutoff: navarraInventory.governmentCutoff },
  "r-16": { inventory: euskadiInventory, reviews: euskadiReviews, level: "region", mandateSourceId: euskadiInventory.mandateSourceId, sourceLabel: euskadiInventory.sourceLabel, governmentCutoff: undefined },
} as const;
export const TERRITORIAL_BALANCE_IDS = Object.keys(TERRITORIES);

export function getTerritorialBalance(id: string): TerritorialBalance | null {
  if (!TERRITORIAL_BALANCE_IDS.includes(id)) return null;
  const { inventory, reviews, level, mandateSourceId, sourceLabel, governmentCutoff } = TERRITORIES[id as keyof typeof TERRITORIES];
  // Explicit projection: raw extraction and local evidence paths stay on the server.
  const balance: TerritorialBalance = {
    jurisdictionId: inventory.jurisdictionId, mandateId: inventory.mandateId, mandateLabel: inventory.mandateLabel,
    sourceId: inventory.sourceId, registerSourceId: inventory.registerSourceId, sourceSha256: inventory.sourceSha256,
    inventoryTotal: inventory.inventoryTotal, scope: inventory.scope, textNote: inventory.textNote,
    level, mandateSourceId, sourceLabel,
    ...("textLanguage" in inventory ? { textLanguage: inventory.textLanguage as TerritorialBalance["textLanguage"] } : {}),
    ...(governmentCutoff ? { governmentCutoff } : {}),
    records: (inventory.records as TerritorialRecord[]).map(record => {
      const { id, officialId, text, topic, page, endPage, sourceId } = record;
      return { id, officialId, text, topic, page, endPage, sourceId,
        ...(record.governmentState ? { governmentState: record.governmentState } : {}),
        ...(record.initiatives ? { initiatives: record.initiatives.map(({ officialId, text, page, endPage }) => ({ officialId, text, page, endPage })) } : {}) };
    }),
    reviews: reviews as TerritorialReview[],
    sources: sources.filter(source => source.jurisdictionId === id).map(({ id, jurisdictionId, title, publisher, family, url, role, publicationDate, retrievedAt, sha256, captureType }) =>
      ({ id, jurisdictionId, title, publisher, family, url, role, publicationDate, retrievedAt, sha256, captureType })) as TerritorialSource[],
  };
  validateTerritorialBalance(balance);
  return balance;
}
