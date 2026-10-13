"""Guard scanned-page coverage, OCR caveats, dates and cross-page clause boundaries."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('aragon_import', 'scripts/import-aragon-programme.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class AragonImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((importer.ROOT/'programme.ordered.json').read_text(encoding='utf-8'))

    def test_reproduction_preserves_caveats_and_current_mandate(self):
        saved = json.loads(Path('data/mandate/aragon-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(), saved)
        self.assertEqual(saved['mandateId'], 'r-02-2026')
        self.assertEqual(saved['inventoryTotal'], 117)
        self.assertTrue(saved['transcriptionPending'])
        self.assertTrue(saved['programmeCopy'])
        self.assertEqual(len(saved['contextBlocks']), 17)
        self.assertEqual(len({r['topic'] for r in saved['records']}), 13)

    def test_every_non_decorative_ocr_line_has_exactly_one_owner(self):
        records, contexts = importer.parse_pages(self.pages)
        expected = sorted((p['page'], l['index'], l['text']) for p in self.pages
            for l in p['lines'] if l['kind'] != 'decoration')
        actual = sorted((f['page'], f['index'], f['text']) for r in records+contexts for f in r['fragments'])
        self.assertEqual(expected, actual)

    def test_cross_page_continuations_do_not_move_to_next_chapter(self):
        records, contexts = importer.parse_pages(self.pages)
        self.assertEqual((records[77]['page'], records[77]['endPage']), (28, 29))
        self.assertEqual(records[77]['topic'], 'Economía, energía e industria')
        self.assertIn('cuota cero', records[77]['text'])
        self.assertNotIn('Gratuidad de la educación infantil', records[77]['text'])
        self.assertEqual(records[78]['topic'], 'Educación y universidad')
        self.assertEqual((records[87]['page'], records[87]['endPage']), (31, 32))
        self.assertTrue(records[87]['text'].endswith('Plazo: desde el curso 2026/2027.'))
        self.assertNotIn('Incrementar el presupuesto de Sanidad', records[87]['text'])
        self.assertIn('2027, 2028, 2029 y 2030', ' '.join(c['text'] for c in contexts))

    def test_table_and_conflicting_dates_survive(self):
        records, _ = importer.parse_pages(self.pages)
        fiscal, education = records[1], records[80]
        for fragment in ['1 persona / 20.000 € / 150 €', '2 personas / 30.000 € / 175 €', '3 o más personas / 40.000 € / 300 €', 'desde el ejercicio 2028']:
            self.assertIn(fragment, fiscal['text'])
        self.assertIn('desde el ejercicio 2027', education['text'])
        self.assertIn('discrepancia', fiscal['sourceNote'])
        self.assertIn('discrepancia', education['sourceNote'])
        self.assertNotIn('discrepancia', records[82]['sourceNote'])
        self.assertIn('curso académico 2026-2027', records[79]['text'])

    def test_missing_page_marker_or_modified_evidence_fails(self):
        with self.assertRaisesRegex(ValueError, 'Missing'): importer.parse_pages(self.pages[:-1])
        pages = copy.deepcopy(self.pages)
        next(l for l in pages[3]['lines'] if l['kind'] == 'marker')['kind'] = 'body'
        with self.assertRaises(ValueError): importer.parse_pages(pages)
        original = Path.read_bytes
        for name in ['programme.pdf', 'programme.pages.json', 'programme.ocr.json', 'programme.ordered.json']:
            def changed(path):
                data = original(path)
                return data+b' ' if path.name == name else data
            with patch.object(Path, 'read_bytes', changed):
                with self.assertRaisesRegex(ValueError, 'Changed'): importer.build_inventory()

    def test_source_registration_and_identical_copies(self):
        spec = importlib.util.spec_from_file_location('aragon_sources', 'scripts/register-aragon-sources.py')
        registry = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(registry)
        saved = json.loads(Path('data/mandate/evidence/territorial/sources.json').read_text(encoding='utf-8'))
        sources = registry.build_sources()
        self.assertEqual(sources, [s for s in saved if s['jurisdictionId'] == 'r-02'])
        self.assertEqual(sources[0]['sha256'], sources[1]['sha256'])
        self.assertEqual(sources[0]['family'], sources[1]['family'])
        self.assertEqual(len({s['family'] for s in sources}), 6)


if __name__ == '__main__': unittest.main()
