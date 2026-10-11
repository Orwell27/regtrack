import copy
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('alicante','scripts/import-alicante-programme.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class AlicanteImportTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.pages=json.loads((m.ROOT/'programme.ordered.json').read_text(encoding='utf-8'))
 def test_reproduction_and_real_promise_boundaries(self):
  x=m.build_inventory();self.assertEqual(x,json.loads(Path('data/mandate/alicante-inventory.json').read_text(encoding='utf-8')))
  self.assertEqual(len(x['records']),901);self.assertEqual(len(x['contextBlocks']),62)
  self.assertIn('comercios centenarios',x['records'][42]['text'])
  self.assertEqual(x['records'][671]['text'],'Ejecución de la obra del nuevo Centro de Congresos de la ciudad de Alicante.')
  self.assertIn('Solicitud del Sello',x['records'][889]['text'])
  office=next(r for r in x['records'] if r['text'].startswith('Creación Oficina Smart City Alicante'))
  self.assertIn('Smart People',office['text']);self.assertIn('Smart Living',office['text'])
  self.assertNotIn('Plan de Identidad',office['text'])
 def test_every_non_decoration_ocr_line_preserved_once(self):
  rows,contexts=m.parse_pages(self.pages);seen={}
  for row in rows+contexts:
   for f in row['fragments']:
    key=(f['page'],f['index']);self.assertNotIn(key,seen);seen[key]=f['text']
  expected={(p['page'],l['index']):l['text']for p in self.pages for l in p['lines']if l['kind']!='decoration'}
  self.assertEqual(seen,expected)
 def test_column_order_and_missed_bullets(self):
  rows,_=m.parse_pages(self.pages)
  page5=[r for r in rows if r['page']==5]
  self.assertTrue(page5[0]['text'].startswith('Programa'))
  left=next(r for r in page5 if r['text'].startswith('Ayudar en la búsqueda'))
  right=next(r for r in page5 if r['text'].startswith('Aumentar los programas'))
  self.assertLess(rows.index(left),rows.index(right))
  senior=next(r for r in page5 if r['text'].startswith('Talento Senior'))
  self.assertIn('mayores de 55 años',senior['text']);self.assertNotIn('Laboratorio',senior['text'])
  self.assertTrue(next(r for r in rows if r['id']=='m-03014-116')['text'].endswith('SUICIDIO JUVENIL.'))
 def test_changed_page_or_marker_fails(self):
  for mutation in ['page','marker']:
   ps=copy.deepcopy(self.pages)
   if mutation=='page':ps.pop()
   else:next(l for l in ps[5]['lines']if l['kind']=='marker')['kind']='text'
   with self.subTest(mutation=mutation):
    with self.assertRaises(ValueError):m.parse_pages(ps)
 def test_changed_original_or_extraction_fails(self):
  original=Path.read_bytes
  for file in ['programme.pdf','programme.pages.json','programme.ocr.json','programme.ordered.json']:
   def changed(path):return original(path)+(b' 'if path.name==file else b'')
   with patch.object(Path,'read_bytes',changed):
    with self.assertRaisesRegex(ValueError,'Changed evidence'):m.build_inventory()
if __name__=='__main__':unittest.main()
