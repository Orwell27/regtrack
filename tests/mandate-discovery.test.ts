import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";
import { getTerritorialBalance } from "@/lib/mandate/territorial";

describe("fuentes localizadas sin convertirlas en compromisos revisados", () => {
  it("conserva el universo desconocido aunque se haya acreditado la constitución de Teruel", () => {
    const all = getCoverage();
    for (const id of ["m-44216"]) {
      const item = all.find(item => item.id === id)!;
      expect(item).toMatchObject({ inventoryTotal: null, imported: 0, reviewed: 0, independentlyReviewed: 0 });
      expect(isCoverageComplete(item)).toBe(false);
      expect(getTerritorialBalance(id)).toBeNull();
      expect(item.blockers.join(" ")).toMatch(/programa original|programa electoral/);
    }
    const teruel = all.find(item => item.id === "m-44216")!;
    expect(teruel.mandate?.sourceId).toBe("teruel-constitution");
    expect(teruel.sources.every(source => source.role === "register" && source.consultedAt === "2026-10-11")).toBe(true);
    expect(new Set(teruel.sources.map(source => source.family)).size).toBe(1);
    expect(teruel.blockers.join(" ")).toContain("sin transcripción cotejada");
    expect(all.filter(item => item.inventoryTotal === null)).toHaveLength(38);
    expect(all.reduce((sum, item) => sum + item.reviewed, 0)).toBe(133);
    expect(JSON.stringify(all)).not.toMatch(/snapshotPath|extractionSha256|14613671553607447415/);
  });

  it("preserva el PDF válido y distingue su huella de la nota editorial de la biografía", () => {
    const root = "data/mandate/evidence/territorial/teruel/";
    const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
    for (const name of ["constitution", "register"]) {
      const meta = JSON.parse(readFileSync(`${root}${name}.meta.json`, "utf8"));
      const bytes = readFileSync(meta.snapshotPath);
      expect(bytes.length).toBe(meta.bytes);
      expect(hash(bytes)).toBe(meta.sha256);
      if (name === "constitution") {
        expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
        expect(meta.sha256).toBe("0124acfc26686c38707c875c87c7b30a7dffc1c2a9f9dfce0b548c6a94db4d77");
        const extracted = readFileSync(`${root}constitution.pages.json`);
        expect(hash(extracted)).toBe(meta.extractionSha256);
        const pages = JSON.parse(extracted.toString());
        expect(pages.map((page: { page: number }) => page.page)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect(pages[8].text).toContain("videoacta de la sesión");
      } else {
        expect(meta.captureType).toBe("extracto_editorial");
        expect(meta.snapshotPath).toMatch(/\.editorial\.md$/);
        expect(meta.limitation).toContain("no corresponde al HTML");
      }
    }
  });
});
