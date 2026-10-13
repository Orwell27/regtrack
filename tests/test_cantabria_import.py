"""Guard the official sequence, cross-page conditions and numbered non-promises."""
import copy
import importlib.util
import json
import re
import unittest
from collections import Counter
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('cantabria_import', 'scripts/import-cantabria-programme.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class CantabriaImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((importer.ROOT/'programme.ordered.json').read_text(encoding='utf-8'))
        cls.raw = json.loads((importer.ROOT/'programme.pages.json').read_text(encoding='utf-8'))

    def test_inventory_reproduces_all_author_numbers_and_chapters(self):
        saved = json.loads(Path('data/mandate/cantabria-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(), saved)
        self.assertEqual([int(r['officialId']) for r in saved['records']], list(range(1, 1229)))
        self.assertEqual(len({r['topic'] for r in saved['records']}), 20)
        self.assertEqual(len(saved['contextBlocks']), 137)

    def test_every_character_is_retained_in_records_or_context(self):
        rows, contexts = importer.parse_pages(self.pages, self.raw)
        parts = []
        for p in self.pages:
            for s in p['spans']:
                text = re.sub(r'^([\d ]+)\.\s*', '', s['text']) if s['size'] == 8.5 else s['text']
                parts.append(text)
        parts.extend(p['text'] for p in self.raw if p['page'] <= 6)
        chars = lambda s: Counter(''.join(s.split()))
        self.assertEqual(chars(''.join(parts)), chars(''.join(r['rawText'] for r in rows+contexts)))

    def test_preserves_quota_subclauses_and_does_not_import_education_principles(self):
        rows, contexts = importer.parse_pages(self.pages, self.raw)
        quota = rows[28]
        self.assertEqual((quota['page'], quota['endPage']), (11, 12))
        for fragment in ['societarios', 'menores de 30 años y mayores de 50', 'dos primeros años']:
            self.assertIn(fragment, quota['text'])
        self.assertNotIn('Los autónomos: valentía', rows[32]['text'])
        self.assertIn('Equidad Educativa', ' '.join(c['text'] for c in contexts))
        self.assertNotIn('Equidad Educativa', ' '.join(r['text'] for r in rows))
        self.assertTrue(rows[977]['text'].endswith('terrorismo-'))
        self.assertEqual((rows[978]['page'], rows[978]['endPage']), (168, 169))
        self.assertIn('instituciones para implementar', rows[978]['text'])
        self.assertIn('Abono Transporte Joven con una tarifa plana', rows[1197]['text'])
        self.assertIn('20 euros', rows[1197]['text'])

    def test_missing_or_renumbered_marker_fails(self):
        for replacement in ['1. ', '980. ']:
            pages = copy.deepcopy(self.pages)
            marker = next(s for p in pages for s in p['spans'] if s['size'] == 8.5 and s['text'].startswith('979.'))
            marker['text'] = replacement
            with self.assertRaisesRegex(ValueError, 'sequence'): importer.parse_pages(pages, self.raw)

    def test_modified_pdf_or_extraction_fails(self):
        original = Path.read_bytes
        for filename in ['programme.pdf', 'programme.pages.json', 'programme.ordered.json']:
            def changed(path):
                data = original(path)
                return data+b' ' if path.name == filename else data
            with patch.object(Path, 'read_bytes', changed):
                with self.assertRaisesRegex(ValueError, 'Changed'): importer.build_inventory()

    def test_registered_originals_and_auxiliary_extractions_are_unchanged(self):
        spec = importlib.util.spec_from_file_location('cantabria_sources', 'scripts/register-cantabria-sources.py')
        registry = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(registry)
        saved = json.loads(Path('data/mandate/evidence/territorial/sources.json').read_text(encoding='utf-8'))
        self.assertEqual(registry.build_sources(), [s for s in saved if s['jurisdictionId'] == 'r-06'])
        raw = json.loads((importer.ROOT/'transport-law-2026.pages.json').read_text(encoding='utf-8'))
        self.assertIn('Decreto 48/2026', raw[0]['text'])
        self.assertIn('31 de octubre de 2027', raw[1]['text'])
        self.assertIn('no supere el 30 por ciento', ' '.join(raw[1]['text'].split()))


if __name__ == '__main__': unittest.main()
