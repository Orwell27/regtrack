"""Read-only verification of the actual local Elasticsearch analyzers, not just health."""
import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

CONTAINER = "regtrack-openaleph-elasticsearch-1"


def request(path, data=None):
    command = ["docker", "exec", "-i", CONTAINER, "curl", "--fail-with-body", "--silent", "--show-error",
               "--max-time", "30", "http://localhost:9200/" + path]
    if data is not None:
        command += ["-H", "Content-Type: application/json", "--data-binary", "@-"]
    response = subprocess.run(command, input=json.dumps(data) if data is not None else None,
                              capture_output=True, text=True, timeout=40)
    if response.returncode:
        raise RuntimeError(f"Elasticsearch request failed: {path}")
    return json.loads(response.stdout)


def verify_tokens(response, expected):
    tokens = {item["token"] for item in response.get("tokens", [])}
    if expected not in tokens:
        raise RuntimeError(f"Missing synonym {expected!r}; received {sorted(tokens)}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="artifacts/local-services/analyzers-result.json")
    args = parser.parse_args()
    started = subprocess.check_output(["docker", "inspect", "--format", "{{.State.StartedAt}}", CONTAINER], text=True).strip()
    health = request("_cluster/health")
    if health["status"] not in ("green", "yellow") or health.get("initializing_shards") or health.get("unassigned_primary_shards"):
        raise RuntimeError("Indices are not ready; no analyzer validation recorded")
    settings = request("_settings")
    indices = sorted(name for name, value in settings.items()
                     if "icu-search-synonyms" in value["settings"]["index"].get("analysis", {}).get("analyzer", {}))
    if not indices:
        raise RuntimeError("No synonym analyzers discovered; zero coverage is a failure")
    checks = []
    for name in indices:
        # This pair exists in the upstream dictionary and is not accent folding or a typo.
        normal = request(name + "/_analyze", {"analyzer": "icu-default", "text": "maruja"})
        if any(item["token"] == "maria" for item in normal.get("tokens", [])):
            raise RuntimeError("Negative control unexpectedly expanded the synonym")
        for source, target in [("maruja", "maria"), ("maria", "maruja")]:
            verify_tokens(request(name + "/_analyze", {"analyzer": "icu-search-synonyms", "text": source}), target)
        checks.append({"index": name, "bidirectionalSynonym": True, "negativeControl": True})
    logs = subprocess.run(["docker", "logs", "--since", started, CONTAINER], capture_output=True, text=True, check=True)
    failures = [line for line in (logs.stdout + logs.stderr).splitlines()
                if any(term in line for term in ("empty synonyms map", "failed to build synonyms", "CircuitBreakingException"))]
    if failures:
        raise RuntimeError(f"Startup recorded {len(failures)} synonym/memory failures")
    stats = request("_nodes/stats/jvm")
    result = {"status": "passed", "at": datetime.now(timezone.utc).isoformat(), "containerStartedAt": started,
              "indicesChecked": len(checks), "checks": checks, "startupFailures": 0,
              "heapMaxBytes": [node["jvm"]["mem"]["heap_max_in_bytes"] for node in stats["nodes"].values()]}
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in result.items() if key != "checks"}))


if __name__ == "__main__":
    main()
