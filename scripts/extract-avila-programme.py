"""Reproduce the coordinate extraction with pdfplumber 0.11.9.

The original PDFium text is also retained: it repeats overlaid text and misses
vector bullet marks. This extraction is NOT a human-verified transcription.
"""
import hashlib
import json
from pathlib import Path

import pdfplumber

ROOT = Path("data/mandate/evidence/territorial/avila")
assert hashlib.sha256((ROOT / "programme.pdf").read_bytes()).hexdigest() == "50d0ba3ac4cf04eaa7e6d0d67f714fd0d648adf68c860da3888b320f6e7dba8b"
pages = []
with pdfplumber.open(ROOT / "programme.pdf") as doc:
    for number, page in enumerate(doc.pages, 1):
        page = page.dedupe_chars()
        lines = page.crop((195, 40, 585, 790)).extract_text_lines()
        bullets = sorted(set(round(c["top"], 1) for c in page.curves
                             if 208 < c["x0"] < 212 and 2 < c["width"] < 4 and 2 < c["height"] < 4))
        blocks = []
        for line in lines:
            bullet = any(abs(y - line["top"] - 4.5) < 2 for y in bullets)
            if not blocks or bullet or line["top"] - blocks[-1]["bottom"] > 10:
                blocks.append(dict(page=number, index=len(blocks), top=round(line["top"], 2),
                                   bottom=round(line["bottom"], 2), bullet=bullet, text=line["text"]))
            else:
                blocks[-1]["text"] += " " + line["text"]
                blocks[-1]["bottom"] = round(line["bottom"], 2)
        pages.append(dict(page=number, blocks=blocks, bulletCount=len(bullets)))
# Preserve the initial Windows archive's line endings on every host.
data = (json.dumps(pages, ensure_ascii=False, indent=2) + "\n").replace("\n", "\r\n").encode("utf-8")
assert hashlib.sha256(data).hexdigest() == "ee66ec39a5a7d88f9c8029e3953da5bf91d75818a61eddd4abb0496461d12711", "Review extraction changes before updating the archive"
(ROOT / "programme.layout.json").write_bytes(data)
print("51 pages extracted; no evaluation or independent review created")
