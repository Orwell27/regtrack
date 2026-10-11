import copy
import hashlib
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('murcia_city', 'scripts/import-murcia-city-programme.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class MurciaCityImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((m.ROOT/'investiture-2023.pages.json').read_text(encoding='utf-8'))

    def test_reproduction_and_speaker(self):
        x = m.build_inventory()
        self.assertEqual(x, json.loads(Path('data/mandate/murcia-city-inventory.json').read_text(encoding='utf-8')))
        self.assertEqual(len(x['records']), 11)
        self.assertEqual(len(x['contextBlocks']), 2)
        self.assertIn('equilibrio urbano', x['records'][5]['text'])
        self.assertIn('huerta', x['records'][6]['text'])
        self.assertIn('especulación inmobiliaria', x['records'][7]['text'])
        text = ' '.join(r['text'] for r in x['records']+x['contextBlocks'])
        self.assertNotIn('600 policías', text)  # Gestoso's speech is not Ballesta's.
        self.assertNotIn('Después de esta intervención', text)
        self.assertTrue(text.endswith('antes de que a las estrellas se las coman los gusanos.'))

    def test_every_speech_character_once(self):
        rows, contexts = m.parse_pages(self.pages)
        seen = {}
        for row in rows+contexts:
            for f in row['fragments']:
                raw = self.pages[f['page']-1]['text'].splitlines()[f['index']]
                self.assertEqual(f['text'], raw[f['start']:f['end']])
                for offset in range(f['start'], f['end']):
                    key = (f['page'], f['index'], offset)
                    self.assertNotIn(key, seen)
                    seen[key] = raw[offset]
        expected = {}
        for p in self.pages[15:]:
            lines = p['text'].splitlines()
            stop = 11 if p['page'] == 21 else lines.index('Nº Acta: 202300010')
            for i in range(6, stop):
                if not lines[i].strip():
                    continue
                for n, char in enumerate(lines[i]):
                    expected[(p['page'], i, n)] = char
        self.assertEqual(seen, expected)

    def test_mutated_boundaries_rejected(self):
        for mode in ['page', 'speaker', 'anchor', 'order', 'closing', 'header', 'footer']:
            ps = copy.deepcopy(self.pages)
            if mode == 'page': ps.pop()
            elif mode == 'speaker': ps[15]['text'] = ps[15]['text'].replace('El Alcalde, D. José Francisco Ballesta Germán', 'Otra persona')
            elif mode == 'anchor': ps[18]['text'] = ps[18]['text'].replace('Creo en una Murcia vertebrada', 'Otra política')
            elif mode == 'order': ps[17], ps[18] = ps[18], ps[17]
            elif mode == 'closing': ps[20]['text'] = ps[20]['text'].replace('Después de esta intervención,', 'Otro cierre')
            elif mode == 'header': ps[18]['text'] = ps[18]['text'].replace('C.I.F. P-3003000 A', 'Otro encabezado')
            else: ps[18]['text'] = ps[18]['text'].replace('Página 19 de 21', 'Página 20 de 21')
            with self.subTest(mode=mode):
                with self.assertRaises(ValueError): m.parse_pages(ps)

    def test_integrity_and_multipart_transport(self):
        original = Path.read_bytes
        for file in ['investiture-2023.pdf', 'investiture-2023.pages.json']:
            def changed(path): return original(path)+(b' ' if path.name == file else b'')
            with patch.object(Path, 'read_bytes', changed):
                with self.assertRaisesRegex(ValueError, 'Changed evidence'): m.build_inventory()
        sources = json.loads(Path('data/mandate/evidence/territorial/sources.json').read_text(encoding='utf-8'))
        for s in [s for s in sources if s['jurisdictionId'] == 'm-30030']:
            data = Path(s['snapshotPath']).read_bytes()
            self.assertEqual(len(data), s['bytes'])
            self.assertEqual(hashlib.sha256(data).hexdigest(), s['sha256'])
        meta = json.loads((m.ROOT/'greenway-contract.meta.json').read_text(encoding='utf-8'))
        raw = Path(meta['transportPath']).read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(), meta['transportSha256'])
        self.assertIn((m.ROOT/'greenway-contract.pdf').read_bytes(), raw)


if __name__ == '__main__': unittest.main()
