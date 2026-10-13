"""The programme's complete descriptions must survive column extraction."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('bilbao_import', 'scripts/import-bilbao-programme.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class BilbaoImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((importer.ROOT/'programme.pages.json').read_text(encoding='utf-8'))['pages']

    def test_reproduces_80_full_descriptions_including_narrow_euskara_column(self):
        saved = json.loads(Path('data/mandate/bilbao-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.import_inventory(), saved)
        self.assertEqual(len(saved['records']), 80)
        records = {r['officialId']: r for r in saved['records']}
        self.assertIn('al menos, 600 nuevas iniciativas', records['1.6']['programmeText'])
        self.assertIn('en torno a 200 nuevos recursos', records['6.3']['programmeText'])
        self.assertIn('unos 23 millones de euros', records['6.3']['programmeText'])
        self.assertIn('dos veces al año', records['9.1']['programmeText'])
        self.assertIn('Modernización Municipal 2030', records['10.5']['programmeText'])
        self.assertTrue(all('governmentReport' not in r for r in saved['records']))

    def test_page_loss_or_reordering_fails(self):
        for pages in [self.pages[1:], [self.pages[1],self.pages[0]]+self.pages[2:]]:
            with self.assertRaisesRegex(ValueError, 'Incomplete programme pages'): importer.parse_pages(pages)

    def test_missing_or_duplicate_number_fails(self):
        for replacement in ['1.2-', '']:
            pages = copy.deepcopy(self.pages)
            marker = next(s for s in pages[12]['spans'] if s['text'] == '1.1-')
            marker['text'] = replacement
            with self.assertRaisesRegex(ValueError, 'Missing or duplicate action'): importer.parse_pages(pages)

    def test_missing_description_or_unknown_column_fails(self):
        pages = copy.deepcopy(self.pages)
        pages[12]['spans'] = [s for s in pages[12]['spans'] if s['x'] < 200]
        with self.assertRaisesRegex(ValueError, 'Missing title or description'): importer.parse_pages(pages)
        pages = copy.deepcopy(self.pages)
        next(s for s in pages[12]['spans'] if s['x'] > 200 and 100 < s['y'] < 400)['x'] = 180
        with self.assertRaisesRegex(ValueError, 'Unknown text column'): importer.parse_pages(pages)

    def test_changed_original_or_extraction_fails_before_import(self):
        original = Path.read_bytes
        for filename, error in [('programme.pdf','Changed programme original'), ('programme.pages.json','Changed programme extraction')]:
            def changed(path):
                data = original(path)
                return data+b' ' if path.name == filename else data
            with patch.object(Path, 'read_bytes', changed):
                with self.assertRaisesRegex(ValueError, error): importer.import_inventory()


if __name__ == '__main__': unittest.main()
