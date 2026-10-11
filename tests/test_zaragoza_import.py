import copy
import hashlib
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('zaragoza', 'scripts/import-zaragoza-programme.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class ZaragozaImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((m.ROOT/'programme.pages.json').read_text(encoding='utf-8'))
        cls.layout = json.loads((m.ROOT/'programme.layout.json').read_text(encoding='utf-8'))

    def test_reproduction_and_geography(self):
        x = m.build_inventory()
        self.assertEqual(x, json.loads(Path('data/mandate/zaragoza-inventory.json').read_text(encoding='utf-8')))
        self.assertEqual(len(x['records']), 37)
        self.assertEqual(len(x['contextBlocks']), 2)
        rows = {r['id']: r for r in x['records']}
        self.assertIn('INVERSIONES Y TALENTO', rows['m-50297-4']['topic'])
        self.assertIn('486 viviendas en 9 promociones', rows['m-50297-7']['text'])
        self.assertIn('Vía Verde', rows['m-50297-20']['text'])
        self.assertNotIn('Vía Verde', rows['m-50297-19']['text'])
        self.assertIn('Convenio 2021-24', rows['m-50297-25']['text'])
        self.assertIn('Remanente Pendiente', rows['m-50297-25']['text'])
        self.assertNotIn('m-50297-10', rows)
        all_text = ' '.join(r['text'] for r in x['records'])
        self.assertEqual(all_text.count('Adecuación a prevención de incendios el pabellón sociocultural'), 2)

    def test_every_body_line_exactly_once(self):
        rows, contexts = m.parse_pages(self.pages, self.layout)
        seen = {}
        for row in rows+contexts:
            for f in row['fragments']:
                key = (f['page'], f['index'])
                self.assertNotIn(key, seen)
                raw = self.pages[f['page']-1]['text']
                self.assertEqual(raw[f['start']:f['end']], f['text'])
                seen[key] = f['text']
        expected = {(p['page'], i): t for p in self.pages[1:50] for i, t in enumerate(p['text'].splitlines()) if t.strip() and t not in m.HEADERS}
        self.assertEqual(seen, expected)

    def test_missing_lines_bad_order_and_boundaries_fail(self):
        for mode in ['page', 'line', 'duplicate', 'offset', 'order', 'heading', 'continuation']:
            pages, layout = copy.deepcopy(self.pages), copy.deepcopy(self.layout)
            if mode == 'page': pages.pop()
            elif mode == 'line': layout[40]['lines'].pop(3)
            elif mode == 'duplicate': layout[40]['lines'].append(layout[40]['lines'][3])
            elif mode == 'offset': layout[40]['lines'][3]['start'] += 1
            elif mode == 'order': layout[40]['lines'].reverse()
            else:
                page, old, new = (40, 'JUNTA MUNICIPAL LAS FUENTES', 'JUNTA MUNICIPAL OTRA FUENTE') if mode == 'heading' else (17, 'INVERSIONES Y TALENTO', 'OTRA COSA')
                pages[page]['text'] = pages[page]['text'].replace(old, new)
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                m.parse_pages(pages, layout)

    def test_source_and_extraction_integrity(self):
        original = Path.read_bytes
        for name in ['programme.pdf', 'programme.pages.json', 'programme.layout.json']:
            def changed(p): return original(p)+(b' ' if p.name == name else b'')
            with patch.object(Path, 'read_bytes', changed), self.assertRaisesRegex(ValueError, 'Changed evidence'):
                m.build_inventory()
        sources = json.loads(Path('data/mandate/evidence/territorial/sources.json').read_text(encoding='utf-8'))
        for s in [s for s in sources if s['jurisdictionId'] == 'm-50297']:
            data = Path(s['snapshotPath']).read_bytes()
            self.assertEqual(len(data), s['bytes'])
            self.assertEqual(hashlib.sha256(data).hexdigest(), s['sha256'])
        meta = json.loads((m.ROOT/'housing-budget.meta.json').read_text(encoding='utf-8'))
        self.assertEqual(hashlib.sha256((m.ROOT/'housing-budget.ocr.json').read_bytes()).hexdigest(), meta['ocrSha256'])


if __name__ == '__main__': unittest.main()
