"""Reject lost pages, renumbering and OCR corruption; preserve submeasures and deadlines."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result)
    return result

importer = module('cyl', 'scripts/import-cyl-programme.py')
extractor = module('cyl_extract', 'scripts/extract-cyl-programme.py')

class CylImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((importer.ROOT/'programme.ordered.json').read_text(encoding='utf-8'))

    def test_reproduction_and_scope(self):
        saved = json.loads(Path('data/mandate/cyl-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(), saved)
        self.assertEqual(len(saved['records']), 220)
        self.assertEqual(len(saved['contextBlocks']), 25)
        self.assertTrue(saved['programmeCopy']); self.assertTrue(saved['transcriptionPending'])
        rows = {r['officialId']: r for r in saved['records']}
        self.assertIn('2027, 2028, 2029 y 2030', rows['1.1']['text'])
        self.assertEqual((rows['1.2']['page'], rows['1.2']['endPage']), (4, 5))
        self.assertIn('1.2.8', rows['1.2']['text'])
        self.assertIn('desde el arranque', rows['1.2']['text'])
        self.assertIn('primer presupuesto', rows['15.3']['text'])
        self.assertIn('No más menores', rows['10.1']['text'])
        self.assertIn('numeración', rows['11.8']['sourceNote'].lower())
        self.assertIn('convivencia', rows['13.5']['text'])
        self.assertNotIn('REPARTO DE RESPONSABILIDADES', rows['19.2']['text'])

    def test_every_recognized_body_line_has_one_destination(self):
        records, contexts = importer.parse_pages(self.pages)
        fragments = [f for item in records+contexts for f in item['fragments']]
        expected = [(p['page'], l['index']) for p in self.pages for l in p['lines'] if l['kind'] != 'decoration']
        self.assertEqual(sorted((f['page'], f['index']) for f in fragments), sorted(expected))
        for f in fragments:
            self.assertEqual(f['text'], self.pages[f['page']-1]['lines'][f['index']]['text'])

    def test_missing_duplicate_or_reordered_sections_fail(self):
        for mode in ['page', 'duplicate', 'missing', 'reorder']:
            pages = copy.deepcopy(self.pages)
            if mode == 'page': pages.pop(33)
            else:
                marker = next(l for l in pages[43]['lines'] if l['kind'] == 'marker')
                if mode == 'duplicate': marker['officialId'] = '12.17'
                if mode == 'missing': marker['kind'] = 'body'
                if mode == 'reorder': marker['y'] = 1170
            with self.assertRaises(ValueError): importer.parse_pages(pages)

    def test_classification_reproduces_and_rejects_changed_corrected_marker(self):
        pages = json.loads((importer.ROOT/'programme.ocr.json').read_text(encoding='utf-8'))
        self.assertEqual(extractor.classify(pages), self.pages)
        pages[37]['lines'][23]['text'] = '2.8 Otro apartado'
        with self.assertRaisesRegex(ValueError, 'corrected OCR'): extractor.classify(pages)

    def test_changed_source_or_transcription_fails(self):
        original = Path.read_bytes
        for filename in ['programme.pdf', 'programme.pages.json', 'programme.ocr.json', 'programme.ordered.json']:
            def changed(path): return original(path)+(b' ' if path.name == filename else b'')
            with patch.object(Path, 'read_bytes', changed):
                with self.assertRaisesRegex(ValueError, 'Changed'): importer.build_inventory()

if __name__ == '__main__': unittest.main()
