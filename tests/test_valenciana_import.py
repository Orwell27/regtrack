"""Preserve initial speech boundaries, columns and attribution without inventing promises."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('valenciana', 'scripts/import-valenciana-programme.py')
importer = importlib.util.module_from_spec(spec); spec.loader.exec_module(importer)

class ValencianaImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((importer.ROOT/'programme.pages.json').read_text(encoding='utf-8'))

    def test_reproduction_and_conditions(self):
        saved = json.loads(Path('data/mandate/valenciana-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(), saved)
        self.assertEqual(saved['inventoryKind'], 'speech-sections')
        self.assertEqual(len(saved['records']), 19)
        self.assertEqual(len(saved['contextBlocks']), 2)
        rows = {r['id']: r for r in saved['records']}
        self.assertIn('todas las asignaturas', rows['r-10-12']['text'])
        self.assertIn('efectos inmediatos', rows['r-10-12']['text'])
        self.assertIn('passat debat de política general', rows['r-10-13']['text'])
        self.assertIn('30 días', rows['r-10-15']['text'])
        self.assertIn('La senyora presidenta:', rows['r-10-15']['text'])
        self.assertIn('El senyor Pérez Llorca:', rows['r-10-15']['text'])
        self.assertIn('simplifique', rows['r-10-15']['text'])
        self.assertNotIn('\x02', ''.join(r['text'] for r in saved['records']))

    def test_every_initial_speech_line_has_exactly_one_destination(self):
        rows, contexts = importer.parse_pages(self.pages)
        fragments = [f for r in rows+contexts for f in r['fragments']]
        lines = importer.body_lines(self.pages)
        end = next(i for i,f in enumerate(lines) if f['page']==10 and f['text']=='Moltíssimes gràcies. (Aplaudiments)')+1
        self.assertEqual(sorted((f['page'],f['index']) for f in fragments), sorted((f['page'],f['index']) for f in lines[:end]))
        for f in fragments:
            self.assertEqual(f['text'],self.pages[f['page']-1]['text'].splitlines()[f['index']].strip())
        self.assertEqual(contexts[-1]['endPage'],10)
        self.assertTrue(contexts[-1]['text'].endswith('Moltíssimes gràcies. (Aplaudiments)'))

    def test_page_anchor_and_speaker_changes_fail(self):
        for mode in ['missing','duplicate','order','anchor','closing','speaker','printed']:
            pages = copy.deepcopy(self.pages)
            if mode == 'missing': pages.pop(20)
            elif mode == 'duplicate': pages.insert(20,pages[20])
            elif mode == 'order': pages[20],pages[21]=pages[21],pages[20]
            elif mode == 'anchor': pages[7]['text']=pages[7]['text'].replace('Por eso, señorías, si también me conceden','Texto cambiado')
            elif mode == 'closing': pages[9]['text']=pages[9]['text'].replace('Moltíssimes gràcies. (Aplaudiments)','Cierre cambiado')
            elif mode == 'speaker': pages[9]['text']=pages[9]['text'].replace('La senyora presidenta:','Otro orador:')
            else: pages[7]['text']=pages[7]['text'].replace('Pàg. 4158','Pàg. 4160')
            with self.subTest(mode=mode):
                with self.assertRaises(ValueError): importer.parse_pages(pages)

    def test_changed_evidence_fails(self):
        original = Path.read_bytes
        for filename in ['programme.pdf','programme.pages.json']:
            def changed(path): return original(path)+(b' ' if path.name == filename else b'')
            with patch.object(Path,'read_bytes',changed):
                with self.assertRaisesRegex(ValueError,'Changed evidence'): importer.build_inventory()

if __name__ == '__main__': unittest.main()
