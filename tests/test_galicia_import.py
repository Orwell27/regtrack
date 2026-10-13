"""Keep visible promises, continuation cells and provenance intact."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('galicia', 'scripts/import-galicia-programme.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class GaliciaImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cells = json.loads((importer.ROOT/'programme.cells.json').read_text(encoding='utf-8'))
        cls.pages = json.loads((importer.ROOT/'programme.pages.json').read_text(encoding='utf-8'))

    def test_reproduces_numbered_inventory_without_claiming_full_review(self):
        saved = json.loads(Path('data/mandate/galicia-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(), saved)
        self.assertEqual(saved['inventoryTotal'], 793)
        self.assertEqual(len(saved['contextBlocks']), 159)
        self.assertTrue(saved['transcriptionPending'])
        self.assertEqual(saved['inventoryKind'], 'numbered-sections')
        by_id = {r['id']: r for r in saved['records']}
        for id, pages in [('9-18', (29, 30)), ('12-1', (37, 38)), ('64-4', (149, 150)), ('72-4', (169, 170))]:
            item = by_id['r-12-'+id]
            self.assertEqual((item['page'], item['endPage']), pages)
            self.assertEqual(len(item['fragments']), 2)
        self.assertIn('8.000', by_id['r-12-3-4']['text'])
        self.assertIn('2028', by_id['r-12-3-4']['text'])
        self.assertIn('Sanidad penitenciaria', by_id['r-12-72-4']['text'])
        self.assertIn('cotejado visualmente', by_id['r-12-72-4']['sourceNote'])
        self.assertNotIn('Ordenación do sector pesqueiro', by_id['r-12-72-4']['text'])
        self.assertNotIn('\x02', ''.join(r['text'] for r in saved['records']))

    def test_every_visible_cell_is_consumed_once_without_counting_continuations_twice(self):
        records, _ = importer.parse_cells(self.cells, self.pages)
        fragments = [f for record in records for f in record['fragments']]
        expected = [(p['page'], i) for p in self.cells for i, _ in enumerate(p['cells'])]
        self.assertEqual([(f['page'], f['cell']) for f in fragments], expected)
        self.assertEqual(len(expected), 797)
        for f in fragments:
            self.assertEqual(f['text'], self.cells[f['page']-1]['cells'][f['cell']]['text'])

    def test_dropped_page_cell_or_changed_number_is_rejected(self):
        for mutate in [lambda p: p.pop(), lambda p: p[17]['cells'].pop(3),
                       lambda p: p[29]['cells'][0].update(number='19'),
                       lambda p: p[168]['cells'][3].update(number='8')]:
            changed = copy.deepcopy(self.cells)
            mutate(changed)
            with self.assertRaises(ValueError): importer.parse_cells(changed, self.pages)

    def test_changed_pdf_extraction_or_geometry_fails(self):
        original = Path.read_bytes
        for filename in ['programme.pdf', 'programme.pages.json', 'programme.cells.json']:
            def changed(path):
                data = original(path)
                return data+b' ' if path.name == filename else data
            with patch.object(Path, 'read_bytes', changed):
                with self.assertRaisesRegex(ValueError, 'Changed'): importer.build_inventory()


if __name__ == '__main__': unittest.main()
