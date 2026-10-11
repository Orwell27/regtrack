"""Original promises and later reports must remain complete and independently identified."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('vitoria_import', 'scripts/import-vitoria-programme.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class VitoriaImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((importer.ROOT/'vitoria-programme-2023.pages.json').read_text(encoding='utf-8'))['pages']
        cls.html = (importer.ROOT/'vitoria-report-2026.html').read_text(encoding='utf-8')

    def test_reproduces_full_inventory_and_checks_original_hashes(self):
        saved = json.loads(Path('data/mandate/vitoria-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.import_inventory(), saved)
        self.assertEqual(len(saved['records']), 100)
        self.assertEqual(saved['records'][0]['officialId'], '1.1')
        self.assertEqual(saved['records'][-1]['officialId'], '6.12')
        self.assertTrue(all('BENEFICIOS PARA LA CIUDADANÍA' in r['programmeText'] for r in saved['records']))

    def test_missing_or_duplicate_page_fails(self):
        for pages in [self.pages[1:], self.pages[:-1]+[self.pages[0]]]:
            with self.assertRaisesRegex(ValueError, 'Incomplete programme pages'):
                importer.parse_programme(pages)

    def test_missing_conditions_fail(self):
        pages = copy.deepcopy(self.pages)
        pages[6]['text'] = pages[6]['text'].replace('HITOS PRINCIPALES', 'HITOS OMITIDOS')
        with self.assertRaisesRegex(ValueError, 'Missing commitment section'):
            importer.parse_programme(pages)

    def test_duplicate_promise_fails(self):
        pages = copy.deepcopy(self.pages)
        pages[7]['text'] = pages[7]['text'].replace('Compromiso 1.2', 'Compromiso 1.1')
        with self.assertRaisesRegex(ValueError, 'Invalid commitment sequence'):
            importer.parse_programme(pages)

    def test_missing_report_fails(self):
        html = self.html.replace('a29-compromiso a29-level-3 a29-accordion', 'missing', 1)
        with self.assertRaisesRegex(ValueError, 'Incomplete municipal follow-up'):
            importer.parse_report(html)

    def test_invalid_percentage_fails(self):
        html = self.html.replace('<progress value="100" max="100">100%</progress>', '<progress value="101" max="100">101%</progress>', 1)
        self.assertNotEqual(html, self.html)
        with self.assertRaisesRegex(ValueError, 'Invalid municipal follow-up header'):
            importer.parse_report(html)

    def test_changed_title_is_not_silently_matched(self):
        original = importer.parse_report(self.html)
        original[0]['title'] = 'Una promesa diferente'
        with patch.object(importer, 'parse_report', return_value=original):
            with self.assertRaisesRegex(ValueError, 'Unreviewed title differences'):
                importer.import_inventory()

    def test_changed_original_fails(self):
        sources = json.loads((importer.ROOT/'sources.json').read_text(encoding='utf-8'))
        source = next(s for s in sources if s['id'] == 'vitoria-programme-2023')
        source['sha256'] = '0'*64
        with self.assertRaisesRegex(ValueError, 'Changed source original'):
            importer.verified_source(source['id'], sources)


if __name__ == '__main__': unittest.main()
