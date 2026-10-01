# /// script
# requires-python = ">=3.12"
# dependencies = ["followthemoney==4.11.0"]
# ///
"""Validate every input entity using the official FtM model without silent drops."""
import json
import sys
from pathlib import Path
from followthemoney import model


def validate(data):
    if not isinstance(data, dict) or not isinstance(data.get("id"), str) or not data["id"]:
        raise ValueError("Entity without id")
    schema = model.get(data.get("schema"))
    if schema is None:
        raise ValueError("Unknown schema")
    props = data.get("properties")
    if not isinstance(props, dict):
        raise ValueError("Missing properties")
    for name, values in props.items():
        if name not in schema.properties:
            raise ValueError(f"Unknown property: {name}")
        if not isinstance(values, list) or not values or any(not isinstance(v, str) or not v.strip() for v in values):
            raise ValueError(f"Invalid values: {name}")
    # cleaned=False invokes official type normalization. Refuse values that vanish.
    proxy = model.get_proxy(data, cleaned=False)
    for name, values in props.items():
        if len(proxy.get(name)) != len(set(values)):
            raise ValueError(f"Rejected/merged values in {name}; normalize explicitly")
    for name in schema.required:
        if not proxy.get(name):
            raise ValueError(f"Missing required property: {name}")
    return proxy


if __name__ == "__main__":
    try:
        count = 0
        for count, line in enumerate(Path(sys.argv[1]).read_text(encoding="utf-8-sig").splitlines(), 1):
            if not line.strip():
                raise ValueError(f"Empty line {count}")
            validate(json.loads(line))
        if not count:
            raise ValueError("No entities to validate")
        print(json.dumps({"valid": True, "entities": count, "followthemoney": "4.11.0"}))
    except Exception as exc:
        print(json.dumps({"valid": False, "error": str(exc)}), file=sys.stderr)
        sys.exit(1)
