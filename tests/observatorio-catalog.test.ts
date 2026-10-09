import { describe, expect, it } from "vitest";
import { SOURCE_CATALOG } from "@/lib/observatorio/catalog";

describe("catálogo documental: procedencia y habilitación", () => {
  it("mantiene identificadores únicos y referencias públicas sin credenciales", () => {
    const ids = SOURCE_CATALOG.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const source of SOURCE_CATALOG) {
      expect(source.id).toMatch(/^[a-z][a-z0-9-]*$/);
      const references = [source.documentationUrl, source.license.url].filter(
        (url): url is string => Boolean(url),
      );
      for (const reference of references) {
        const url = new URL(reference);
        expect(url.protocol).toBe("https:");
        expect(url.username).toBe("");
        expect(url.password).toBe("");
      }
      expect(source.license.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isFinite(Date.parse(source.license.checkedAt))).toBe(true);
    }
  });

  it("no habilita el piloto para referencias sin redistribución comprobada", () => {
    const selected = SOURCE_CATALOG.filter((source) => source.state === "piloto");
    expect(selected.map((source) => source.id).sort()).toEqual(["boe", "ine"]);
    for (const source of selected) {
      expect(source.role).toBe("fuente_primaria");
      expect(source.license.redistribution).toBe("permitida_con_condiciones");
      expect(source.license.url).toBeTruthy();
      expect(source.versionStrategy).toBeTruthy();
      expect(source.limitations.length).toBeGreaterThan(0);
    }
    for (const source of SOURCE_CATALOG) {
      if (source.license.redistribution !== "permitida_con_condiciones") {
        expect(source.state).not.toBe("piloto");
      }
    }
  });

  it("no extiende una licencia institucional a todos los datos de terceros", () => {
    for (const id of ["owid", "oecd"]) {
      const source = SOURCE_CATALOG.find((entry) => entry.id === id);
      expect(source?.license.redistribution).toBe("por_dataset");
      expect(source?.state).toBe("candidato");
    }
    const ess = SOURCE_CATALOG.find((entry) => entry.id === "ess");
    expect(ess?.license.redistribution).toBe("pendiente");
    expect(ess?.license.label).toContain("CC BY-NC-SA 4.0");
    expect(ess?.state).toBe("referencia");
  });

  it("conserva EuroVoc como candidato mientras faltan distribución y licencia", () => {
    const eurovoc = SOURCE_CATALOG.find((source) => source.id === "eurovoc");
    expect(eurovoc?.role).toBe("vocabulario");
    expect(eurovoc?.state).toBe("candidato");
    expect(eurovoc?.license.redistribution).toBe("pendiente");
    expect(eurovoc?.license.url).toBeUndefined();
  });
});
