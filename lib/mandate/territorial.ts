import inventory from "@/data/mandate/madrid-inventory.json";
import reviews from "@/data/mandate/madrid-reviews.json";
import sources from "@/data/mandate/evidence/territorial/sources.json";
import { validateTerritorialBalance, type TerritorialBalance, type TerritorialReview, type TerritorialSource } from "./territorial-model";

export const TERRITORIAL_BALANCE_IDS = ["m-28079"];

export function getTerritorialBalance(id: string): TerritorialBalance | null {
  if (id !== inventory.jurisdictionId) return null;
  // Explicit projection: raw extraction and local evidence paths stay on the server.
  const balance: TerritorialBalance = {
    jurisdictionId: inventory.jurisdictionId, mandateId: inventory.mandateId, mandateLabel: inventory.mandateLabel,
    sourceId: inventory.sourceId, registerSourceId: inventory.registerSourceId, sourceSha256: inventory.sourceSha256,
    inventoryTotal: inventory.inventoryTotal, scope: inventory.scope, textNote: inventory.textNote,
    records: inventory.records.map(({ id, officialId, text, topic, page, endPage, sourceId }) => ({ id, officialId, text, topic, page, endPage, sourceId })),
    reviews: reviews as TerritorialReview[],
    sources: sources.filter(source => source.jurisdictionId === id).map(({ id, jurisdictionId, title, publisher, family, url, role, publicationDate, retrievedAt, sha256, captureType }) =>
      ({ id, jurisdictionId, title, publisher, family, url, role, publicationDate, retrievedAt, sha256, captureType })) as TerritorialSource[],
  };
  validateTerritorialBalance(balance);
  return balance;
}
