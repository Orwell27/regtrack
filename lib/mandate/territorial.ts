import madridInventory from "@/data/mandate/madrid-inventory.json";
import madridReviews from "@/data/mandate/madrid-reviews.json";
import navarraInventory from "@/data/mandate/navarra-inventory.json";
import navarraReviews from "@/data/mandate/navarra-reviews.json";
import sources from "@/data/mandate/evidence/territorial/sources.json";
import { validateTerritorialBalance, type TerritorialBalance, type TerritorialReview, type TerritorialSource } from "./territorial-model";

export const TERRITORIAL_BALANCE_IDS = ["m-28079", "r-15"];

export function getTerritorialBalance(id: string): TerritorialBalance | null {
  if (!TERRITORIAL_BALANCE_IDS.includes(id)) return null;
  const inventory = id === "r-15" ? navarraInventory : madridInventory;
  const reviews = id === "r-15" ? navarraReviews : madridReviews;
  // Explicit projection: raw extraction and local evidence paths stay on the server.
  const balance: TerritorialBalance = {
    jurisdictionId: inventory.jurisdictionId, mandateId: inventory.mandateId, mandateLabel: inventory.mandateLabel,
    sourceId: inventory.sourceId, registerSourceId: inventory.registerSourceId, sourceSha256: inventory.sourceSha256,
    inventoryTotal: inventory.inventoryTotal, scope: inventory.scope, textNote: inventory.textNote,
    level: id === "r-15" ? "region" : "municipality",
    mandateSourceId: id === "r-15" ? navarraInventory.mandateSourceId : madridInventory.sourceId,
    sourceLabel: id === "r-15" ? navarraInventory.sourceLabel : "Programa",
    ...(id === "r-15" ? { governmentCutoff: navarraInventory.governmentCutoff } : {}),
    records: inventory.records.map(record => {
      const { id, officialId, text, topic, page, endPage, sourceId } = record;
      return { id, officialId, text, topic, page, endPage, sourceId,
        ...("governmentState" in record && typeof record.governmentState === "string" ? { governmentState: record.governmentState } : {}) };
    }),
    reviews: reviews as TerritorialReview[],
    sources: sources.filter(source => source.jurisdictionId === id).map(({ id, jurisdictionId, title, publisher, family, url, role, publicationDate, retrievedAt, sha256, captureType }) =>
      ({ id, jurisdictionId, title, publisher, family, url, role, publicationDate, retrievedAt, sha256, captureType })) as TerritorialSource[],
  };
  validateTerritorialBalance(balance);
  return balance;
}
