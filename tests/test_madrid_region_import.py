"""Protect spread order, continuation text and original section boundaries."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('madrid_region', 'scripts/import-madrid-region-programme.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class MadridRegionImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((importer.ROOT/'programme.ordered.json').read_text(encoding='utf-8'))

    def test_reproduces_original_numbering_and_keeps_continuations_and_decimal_numbers(self):
        saved = json.loads(Path('data/mandate/madrid-region-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(), saved)
        self.assertEqual(saved['inventoryTotal'], 459)
        self.assertEqual(len(saved['contextBlocks']), 75)
        self.assertTrue(saved['transcriptionPending'])
        by_id = {r['officialId']: r for r in saved['records']}
        for id, pages in [('3.7', (16, 17)), ('6.21', (34, 35)), ('7.38', (40, 41)), ('11.1', (56, 57))]:
            self.assertEqual((by_id[id]['page'], by_id[id]['endPage']), pages)
        self.assertIn('3.000. Todos los niños', by_id['6.12']['text'])
        self.assertTrue(by_id['6.12']['text'].endswith('tendrán plaza pública.'))
        self.assertIn('menos de 600 euros al mes', by_id['10.17']['text'])
        self.assertEqual(by_id['5.2']['page'], 27)  # printed page 52 is not PDF page 52
        self.assertEqual(by_id['10.17']['page'], 54)

    def test_every_extracted_line_has_exactly_one_destination(self):
        records, contexts = importer.parse_pages(self.pages)
        fragments = [f for r in records+contexts for f in r['fragments']]
        expected = [(p['page'], i) for p in self.pages for i, _ in enumerate(p['lines'])]
        self.assertEqual(sorted((f['page'], f['line']) for f in fragments), expected)
        for f in fragments:
            line = self.pages[f['page']-1]['lines'][f['line']]
            self.assertEqual(f['column'], line['column'])
            self.assertTrue(line['text'].endswith(f['text']))

    def test_missing_spread_section_or_renumbered_section_fails(self):
        for mutation in ['page', 'section', 'number']:
            changed = copy.deepcopy(self.pages)
            if mutation == 'page': changed.pop(30)
            else:
                lines = changed[26]['lines']
                index = next(i for i, line in enumerate(lines) if line['text'].startswith('5.2.'))
                if mutation == 'section': lines.pop(index)
                else: lines[index]['text'] = lines[index]['text'].replace('5.2.', '5.9.', 1)
            with self.assertRaises(ValueError): importer.parse_pages(changed)

    def test_changed_original_or_extraction_fails(self):
        original = Path.read_bytes
        for filename in ['programme.pdf', 'programme.pages.json', 'programme.ordered.json']:
            def changed(path):
                data = original(path)
                return data+b' ' if path.name == filename else data
            with patch.object(Path, 'read_bytes', changed):
                with self.assertRaisesRegex(ValueError, 'Changed'): importer.build_inventory()


if __name__ == '__main__': unittest.main()
