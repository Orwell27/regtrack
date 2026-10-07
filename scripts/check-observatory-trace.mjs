import { readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REQUIRED_TRACES = [
  "app/observatorio/biblioteca/page.js.nft.json",
  "app/api/observatorio/biblioteca/route.js.nft.json",
  "app/api/observatorio/route.js.nft.json",
  "app/observatorio/mandato/page.js.nft.json",
  "app/api/observatorio/mandato/route.js.nft.json",
  "app/api/observatorio/mandato/preguntar/route.js.nft.json",
];

function isPrivatePath(value) {
  const segments = value.replaceAll("\\", "/").toLowerCase().split("/");
  return segments.some((segment) =>
    [".artifacts", ".records", ".env.local"].includes(segment),
  );
}

function rejectPrivatePath(value, trace) {
  if (isPrivatePath(value)) {
    throw new Error(`Private file included in deployment trace ${trace}: ${value}`);
  }
}

async function listTraces(directory, visited = new Set()) {
  const canonical = await realpath(directory);
  if (visited.has(canonical)) return [];
  visited.add(canonical);
  const traces = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    const directoryEntry = entry.isDirectory() ||
      (entry.isSymbolicLink() && (await stat(filename)).isDirectory());
    if (directoryEntry) {
      traces.push(...await listTraces(filename, visited));
    } else if (entry.name.endsWith(".nft.json")) {
      traces.push(filename);
    }
  }
  return traces;
}

/**
 * Check a completed Next.js build rooted at `root` (normally `.next`).
 * Missing route coverage or empty required traces fail closed. All server traces
 * are inspected, including dependencies outside the three observatory routes.
 */
export async function checkObservatoryTrace(root) {
  const serverRoot = path.resolve(root, "server");
  let traces;
  try {
    traces = await listTraces(serverRoot);
  } catch (error) {
    throw new Error(`Cannot inspect Next.js server traces at ${serverRoot}`, { cause: error });
  }
  const tracePaths = new Set(traces.map((filename) => path.resolve(filename)));
  const missing = REQUIRED_TRACES.filter((filename) =>
    !tracePaths.has(path.resolve(serverRoot, filename)),
  );
  if (missing.length) {
    throw new Error(`Missing required deployment traces: ${missing.join(", ")}`);
  }

  const requiredPaths = new Set(REQUIRED_TRACES.map((filename) => path.resolve(serverRoot, filename)));
  const dependencies = new Map();
  for (const trace of traces) {
    let manifest;
    try {
      manifest = JSON.parse(await readFile(trace, "utf8"));
    } catch (error) {
      throw new Error(`Invalid deployment trace JSON: ${trace}`, { cause: error });
    }
    if (!manifest || !Array.isArray(manifest.files)) {
      throw new Error(`Deployment trace has no files array: ${trace}`);
    }
    if (requiredPaths.has(path.resolve(trace)) && manifest.files.length === 0) {
      throw new Error(`Required deployment trace is empty: ${trace}`);
    }
    for (const entry of manifest.files) {
      if (typeof entry !== "string" || !entry.trim() || entry.includes("\0")) {
        throw new Error(`Invalid file entry in deployment trace: ${trace}`);
      }
      rejectPrivatePath(entry, trace);
      const resolved = path.resolve(path.dirname(trace), entry.replace(/[\\/]/g, path.sep));
      rejectPrivatePath(resolved, trace);
      dependencies.set(resolved, trace);
    }
  }

  // Resolve real filesystem targets too: an innocuous path can be a symlink into
  // the private vault. Deduplicate and bound concurrent filesystem operations.
  const entries = [...dependencies.entries()];
  for (let offset = 0; offset < entries.length; offset += 32) {
    await Promise.all(entries.slice(offset, offset + 32).map(async ([filename, trace]) => {
      let target;
      try {
        target = await realpath(filename);
      } catch (error) {
        // NFT integrity is a separate check. Missing ordinary dependencies do
        // not weaken lexical checks, which already reject private target paths.
        if (error.code === "ENOENT" || error.code === "ENOTDIR") return;
        throw new Error(`Cannot resolve deployment dependency: ${filename}`, { cause: error });
      }
      rejectPrivatePath(target, trace);
    }));
  }

  return { traceCount: traces.length, dependencyCount: dependencies.size, requiredTraceCount: REQUIRED_TRACES.length };
}

const calledDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (calledDirectly) {
  try {
    const result = await checkObservatoryTrace(path.join(process.cwd(), ".next"));
    console.log(`Deployment trace guard passed: ${result.traceCount} traces, ${result.dependencyCount} dependencies, ${result.requiredTraceCount} required routes.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
