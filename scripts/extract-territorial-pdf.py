"""Keep page-level text beside an immutable public PDF, without interpreting it."""
import hashlib
import json
import sys
from pathlib import Path

from pypdf import PdfReader, __version__

source = Path(sys.argv[1])
destination = Path(sys.argv[2])
data = source.read_bytes()
if not data.startswith(b"%PDF-"):
    raise ValueError("Expected an original PDF")
reader = PdfReader(source)
extraction = {
    "sourceSha256": hashlib.sha256(data).hexdigest(),
    "extractor": f"pypdf {__version__}",
    "normalization": "Texto extraído por página. Los saltos de línea y guiones de maquetación se conservan aquí; no es una revisión editorial.",
    "pages": [{"page": i + 1, "text": page.extract_text()} for i, page in enumerate(reader.pages)],
}
destination.write_text(json.dumps(extraction, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Extracted {len(reader.pages)} pages; source SHA-256 {extraction['sourceSha256']}")
