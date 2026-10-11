"""Preserve numbered points, page continuations and every non-logo OCR line."""
import copy,importlib.util,json,unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('castellon','scripts/import-castellon-programme.py')
importer=importlib.util.module_from_spec(spec);spec.loader.exec_module(importer)

class CastellonImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.pages=json.loads((importer.ROOT/'programme.ocr.json').read_text(encoding='utf-8-sig'))

    def test_reproduces_points_without_absorbing_organisation(self):
        saved=json.loads(Path('data/mandate/castellon-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(),saved)
        self.assertEqual([r['officialId'] for r in saved['records']],[str(n) for n in range(1,91)])
        self.assertEqual(len(saved['contextBlocks']),20)
        self.assertTrue(saved['transcriptionPending']);self.assertTrue(saved['programmeCopy'])
        rows=saved['records']
        self.assertEqual(rows[5]['text'],'Puesta en marcha de la Policía de Barrio.')
        self.assertTrue(rows[6]['text'].startswith('Incremento de medios técnicos'))
        self.assertIn('recupera visualmente',rows[6]['sourceNote'])
        self.assertEqual((rows[14]['page'],rows[14]['endPage']),(2,3))
        self.assertIn('Protocolo',rows[14]['text'])
        self.assertEqual((rows[41]['page'],rows[41]['endPage']),(4,5))
        self.assertIn('PYMES',rows[41]['text'])
        self.assertNotIn('Tercero',rows[-1]['text'])
        self.assertTrue(any('Tercero' in c['text'] for c in saved['contextBlocks']))

    def test_every_body_line_has_exactly_one_destination(self):
        rows,contexts=importer.parse_pages(self.pages)
        expected=[(p['page'],i) for p in self.pages for i,l in enumerate(p['lines']) if min(w['y'] for w in l['words'])>=160]
        fragments=[f for r in rows+contexts for f in r['fragments']]
        self.assertEqual(sorted((f['page'],f['index']) for f in fragments),sorted(expected))
        for f in fragments:self.assertEqual(f['text'],self.pages[f['page']-1]['lines'][f['index']]['text'])

    def test_missing_page_and_duplicate_point_fail(self):
        for mode in ['page','duplicate','reorder']:
            pages=copy.deepcopy(self.pages)
            if mode=='page':pages.pop(5)
            elif mode=='duplicate':pages[1]['lines'][3]['text']='2- Duplicado'
            else:
                for w in pages[1]['lines'][10]['words']:w['y']=700
            with self.assertRaises(ValueError):importer.parse_pages(pages)

    def test_changed_evidence_fails(self):
        original=Path.read_bytes
        for filename in ['programme.pdf','programme.pages.json','programme.ocr.json']:
            def changed(path):return original(path)+(b' ' if path.name==filename else b'')
            with patch.object(Path,'read_bytes',changed):
                with self.assertRaisesRegex(ValueError,'Changed evidence'):importer.build_inventory()

if __name__=='__main__':unittest.main()
