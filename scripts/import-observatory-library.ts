import { mkdir, writeFile, rename, readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { KnowledgeVault } from "../lib/knowledge/vault";
import { buildPublicLibrary, type PublicationManifest } from "../lib/observatorio/library";
import { BOE_PILOT, INE_PILOT, boeUrl, ineUrl, fetchPilotSource, parsePilotBoe, parsePilotIne, captureIfChanged, publication } from "../lib/observatorio/pilot-ingest";

async function main() {
  if (process.argv.length > 2) throw Error("El piloto usa una lista fija de fuentes; no acepta URLs o rutas externas.");
  const startedAt = new Date().toISOString();
  const root = join(process.cwd(), ".artifacts/observatorio-vault");
  const vault = new KnowledgeVault(root);
  await vault.init();
  const manifest: PublicationManifest = { schemaVersion: 1, entries: [], relations: [] };
  for (const id of BOE_PILOT) {
    const raw = await fetchPilotSource(boeUrl(id));
    const observedAt = new Date().toISOString();
    // Raw XML remains in the canonical vault, separately from its text projection.
    await captureIfChanged(vault, { kind: "reporte", title: `XML original · ${id}`, sourceUrl: boeUrl(id), publisher: "Agencia Estatal Boletín Oficial del Estado", observedAt, content: raw, contentKind: "texto_completo" });
    const record = await captureIfChanged(vault, parsePilotBoe(raw, id, observedAt));
    manifest.entries.push(publication(record, { sourceId: "boe", documentId: id, kind: "norma",
      summary: id === "BOE-A-2021-16233" ? "Publicación original que regula programas de ayuda para rehabilitación residencial y vivienda social. Permite estudiar su diseño; no confirma que una ayuda siga abierta ni qué requisitos rigen hoy." : "Publicación original de la ley por el derecho a la vivienda. Sirve como punto de partida para estudiar el marco estatal, con sus posteriores cambios pendientes de incorporar.",
      topics: id === "BOE-A-2021-16233" ? ["vivienda", "ayudas", "energia"] : ["vivienda", "justicia"],
      profiles: ["Ciudadanía", "Propietarios", "Profesionales privados", "Administración pública"],
      territory: { role: "jurisdiction", code: "ES", label: "España", level: "national" },
      reuse: { label: "Condiciones de reutilización del BOE · atribución y transformaciones identificadas", url: "https://www.boe.es/informacion/aviso_legal/index.php", checkedAt: "2026-10-07" },
      reason: "Selección editorial del piloto de vivienda. Texto extraído del XML del BOE; presentación y espacios normalizados. Publicación original, no texto consolidado. Vigencia y aplicabilidad sin verificar." }));
  }
  for (const code of Object.keys(INE_PILOT) as (keyof typeof INE_PILOT)[]) {
    const raw = await fetchPilotSource(ineUrl(code));
    const observedAt = new Date().toISOString();
    await captureIfChanged(vault, { kind: "cambio_web", title: `Captura JSON original · ${code}`, sourceUrl: ineUrl(code), publisher: "Instituto Nacional de Estadística", observedAt, content: raw, contentKind: "texto_completo" });
    const parsed = parsePilotIne(raw, code, observedAt);
    const record = await captureIfChanged(vault, parsed.input);
    manifest.entries.push(publication(record, { sourceId: "ine", documentId: code, kind: "indicador", topics: ["vivienda", "economia"],
      profiles: ["Ciudadanía", "Propietarios", "Profesionales privados", "Administración pública"],
      territory: parsed.territory, statistic: parsed.statistic,
      summary: "Evolución del precio de la vivienda alquilada como residencia habitual. Es un índice, no un alquiler en euros ni un límite para actualizar contratos. La medición territorial aporta contexto; no acredita el efecto causal de una norma.",
      reuse: { label: "INE · CC BY 4.0, salvo indicación contraria", url: "https://www.ine.es/aviso_legal/", checkedAt: "2026-10-07" },
      reason: "Cinco observaciones anuales de una serie identificada de la tabla 59004; JSON normalizado, sin inventar fecha de publicación. Unidad y base: https://www.ine.es/dynt3/inebase/es/index.htm?capsel=8309&padre=8307 . Las ausencias se conservan como nulos." }));
  }
  const key = (entry: typeof manifest.entries[number]) => `${entry.recordId}-${entry.recordVersion}`;
  const law = manifest.entries.find((e) => e.documentId === "BOE-A-2023-12203")!;
  for (const statistic of manifest.entries.filter((e) => e.kind === "indicador")) manifest.relations.push({ from: key(law), to: key(statistic), type: "contexto",
    reason: "Contexto estadístico sobre alquiler para leer la normativa de vivienda; no demuestra impacto ni relación causal.",
    evidence: `Selección editorial: título y objeto de la Ley 12/2023, y serie INE ${statistic.documentId} sobre vivienda en alquiler. Versiones y ámbitos identificados en ambas fichas.` });
  const library = buildPublicLibrary(await vault.list(), manifest, new Date().toISOString());
  const outputDir = join(process.cwd(), "data/observatorio");
  await mkdir(outputDir, { recursive: true });
  // Write all sources first; a failed import leaves the previous public snapshot intact.
  await writeFile(join(root, "publication-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  const output = join(outputDir, "library.json");
  const serialized = JSON.stringify(library, null, 2) + "\n";
  const temp = `${output}.${randomUUID()}.tmp`;
  await writeFile(temp, serialized, "utf8");
  await rename(temp, output);
  if (await readFile(output, "utf8") !== serialized) throw Error("No se pudo verificar la publicación local");
  console.log(JSON.stringify({ documents: library.documents.length, relations: library.relations.length, output, vault: root, observedAt: startedAt }));
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Importación fallida"); process.exitCode = 1; });
