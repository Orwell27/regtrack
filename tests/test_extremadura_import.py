"""Conserve both main-bullet glyphs and sublists without inventing official IDs."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('extremadura', 'scripts/import-extremadura-programme.py')
importer = importlib.util.module_from_spec(spec); spec.loader.exec_module(importer)

class ExtremaduraImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((importer.ROOT/'programme.pages.json').read_text(encoding='utf-8'))

    def test_reproduction_and_preserved_conditions(self):
        saved = json.loads(Path('data/mandate/extremadura-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(), saved)
        self.assertEqual(len(saved['records']), 62)
        self.assertEqual(len(saved['contextBlocks']), 14)
        self.assertTrue(saved['transcriptionPending'])
        self.assertIn('61 puntos y 74 medidas', saved['textNote'])
        rows = {r['id']: r for r in saved['records']}
        self.assertIn('ENRESA', rows['r-11-1']['text'])
        self.assertIn('primeras medidas antes de septiembre', rows['r-11-6']['text'])
        self.assertIn('primer presupuesto', rows['r-11-32']['text'])
        self.assertIn('septiembre de 2026', rows['r-11-50']['text'])
        self.assertEqual((rows['r-11-19']['page'],rows['r-11-19']['endPage']), (9,10))
        self.assertIn('Senador por designación autonómica', rows['r-11-62']['text'])

    def test_every_body_line_has_exactly_one_destination(self):
        rows, contexts = importer.parse_pages(self.pages)
        fragments = [f for r in rows+contexts for f in r['fragments']]
        expected = [(p['page'],i) for p in self.pages for i,_ in importer.body_lines(p)]
        self.assertEqual(sorted((f['page'],f['index']) for f in fragments),sorted(expected))
        for f in fragments:
            self.assertEqual(f['text'],self.pages[f['page']-1]['text'].splitlines()[f['index']].strip())
        self.assertEqual(sum(r['rawText'].startswith('\uf0b7') for r in rows),10)

    def test_page_marker_bullet_or_chapter_loss_fails(self):
        for mode in ['page','duplicate','order','bullet','chapter','printed']:
            pages = copy.deepcopy(self.pages)
            if mode == 'page': pages.pop(12)
            elif mode == 'duplicate': pages.insert(3,pages[3])
            elif mode == 'order': pages[3],pages[4] = pages[4],pages[3]
            elif mode == 'bullet': pages[13]['text'] = pages[13]['text'].replace('\uf0b7','',1)
            elif mode == 'chapter': pages[13]['text'] = pages[13]['text'].replace('REBAJA DE IMPUESTOS','OTRO CAPÍTULO')
            else: pages[13]['text'] = pages[13]['text'].replace('14','15',1)
            with self.subTest(mode=mode):
                with self.assertRaises(ValueError): importer.parse_pages(pages)

    def test_changed_bytes_or_extraction_fails(self):
        original = Path.read_bytes
        for filename in ['programme.pdf','programme.pages.json']:
            def changed(path): return original(path)+(b' ' if path.name == filename else b'')
            with patch.object(Path,'read_bytes',changed):
                with self.assertRaisesRegex(ValueError,'Changed evidence'): importer.build_inventory()

if __name__ == '__main__': unittest.main()
