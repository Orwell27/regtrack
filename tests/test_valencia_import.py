import copy
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('valencia','scripts/import-valencia-programme.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ValenciaImportTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.pages=json.loads((m.ROOT/'investiture.pages.json').read_text(encoding='utf-8'))
 def test_reproduction_and_attribution(self):
  x=m.build_inventory();self.assertEqual(x,json.loads(Path('data/mandate/valencia-inventory.json').read_text(encoding='utf-8')))
  self.assertEqual(len(x['records']),19);self.assertEqual(len(x['contextBlocks']),2)
  self.assertIn('más de 67 millones',x['records'][3]['text']);self.assertIn('enero de 2024',x['records'][3]['text'])
  self.assertTrue(x['records'][11]['text'].startswith('Y les anuncio'));self.assertIn('esta mateixa setmana',x['records'][12]['text'])
  self.assertTrue(x['contextBlocks'][0]['text'].startswith('Sra. Alcaldessa'))
  self.assertNotIn('permitirme ser el portavoz',' '.join(r['text'] for r in x['records']+x['contextBlocks']))
 def test_every_speech_character_is_preserved_once(self):
  rows,contexts=m.parse_pages(self.pages);seen={}
  for row in rows+contexts:
   for f in row['fragments']:
    raw=self.pages[f['page']-1]['text'].splitlines()[f['index']]
    self.assertEqual(f['text'],raw[f['start']:f['end']])
    for offset in range(f['start'],f['end']):
     key=(f['page'],f['index'],offset);self.assertNotIn(key,seen);seen[key]=raw[offset]
  expected={}
  for p in self.pages[21:]:
   for i,line in enumerate(p['text'].splitlines()):
    if i<10 or(p['page']==22 and i<49)or(p['page']==29 and i>30):continue
    for n,char in enumerate(line):expected[(p['page'],i,n)]=char
  self.assertEqual(seen,expected)
 def test_changed_boundaries_fail(self):
  for mode in ['page','speaker','anchor','order','closing','header']:
   ps=copy.deepcopy(self.pages)
   if mode=='page':ps.pop()
   elif mode=='speaker':ps[21]['text']=ps[21]['text'].replace('Sra. Alcaldessa','Otro orador')
   elif mode=='anchor':ps[25]['text']=ps[25]['text'].replace('Dedicaré un tiempo muy breve','Otro anuncio')
   elif mode=='order':ps[25],ps[26]=ps[26],ps[25]
   elif mode=='closing':ps[28]['text']=ps[28]['text'].replace('Celebrada la sesión constitutiva,','Otro cierre')
   else:ps[25]['text']=ps[25]['text'].replace('JUNIO DE 2023 26','JUNIO DE 2023 25')
   with self.subTest(mode=mode):
    with self.assertRaises(ValueError):m.parse_pages(ps)
 def test_changed_evidence_fails(self):
  original=Path.read_bytes
  for file in ['investiture.pdf','investiture.pages.json']:
   def changed(path):return original(path)+(b' ' if path.name==file else b'')
   with patch.object(Path,'read_bytes',changed):
    with self.assertRaisesRegex(ValueError,'Changed evidence'):m.build_inventory()
if __name__=='__main__':unittest.main()
