"""Protect the initial programme's scope, duplicate numbering and annex."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('ceuta_import', 'scripts/import-ceuta-programme.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class CeutaImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((importer.ROOT/'programme.pages.json').read_text(encoding='utf-8'))

    def test_reproduces_initial_programme_with_conditions_and_annex(self):
        saved = json.loads(Path('data/mandate/ceuta-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(), saved)
        self.assertEqual(saved['inventoryKind'], 'initial-programme')
        self.assertEqual(len(saved['records']), 138)
        self.assertIn('no tiene carácter exhaustivo', saved['textNote'])
        self.assertIn('incorporación al proyecto de Presupuesto para 2024', saved['textNote'])
        records = {r['id']: r for r in saved['records']}
        self.assertEqual((records['r-18-S-20']['page'], records['r-18-S-20']['endPage']), (21, 22))
        self.assertEqual((records['r-18-C-9']['page'], records['r-18-C-9']['endPage']), (24, 25))
        annex = records['r-18-F-7']['initiatives']
        self.assertEqual([a['officialId'] for a in annex], ['1', '2', '3', '4', '5'])
        self.assertIn('Nicaragua', ' '.join(a['text'] for a in annex))
        self.assertEqual(annex[-1]['page'], 28)

    def test_duplicate_official_numbers_retain_distinct_measures(self):
        records, _ = importer.parse_pages(self.pages)
        repeated = [r for r in records if r['id'].startswith('r-18-F-') and r['officialId'] in ('26', '27')]
        self.assertEqual([r['id'] for r in repeated], ['r-18-F-26', 'r-18-F-27', 'r-18-F-28', 'r-18-F-29'])
        self.assertTrue(all(r['sourceNote'] for r in repeated))
        self.assertIn('eficiencia energética', repeated[0]['text'])
        self.assertIn('autobuses', repeated[2]['text'])

    def test_missing_pages_or_renumbered_measure_are_rejected(self):
        for pages in [self.pages[:-1], list(reversed(self.pages))]:
            with self.assertRaises(ValueError): importer.parse_pages(pages)
        pages = copy.deepcopy(self.pages)
        pages[6]['text'] = pages[6]['text'].replace('26.', '28.')
        with self.assertRaisesRegex(ValueError, 'programme measures'): importer.parse_pages(pages)

    def test_missing_conditions_or_annex_phase_are_rejected(self):
        for index, text in [(28, 'incorporación al proyecto de Presupuesto para 2024'), (27, '5)')]:
            pages = copy.deepcopy(self.pages)
            # Whitespace in the PDF is normalized by the importer.
            if index == 28:
                pages[index]['text'] = '29\n' + ' '.join(pages[index]['text'].splitlines()[1:]).replace(text, '')
            else:
                pages[index]['text'] = pages[index]['text'].replace(text, '')
            with self.assertRaisesRegex(ValueError, 'Programme conditions missing' if index == 28 else 'Incomplete annex phases'): importer.parse_pages(pages)

    def test_changed_original_or_extraction_is_rejected(self):
        original = Path.read_bytes
        for filename in ['programme.pdf', 'programme.pages.json']:
            def changed(path):
                data = original(path)
                return data + b' ' if path.name == filename else data
            with patch.object(Path, 'read_bytes', changed):
                with self.assertRaisesRegex(ValueError, 'Changed'): importer.build_inventory()


if __name__ == '__main__': unittest.main()
