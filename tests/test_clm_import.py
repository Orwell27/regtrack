"""Protect two-column ordering, in-line numbers and linkage to the original PDF."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('clm', 'scripts/import-clm-programme.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class ClmImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((importer.ROOT/'programme.ordered.json').read_text(encoding='utf-8'))

    def test_reproduces_initial_inventory_and_keeps_embedded_numbers_and_conditions(self):
        saved = json.loads(Path('data/mandate/clm-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(), saved)
        self.assertEqual([r['officialId'] for r in saved['records']], [str(n) for n in range(1,862)])
        self.assertEqual(len(saved['contextBlocks']), 18)
        self.assertEqual(saved['inventoryKind'], 'initial-programme')
        self.assertTrue(saved['transcriptionPending'])
        by_id = {r['officialId']: r for r in saved['records']}
        for n in [478,494,578,767,778]:
            self.assertTrue(by_id[str(n)]['text'])
            self.assertIn('/legislatura/3/', by_id[str(n)]['governmentUrl'])
        self.assertIn('4,6', by_id['767']['text'])
        self.assertIn('20.000', by_id['778']['text'])
        self.assertIn('si primero se queda despejado', by_id['384']['text'])
        self.assertEqual(by_id['384']['page'], 30)
        self.assertEqual(by_id['446']['page'], 36)

    def test_every_extracted_line_has_one_destination(self):
        records, contexts = importer.parse_pages(self.pages)
        fragments = [f for r in records+contexts for f in r['fragments']]
        self.assertEqual(sorted((f['page'],f['line']) for f in fragments), [(p['page'],i) for p in self.pages for i,_ in enumerate(p['lines'])])
        for f in fragments:
            line = self.pages[f['page']-1]['lines'][f['line']]
            self.assertEqual(line['column'], f['column'])
            self.assertTrue(line['text'].endswith(f['text']))

    def test_missing_page_renumbered_commitment_or_missing_followup_fails(self):
        for kind in ['page','number','link']:
            changed = copy.deepcopy(self.pages)
            if kind == 'page': changed.pop(16)
            elif kind == 'link': changed[16]['links'] = []
            else:
                line = next(l for l in changed[16]['lines'] if l['text'] == '166')
                line['text'] = '165'
            with self.assertRaises(ValueError): importer.parse_pages(changed)

    def test_modified_original_or_extraction_fails(self):
        original = Path.read_bytes
        for filename in ['programme.pdf','programme.pages.json','programme.ordered.json']:
            def changed(path):
                data = original(path)
                return data+b' ' if path.name == filename else data
            with patch.object(Path,'read_bytes',changed):
                with self.assertRaisesRegex(ValueError,'Changed'): importer.build_inventory()


if __name__ == '__main__': unittest.main()
