import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { checkObservatoryTrace } from "../scripts/check-observatory-trace.mjs";

const REQUIRED = [
  "app/observatorio/biblioteca/page.js.nft.json",
  "app/api/observatorio/biblioteca/route.js.nft.json",
  "app/api/observatorio/route.js.nft.json",
];
const temporaryDirectories: string[] = [];

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "regtrack-trace-"));
  temporaryDirectories.push(root);
  const next = path.join(root, ".next");
  await mkdir(path.join(next, "server"), { recursive: true });
  return { root, next };
}

async function writeTrace(next: string, relative: string, files: unknown) {
  const filename = path.join(next, "server", relative);
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, JSON.stringify({ version: 1, files }));
  return filename;
}

async function validTraces(next: string) {
  for (const relative of REQUIRED) {
    const filename = path.join(next, "server", relative);
    const dependency = path.join(next, "server", "chunks", "shared.js");
    await mkdir(path.dirname(dependency), { recursive: true });
    await writeFile(dependency, "export {};");
    await writeTrace(next, relative, [path.relative(path.dirname(filename), dependency)]);
  }
}

afterEach(async () => {
  const tempRoot = path.resolve(os.tmpdir());
  await Promise.all(temporaryDirectories.splice(0).map(async (directory) => {
    const target = path.resolve(directory);
    const relative = path.relative(tempRoot, target);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative) ||
      !path.basename(target).startsWith("regtrack-trace-")) {
      throw new Error(`Refusing to remove unexpected temporary directory: ${target}`);
    }
    await rm(target, { recursive: true, force: true });
  }));
});

describe("post-build observatory trace coverage and private data exclusion", () => {
  it("rejects an empty build instead of reporting success with zero coverage", async () => {
    const { next } = await fixture();
    await expect(checkObservatoryTrace(next)).rejects.toThrow("Missing required deployment traces");
  });

  it("requires every reader's trace even when the other readers have dependencies", async () => {
    const { next } = await fixture();
    await validTraces(next);
    await rm(path.join(next, "server", REQUIRED[1]));
    await expect(checkObservatoryTrace(next)).rejects.toThrow(REQUIRED[1]);
  });

  it("rejects three empty traces as uncovered readers", async () => {
    const { next } = await fixture();
    for (const relative of REQUIRED) await writeTrace(next, relative, []);
    await expect(checkObservatoryTrace(next)).rejects.toThrow("Required deployment trace is empty");
  });

  it("accepts covered readers and counts dependencies only once", async () => {
    const { next } = await fixture();
    await validTraces(next);
    await expect(checkObservatoryTrace(next)).resolves.toEqual({
      traceCount: 3,
      dependencyCount: 1,
      requiredTraceCount: 3,
    });
  });

  it("inspects unrelated routes so private vault files cannot escape through another reader", async () => {
    const { next } = await fixture();
    await validTraces(next);
    await writeTrace(next, "app/other/route.js.nft.json", [
      "../../../../.artifacts/observatorio-vault/private-record.json",
    ]);
    await expect(checkObservatoryTrace(next)).rejects.toThrow("Private file included");
  });

  it.each([
    "../../../../.records/private.json",
    "..\\..\\..\\..\\.RECORDS\\private.json",
    "../../../../.env.local",
    "../../../../scratch/../.records/../private.json",
  ])("rejects private references with portable separators and traversal: %s", async (entry) => {
    const { next } = await fixture();
    await validTraces(next);
    await writeTrace(next, REQUIRED[0], [entry]);
    await expect(checkObservatoryTrace(next)).rejects.toThrow("Private file included");
  });

  it("detects a resolved private parent when a manifest entry itself has no private segment", async () => {
    const { next } = await fixture();
    await validTraces(next);
    await writeTrace(next, ".records/cache/reader.nft.json", ["../hidden.json"]);
    await expect(checkObservatoryTrace(next)).rejects.toThrow("Private file included");
  });

  it("follows a directory alias to a private record rather than trusting its public-looking name", async () => {
    const { root, next } = await fixture();
    await validTraces(next);
    const privateDirectory = path.join(root, ".records");
    await mkdir(privateDirectory);
    await writeFile(path.join(privateDirectory, "record.json"), "{}");
    const alias = path.join(root, "public-looking-directory");
    await symlink(privateDirectory, alias, process.platform === "win32" ? "junction" : "dir");
    const trace = path.join(next, "server", REQUIRED[0]);
    await writeTrace(next, REQUIRED[0], [path.relative(path.dirname(trace), path.join(alias, "record.json"))]);
    await expect(checkObservatoryTrace(next)).rejects.toThrow("Private file included");
  });

  it.each([null, "not-an-array", [null], [""]])("rejects malformed files metadata: %j", async (files) => {
    const { next } = await fixture();
    await validTraces(next);
    await writeTrace(next, "app/other/route.js.nft.json", files);
    await expect(checkObservatoryTrace(next)).rejects.toThrow(/files array|Invalid file entry/);
  });
});
