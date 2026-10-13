"""Protect the original count, spread continuations and unnumbered conditions."""
import copy
import importlib.util
import json
import re
import unittest
from collections import Counter
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('melilla_import', 'scripts/import-melilla-programme.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class MelillaImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((importer.ROOT/'programme.columns.json').read_text(encoding='utf-8'))['pages']

    def test_reproduces_programme_without_correcting_duplicate_number(self):
        saved = json.loads(Path('data/mandate/melilla-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(), saved)
        self.assertEqual(len(saved['records']), 816)
        self.assertEqual(len({r['topic'] for r in saved['records']}), 18)
        self.assertEqual(len(saved['contextBlocks']), 88)
        duplicates = [r for r in saved['records'] if r['officialId'] == '388']
        self.assertEqual([r['id'] for r in duplicates], ['r-19-388', 'r-19-388-bis'])
        self.assertTrue(all(r['sourceNote'] and r['page'] == 66 for r in duplicates))
        self.assertIn('conciliación', duplicates[0]['text'])
        self.assertIn('violencia de género', duplicates[1]['text'])

    def test_preserves_all_body_characters_in_records_or_context(self):
        records, contexts = importer.parse_pages(self.pages)
        lines = []
        for page in self.pages[8:125]:
            for half in page['halves']:
                for line in half.splitlines():
                    marker = re.match(r'^(\d+)\s*\.(?!\d)\s*(.+)', line)
                    nested_park = marker and page['page'] == 97 and marker[1] in ('5', '11', '13')
                    lines.append(marker[2] if marker and not nested_park else line)
        chars = lambda s: Counter(c for c in s if not c.isspace())
        self.assertEqual(chars(''.join(lines)), chars(''.join(r['rawText'] for r in records+contexts)))
        university = next(c for c in contexts if c['page'] == 24)
        self.assertIn('de inmediato', university['text'])
        self.assertIn('5000 universitarios', university['text'])
        self.assertLess(university['text'].index('MEDIDAS GENERALES'), university['text'].index('Hasta junio'))
        self.assertIn('de inmediato, para ampliar los espacios universitarios', university['text'])

    def test_continuations_and_prior_park_list_are_not_extra_promises(self):
        records, _ = importer.parse_pages(self.pages)
        by_id = {r['id']: r for r in records}
        self.assertEqual((by_id['r-19-9']['page'], by_id['r-19-9']['endPage']), (12, 13))
        for phrase in ['9.1', '9.2', '9.3', 'Menores Extranjeros']:
            self.assertIn(phrase, by_id['r-19-9']['text'])
        self.assertIn('actuaciones de capacitación', by_id['r-19-813']['text'])
        self.assertTrue(by_id['r-19-35']['text'].startswith('Continuaremos'))
        for phrase in ['2015-2019', '5. Barrio Pinares', '11. Calle Pedro Navarro', '13. Playa']:
            self.assertIn(phrase, by_id['r-19-606']['text'])

    def test_incomplete_or_renumbered_extraction_is_rejected(self):
        with self.assertRaises(ValueError): importer.parse_pages(self.pages[:-1])
        changed = copy.deepcopy(self.pages)
        changed[24]['halves'].pop()
        with self.assertRaisesRegex(ValueError, 'Missing spread half'): importer.parse_pages(changed)
        changed = copy.deepcopy(self.pages)
        changed[65]['halves'] = [re.sub(r'(?m)^388\.', '389.', half) for half in changed[65]['halves']]
        with self.assertRaisesRegex(ValueError, 'Missing, reordered'): importer.parse_pages(changed)

    def test_changed_original_or_extraction_is_rejected(self):
        original = Path.read_bytes
        for filename in ['programme.pdf', 'programme.columns.json']:
            def changed(path):
                data = original(path)
                return data + b' ' if path.name == filename else data
            with patch.object(Path, 'read_bytes', changed):
                with self.assertRaisesRegex(ValueError, 'Changed'): importer.build_inventory()


if __name__ == '__main__': unittest.main()
