"""A complete pact extraction must not erase clauses, pages or changes of scope."""
import copy
import importlib.util
import json
import re
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('balears_import', 'scripts/import-balears-programme.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class BalearsImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((importer.ROOT/'programme.pages.json').read_text(encoding='utf-8'))

    def test_reproduces_initial_pact_without_claiming_full_mandate(self):
        saved = json.loads(Path('data/mandate/balears-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(), saved)
        self.assertEqual(saved['inventoryKind'], 'initial-programme')
        self.assertEqual(len(saved['records']), 117)
        self.assertEqual(len(saved['contextBlocks']), 13)
        by_id = {r['id']: r for r in saved['records']}
        self.assertEqual((by_id['r-04-14']['page'], by_id['r-04-14']['endPage']), (3, 4))
        self.assertEqual((by_id['r-04-71']['page'], by_id['r-04-71']['endPage']), (9, 10))
        self.assertIn('100 días', by_id['r-04-6']['text'])
        self.assertIn('guarderías asistenciales', by_id['r-04-63']['text'])
        self.assertIn('se acredite', by_id['r-04-acuerdo-6']['text'])
        self.assertIn('bimensual', by_id['r-04-comision']['text'])
        self.assertIn('12/07/2024', saved['textNote'])

    def test_every_body_line_is_preserved_once_and_in_source_order(self):
        records, contexts = importer.parse_pages(self.pages)
        fragments = [f for item in records+contexts for f in item['fragments']]
        coordinates = [(f['page'], f['line']) for f in fragments]
        self.assertEqual(len(coordinates), len(set(coordinates)))
        expected = []
        for page in self.pages:
            body = [(i, s.strip()) for i, s in enumerate(page['text'].splitlines()) if s.strip()][1:]
            for index, line in body:
                text = re.sub(r'^(?:\d+\.\s+|(?:Primero|Segundo|Tercero|Cuarto|Quinto|Sexto)\.-\s+)', '', line)
                expected.append(dict(page=page['page'], line=index, text=text))
        self.assertEqual(sorted(fragments, key=lambda f: (f['page'], f['line'])), expected)

    def test_dropped_page_measure_clause_heading_or_signature_fails(self):
        for mutate in [lambda p: p.pop(),
                       lambda p: p[0].update(text=p[0]['text'].replace('Quinto.-', 'Cuarto.-')),
                       lambda p: p[1].update(text=p[1]['text'].replace('6. Eliminaremos', '5. Eliminaremos')),
                       lambda p: p[1].update(text=p[1]['text'].replace('LIBERTAD:', 'LIBERTADES:')),
                       lambda p: p[-1].update(text=p[-1]['text'].replace('Portavoz Grupo Parlamentario PP', ''))]:
            pages = copy.deepcopy(self.pages)
            mutate(pages)
            with self.assertRaises(ValueError): importer.parse_pages(pages)

    def test_changed_source_or_extraction_is_rejected(self):
        original = Path.read_bytes
        for filename in ['programme.pdf', 'programme.pages.json']:
            def changed(path):
                data = original(path)
                return data+b' ' if path.name == filename else data
            with patch.object(Path, 'read_bytes', changed):
                with self.assertRaisesRegex(ValueError, 'Changed'): importer.build_inventory()


if __name__ == '__main__': unittest.main()
