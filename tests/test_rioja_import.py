"""Protect column continuations, source scope and conservation against import regressions."""
import copy
import importlib.util
import json
import unittest
from collections import Counter
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('rioja_import', 'scripts/import-rioja-programme.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class RiojaImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((importer.ROOT/'programme.ordered.json').read_text(encoding='utf-8'))
        cls.raw = json.loads((importer.ROOT/'programme.pages.json').read_text(encoding='utf-8'))

    def test_saved_inventory_is_reproducible_without_calling_network(self):
        saved = json.loads(Path('data/mandate/rioja-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(), saved)
        self.assertEqual(saved['inventoryKind'], 'bullet-sections')
        self.assertEqual(len(saved['records']), 949)
        self.assertEqual(len({r['topic'] for r in saved['records']}), 14)
        self.assertTrue(all(r['officialId'].startswith('Sin número') for r in saved['records']))

    def test_every_body_character_and_summary_is_preserved(self):
        rows, contexts = importer.parse_pages(self.pages, self.raw)
        before = ''.join(s['text'][1:].lstrip() if s['text'].startswith('•') else s['text']
            for p in self.pages for s in p['spans']+p['quotes'])
        before += ''.join(p['text'] for p in self.raw if 9 <= p['page'] <= 19)
        chars = lambda s: Counter(''.join(s.split()))
        self.assertEqual(chars(before), chars(''.join(r['rawText'] for r in rows+contexts)))
        self.assertIn('jubilados y personas con discapacidad superior al 33%', ' '.join(c['text'] for c in contexts))

    def test_cross_page_conditions_and_quotes_are_not_attached_to_other_promises(self):
        rows, contexts = importer.parse_pages(self.pages, self.raw)
        medicine = rows[563]
        self.assertEqual((medicine['page'], medicine['endPage']), (102, 103))
        self.assertTrue(medicine['text'].endswith('en nuestra región.'))
        self.assertIn('Enfermería ya existente', medicine['text'])
        self.assertNotIn('se han colapsado las urgencias', ' '.join(r['text'] for r in rows))
        self.assertIn('se han colapsado las urgencias', ' '.join(c['text'] for c in contexts))
        self.assertTrue(rows[893]['text'].endswith('(9-3-2023)'))
        self.assertNotIn('Plan Director', rows[893]['text'])
        self.assertEqual((rows[895]['page'], rows[895]['endPage']), (161, 162))
        self.assertIn('Ley Estatal del Deporte', rows[895]['text'])

    def test_removed_bullet_fails_instead_of_silently_changing_denominator(self):
        pages = copy.deepcopy(self.pages)
        span = next(s for p in pages for s in p['spans'] if s['text'].startswith('•'))
        span['text'] = span['text'][1:]
        with self.assertRaises(ValueError): importer.parse_pages(pages, self.raw)

    def test_changed_pdf_or_either_extraction_fails(self):
        original = Path.read_bytes
        for filename in ['programme.pdf', 'programme.pages.json', 'programme.ordered.json']:
            def changed(path):
                data = original(path)
                return data+b' ' if path.name == filename else data
            with patch.object(Path, 'read_bytes', changed):
                with self.assertRaisesRegex(ValueError, 'Changed'): importer.build_inventory()


if __name__ == '__main__': unittest.main()
