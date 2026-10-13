"""Preserve the complete published plan, including its imperfect numbering."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('canarias_import', 'scripts/import-canarias-strategy.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class CanariasImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((importer.ROOT/'strategy.columns.json').read_text(encoding='utf-8'))['pages']

    def test_reproduces_the_full_plan_without_calling_it_political_promises(self):
        saved = json.loads(Path('data/mandate/canarias-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(), saved)
        self.assertEqual(saved['inventoryKind'], 'strategic-plan')
        self.assertEqual(len(saved['records']), 145)
        self.assertEqual(sum(len(r['initiatives']) for r in saved['records']), 788)
        self.assertEqual(len({r['topic'] for r in saved['records']}), 13)
        records = {r['officialId']: r for r in saved['records']}
        self.assertEqual(records['S.OEst.3']['text'], 'Garantizar el cumplimiento de los derechos de los usuarios sanitarios.')
        self.assertEqual((records['S.OEst.3']['page'], records['S.OEst.3']['endPage']), (58, 59))
        self.assertIn('70.000 donantes anuales', records['S.OEst.9']['initiatives'][0]['text'])
        self.assertIn('3 meses', records['S.OEst.1']['initiatives'][0]['text'])

    def test_preserves_duplicate_printed_code_with_two_distinct_texts_and_internal_ids(self):
        records = importer.parse_pages(self.pages)
        duplicates = [c for r in records for c in r['initiatives'] if c['officialId'] == 'BSIJIF.OEsp.3.2']
        self.assertEqual([c['page'] for c in duplicates], [54, 55])
        self.assertEqual(len({c['id'] for c in duplicates}), 2)
        self.assertEqual(len({c['text'] for c in duplicates}), 2)
        self.assertTrue(all(c['sourceNote'] for c in duplicates))
        codes = [c['officialId'] for r in records for c in r['initiatives']]
        self.assertNotIn('OPVM.OEsp.4.6', codes)
        self.assertIn('OPVM.OEsp.4.7', codes)
        self.assertIn('OPVM.OEsp.1.1', codes)  # Original code has no trailing dot.

    def test_missing_pages_tables_and_objectives_are_rejected(self):
        for pages in [self.pages[:-1], list(reversed(self.pages))]:
            with self.assertRaises(ValueError): importer.parse_pages(pages)
        pages = copy.deepcopy(self.pages)
        del pages[7]['strategic']
        with self.assertRaises(ValueError): importer.parse_pages(pages)
        pages = copy.deepcopy(self.pages)
        pages[57]['specific'] = pages[57]['specific'].replace('S. OEsp.1.1.', '')
        with self.assertRaises(ValueError): importer.parse_pages(pages)

    def test_silently_correcting_an_official_duplicate_is_rejected(self):
        pages = copy.deepcopy(self.pages)
        pages[54]['specific'] = pages[54]['specific'].replace('BSIJIF. OEsp.3.2.', 'BSIJIF. OEsp.3.28.')
        with self.assertRaisesRegex(ValueError, 'duplicate'): importer.parse_pages(pages)

    def test_changed_original_or_extraction_is_rejected(self):
        original = Path.read_bytes
        for filename in ['strategy.pdf', 'strategy.columns.json']:
            def changed(path):
                data = original(path)
                return data + b' ' if path.name == filename else data
            with patch.object(Path, 'read_bytes', changed):
                with self.assertRaisesRegex(ValueError, 'Changed'): importer.build_inventory()


if __name__ == '__main__': unittest.main()
