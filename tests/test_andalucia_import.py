"""Prevent reordered OCR, missed continuations and silent deadline corrections."""
import copy,importlib.util,json,unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('andalucia','scripts/import-andalucia-programme.py')
importer=importlib.util.module_from_spec(spec);spec.loader.exec_module(importer)

class AndaluciaImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.pages=json.loads((importer.ROOT/'programme.ordered.json').read_text(encoding='utf-8'))

    def test_reproduces_numbered_sections_and_preserves_deadlines(self):
        saved=json.loads(Path('data/mandate/andalucia-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(),saved)
        self.assertEqual([r['officialId'] for r in saved['records']],[str(n) for n in range(1,151)])
        self.assertEqual(len(saved['contextBlocks']),20)
        self.assertTrue(saved['programmeCopy']);self.assertTrue(saved['transcriptionPending'])
        rows=saved['records']
        self.assertIn('0 a 1 años',rows[62]['text'])
        self.assertIn('2026/2027',rows[62]['text'])
        self.assertIn('primer semestre de 2026',rows[73]['text'])
        self.assertIn('anterior a la firma',rows[73]['sourceNote'])
        self.assertEqual((rows[87]['page'],rows[87]['endPage']),(36,37))
        self.assertIn('tres primeros meses',rows[87]['text'])
        self.assertEqual(rows[32]['topic'],'Familia')
        self.assertTrue(rows[10]['text'].startswith('Impuesto de Sucesiones'))
        self.assertIn('2027, 2028, 2029 y 2030',rows[0]['text'])

    def test_every_body_line_has_exactly_one_destination(self):
        rows,contexts=importer.parse_pages(self.pages)
        fragments=[f for r in rows+contexts for f in r['fragments']]
        expected=[(p['page'],l['index']) for p in self.pages for l in p['lines'] if l['kind']!='decoration']
        self.assertEqual(sorted((f['page'],f['index']) for f in fragments),sorted(expected))
        for f in fragments:self.assertEqual(f['text'],self.pages[f['page']-1]['lines'][f['index']]['text'])

    def test_missing_page_duplicate_and_reordered_numbers_fail(self):
        for mode in ['page','duplicate','reorder']:
            pages=copy.deepcopy(self.pages)
            if mode=='page':pages.pop(35)
            else:
                marker=next(l for l in pages[27]['lines'] if l['kind']=='marker')
                if mode=='duplicate':marker['ordinal']=62
                else:marker['y']=1570
            with self.assertRaises(ValueError):importer.parse_pages(pages)

    def test_changed_original_ocr_or_ordering_fails(self):
        original=Path.read_bytes
        for filename in ['programme.pdf','programme.pages.json','programme.ocr.json','programme.ordered.json']:
            def changed(path):return original(path)+(b' ' if path.name==filename else b'')
            with patch.object(Path,'read_bytes',changed):
                with self.assertRaisesRegex(ValueError,'Changed'):importer.build_inventory()

if __name__=='__main__':unittest.main()
