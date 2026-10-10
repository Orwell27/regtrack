import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";
import collection from "@/data/mandate/commitments.json";

describe("originales de los compromisos y atribución", () => {
  it("conserva íntegros los bytes de todas las capturas publicadas", () => {
    for (const source of collection.sources) {
      expect(source.snapshotPath).toMatch(/^data\/mandate\/evidence\/(?:commitments|expansion)\/[A-Za-z0-9._-]+$/);
      const raw = readFileSync(source.snapshotPath);
      expect(createHash("sha256").update(raw).digest("hex"), source.id).toBe(source.sha256);
      if (source.id.startsWith("BOE-A-")) {
        const doc = new XMLParser().parse(raw.toString("utf8"));
        expect(doc.documento.metadatos.identificador).toBe(source.id);
        expect(doc.documento.metadatos.titulo).toBe(source.title);
        expect(String(doc.documento.metadatos.fecha_publicacion)).toBe(source.publishedAt!.replaceAll("-", ""));
      }
    }
  });
  it("no confunde la paráfrasis del pacto con una captura del PDF", () => {
    const source = collection.sources.find((item) => item.id === "coalicion-2023")!;
    expect(source.captureType).toBe("parafrasis_editorial");
    expect(source.snapshotPath).toMatch(/extract\.json$/);
    expect(source.paraphrase).toContain("no al PDF remoto");
  });
});
