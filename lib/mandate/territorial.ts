import albaceteInventory from "@/data/mandate/albacete-inventory.json";
import albaceteReviews from "@/data/mandate/albacete-reviews.json";
import huescaInventory from "@/data/mandate/huesca-inventory.json";
import huescaReviews from "@/data/mandate/huesca-reviews.json";
import zaragozaInventory from "@/data/mandate/zaragoza-inventory.json";
import zaragozaReviews from "@/data/mandate/zaragoza-reviews.json";
import murciaCityInventory from "@/data/mandate/murcia-city-inventory.json";
import murciaCityReviews from "@/data/mandate/murcia-city-reviews.json";
import castellonInventory from "@/data/mandate/castellon-inventory.json";
import castellonReviews from "@/data/mandate/castellon-reviews.json";
import alicanteInventory from "@/data/mandate/alicante-inventory.json";
import alicanteReviews from "@/data/mandate/alicante-reviews.json";
import valenciaInventory from "@/data/mandate/valencia-inventory.json";
import valenciaReviews from "@/data/mandate/valencia-reviews.json";
import valencianaInventory from "@/data/mandate/valenciana-inventory.json";
import valencianaReviews from "@/data/mandate/valenciana-reviews.json";
import extremaduraInventory from "@/data/mandate/extremadura-inventory.json";
import extremaduraReviews from "@/data/mandate/extremadura-reviews.json";
import cylInventory from "@/data/mandate/cyl-inventory.json";
import cylReviews from "@/data/mandate/cyl-reviews.json";
import andaluciaInventory from "@/data/mandate/andalucia-inventory.json";
import andaluciaReviews from "@/data/mandate/andalucia-reviews.json";
import clmInventory from "@/data/mandate/clm-inventory.json";
import clmReviews from "@/data/mandate/clm-reviews.json";
import madridRegionInventory from "@/data/mandate/madrid-region-inventory.json";
import madridRegionReviews from "@/data/mandate/madrid-region-reviews.json";
import galiciaInventory from "@/data/mandate/galicia-inventory.json";
import galiciaReviews from "@/data/mandate/galicia-reviews.json";
import balearsInventory from "@/data/mandate/balears-inventory.json";
import balearsReviews from "@/data/mandate/balears-reviews.json";
import aragonInventory from "@/data/mandate/aragon-inventory.json";
import aragonReviews from "@/data/mandate/aragon-reviews.json";
import cantabriaInventory from "@/data/mandate/cantabria-inventory.json";
import cantabriaReviews from "@/data/mandate/cantabria-reviews.json";
import riojaInventory from "@/data/mandate/rioja-inventory.json";
import riojaReviews from "@/data/mandate/rioja-reviews.json";
import asturiasInventory from "@/data/mandate/asturias-inventory.json";
import asturiasReviews from "@/data/mandate/asturias-reviews.json";
import murciaInventory from "@/data/mandate/murcia-inventory.json";
import murciaReviews from "@/data/mandate/murcia-reviews.json";
import ceutaInventory from "@/data/mandate/ceuta-inventory.json";
import melillaInventory from "@/data/mandate/melilla-inventory.json";
import melillaReviews from "@/data/mandate/melilla-reviews.json";
import ceutaReviews from "@/data/mandate/ceuta-reviews.json";
import canariasInventory from "@/data/mandate/canarias-inventory.json";
import canariasReviews from "@/data/mandate/canarias-reviews.json";
import madridInventory from "@/data/mandate/madrid-inventory.json";
import madridReviews from "@/data/mandate/madrid-reviews.json";
import navarraInventory from "@/data/mandate/navarra-inventory.json";
import navarraReviews from "@/data/mandate/navarra-reviews.json";
import euskadiInventory from "@/data/mandate/euskadi-inventory.json";
import euskadiReviews from "@/data/mandate/euskadi-reviews.json";
import catalunyaInventory from "@/data/mandate/catalunya-inventory.json";
import catalunyaReviews from "@/data/mandate/catalunya-reviews.json";
import barcelonaInventory from "@/data/mandate/barcelona-inventory.json";
import barcelonaReviews from "@/data/mandate/barcelona-reviews.json";
import vitoriaInventory from "@/data/mandate/vitoria-inventory.json";
import vitoriaReviews from "@/data/mandate/vitoria-reviews.json";
import donostiaInventory from "@/data/mandate/donostia-inventory.json";
import donostiaReviews from "@/data/mandate/donostia-reviews.json";
import bilbaoInventory from "@/data/mandate/bilbao-inventory.json";
import bilbaoReviews from "@/data/mandate/bilbao-reviews.json";
import sources from "@/data/mandate/evidence/territorial/sources.json";
import { validateTerritorialBalance, type TerritorialBalance, type TerritorialRecord, type TerritorialReview, type TerritorialSource } from "./territorial-model";

const TERRITORIES = {
  "m-02003": { inventory: albaceteInventory, reviews: albaceteReviews, level: "municipality", mandateSourceId: albaceteInventory.mandateSourceId, sourceLabel: albaceteInventory.sourceLabel, governmentCutoff: undefined },
  "m-22125": { inventory: huescaInventory, reviews: huescaReviews, level: "municipality", mandateSourceId: huescaInventory.mandateSourceId, sourceLabel: huescaInventory.sourceLabel, governmentCutoff: undefined },
  "m-50297": { inventory: zaragozaInventory, reviews: zaragozaReviews, level: "municipality", mandateSourceId: zaragozaInventory.sourceId, sourceLabel: zaragozaInventory.sourceLabel, governmentCutoff: undefined },
  "m-30030": { inventory: murciaCityInventory, reviews: murciaCityReviews, level: "municipality", mandateSourceId: murciaCityInventory.sourceId, sourceLabel: murciaCityInventory.sourceLabel, governmentCutoff: undefined },
  "m-12040": { inventory: castellonInventory, reviews: castellonReviews, level: "municipality", mandateSourceId: castellonInventory.sourceId, sourceLabel: castellonInventory.sourceLabel, governmentCutoff: undefined },
  "m-03014": { inventory: alicanteInventory, reviews: alicanteReviews, level: "municipality", mandateSourceId: alicanteInventory.sourceId, sourceLabel: alicanteInventory.sourceLabel, governmentCutoff: undefined },
  "m-46250": { inventory: valenciaInventory, reviews: valenciaReviews, level: "municipality", mandateSourceId: valenciaInventory.sourceId, sourceLabel: valenciaInventory.sourceLabel, governmentCutoff: undefined },
  "r-10": { inventory: valencianaInventory, reviews: valencianaReviews, level: "region", mandateSourceId: valencianaInventory.sourceId, sourceLabel: valencianaInventory.sourceLabel, governmentCutoff: undefined },
  "r-11": { inventory: extremaduraInventory, reviews: extremaduraReviews, level: "region", mandateSourceId: extremaduraInventory.sourceId, sourceLabel: extremaduraInventory.sourceLabel, governmentCutoff: undefined },
  "r-07": { inventory: cylInventory, reviews: cylReviews, level: "region", mandateSourceId: cylInventory.sourceId, sourceLabel: cylInventory.sourceLabel, governmentCutoff: undefined },
  "r-01": { inventory: andaluciaInventory, reviews: andaluciaReviews, level: "region", mandateSourceId: andaluciaInventory.sourceId, sourceLabel: andaluciaInventory.sourceLabel, governmentCutoff: undefined },
  "r-08": { inventory: clmInventory, reviews: clmReviews, level: "region", mandateSourceId: clmInventory.sourceId, sourceLabel: clmInventory.sourceLabel, governmentCutoff: undefined },
  "r-13": { inventory: madridRegionInventory, reviews: madridRegionReviews, level: "region", mandateSourceId: madridRegionInventory.sourceId, sourceLabel: madridRegionInventory.sourceLabel, governmentCutoff: undefined },
  "r-12": { inventory: galiciaInventory, reviews: galiciaReviews, level: "region", mandateSourceId: galiciaInventory.sourceId, sourceLabel: galiciaInventory.sourceLabel, governmentCutoff: undefined },
  "r-04": { inventory: balearsInventory, reviews: balearsReviews, level: "region", mandateSourceId: balearsInventory.sourceId, sourceLabel: balearsInventory.sourceLabel, governmentCutoff: undefined },
  "r-02": { inventory: aragonInventory, reviews: aragonReviews, level: "region", mandateSourceId: aragonInventory.sourceId, sourceLabel: aragonInventory.sourceLabel, governmentCutoff: undefined },
  "r-06": { inventory: cantabriaInventory, reviews: cantabriaReviews, level: "region", mandateSourceId: cantabriaInventory.sourceId, sourceLabel: cantabriaInventory.sourceLabel, governmentCutoff: undefined },
  "r-17": { inventory: riojaInventory, reviews: riojaReviews, level: "region", mandateSourceId: riojaInventory.sourceId, sourceLabel: riojaInventory.sourceLabel, governmentCutoff: undefined },
  "r-03": { inventory: asturiasInventory, reviews: asturiasReviews, level: "region", mandateSourceId: asturiasInventory.sourceId, sourceLabel: asturiasInventory.sourceLabel, governmentCutoff: undefined },
  "r-14": { inventory: murciaInventory, reviews: murciaReviews, level: "region", mandateSourceId: murciaInventory.sourceId, sourceLabel: murciaInventory.sourceLabel, governmentCutoff: undefined },
  "r-19": { inventory: melillaInventory, reviews: melillaReviews, level: "autonomous-city", mandateSourceId: melillaInventory.sourceId, sourceLabel: melillaInventory.sourceLabel, governmentCutoff: undefined },
  "r-18": { inventory: ceutaInventory, reviews: ceutaReviews, level: "autonomous-city", mandateSourceId: ceutaInventory.sourceId, sourceLabel: ceutaInventory.sourceLabel, governmentCutoff: undefined },
  "r-05": { inventory: canariasInventory, reviews: canariasReviews, level: "region", mandateSourceId: canariasInventory.mandateSourceId, sourceLabel: canariasInventory.sourceLabel, governmentCutoff: undefined },
  "m-48020": { inventory: bilbaoInventory, reviews: bilbaoReviews, level: "municipality", mandateSourceId: bilbaoInventory.sourceId, sourceLabel: bilbaoInventory.sourceLabel, governmentCutoff: undefined },
  "m-20069": { inventory: donostiaInventory, reviews: donostiaReviews, level: "municipality", mandateSourceId: donostiaInventory.mandateSourceId, sourceLabel: donostiaInventory.sourceLabel, governmentCutoff: donostiaInventory.governmentCutoff },
  "m-01059": { inventory: vitoriaInventory, reviews: vitoriaReviews, level: "municipality", mandateSourceId: vitoriaInventory.sourceId, sourceLabel: vitoriaInventory.sourceLabel, governmentCutoff: undefined },
  "m-08019": { inventory: barcelonaInventory, reviews: barcelonaReviews, level: "municipality", mandateSourceId: barcelonaInventory.mandateSourceId, sourceLabel: barcelonaInventory.sourceLabel, governmentCutoff: barcelonaInventory.governmentCutoff },
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
    ...("contextBlocks" in inventory ? { contextBlocks: inventory.contextBlocks.map(({ id, topic, text, page, endPage }) => ({ id, topic, text, page, endPage })) } : {}),
    ...("programmeCopy" in inventory ? { programmeCopy: inventory.programmeCopy } : {}),
    ...("transcriptionMethod" in inventory ? { transcriptionMethod: inventory.transcriptionMethod as TerritorialBalance["transcriptionMethod"] } : {}),
    ...("transcriptionPending" in inventory ? { transcriptionPending: inventory.transcriptionPending } : {}),
    ...("textLanguage" in inventory ? { textLanguage: inventory.textLanguage as TerritorialBalance["textLanguage"] } : {}),
    ...(governmentCutoff ? { governmentCutoff } : {}),
    ...("inventoryKind" in inventory ? { inventoryKind: inventory.inventoryKind as TerritorialBalance["inventoryKind"] } : {}),
    ...("governmentDateKind" in inventory ? { governmentDateKind: inventory.governmentDateKind as TerritorialBalance["governmentDateKind"] } : {}),
    records: (inventory.records as TerritorialRecord[]).map(record => {
      const { id, officialId, text, topic, page, endPage, sourceId } = record;
      return { id, officialId, text, topic, page, endPage, sourceId,
        ...(record.sourceNote ? { sourceNote: record.sourceNote } : {}),
        ...(record.governmentState ? { governmentState: record.governmentState } : {}),
        ...(record.governmentProgress ? { governmentProgress: record.governmentProgress } : {}),
        ...(record.programmeText ? { programmeText: record.programmeText } : {}),
        ...(record.governmentReport ? { governmentReport: { officialId: record.governmentReport.officialId, title: record.governmentReport.title, text: record.governmentReport.text, percentage: record.governmentReport.percentage, sourceId: record.governmentReport.sourceId, url: record.governmentReport.url, links: record.governmentReport.links } } : {}),
        ...(record.webSource ? { webSource: { url: record.webSource.url, sha256: record.webSource.sha256, retrievedAt: record.webSource.retrievedAt }, detailText: record.detailText, detailLinks: record.detailLinks } : {}),
        ...(record.initiatives ? { initiatives: record.initiatives.map(({ id, sourceNote, officialId, text, page, endPage }) => ({ officialId, text, page, endPage, ...(id ? { id } : {}), ...(sourceNote ? { sourceNote } : {}) })) } : {}) };
    }),
    reviews: reviews as TerritorialReview[],
    sources: sources.filter(source => source.jurisdictionId === id).map(({ id, jurisdictionId, title, publisher, family, url, role, publicationDate, retrievedAt, sha256, captureType }) =>
      ({ id, jurisdictionId, title, publisher, family, url, role, publicationDate, retrievedAt, sha256, captureType })) as TerritorialSource[],
  };
  validateTerritorialBalance(balance);
  return balance;
}
