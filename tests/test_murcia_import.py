"""Guard against silently dropping the pact's operative clauses or continuations."""
import copy
import importlib.util
import json
import re
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('murcia_import', 'scripts/import-murcia-programme.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class MurciaImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((importer.ROOT/'programme.pages.json').read_text(encoding='utf-8'))

    def test_reproduces_all_38_sections_with_copy_warning(self):
        saved = json.loads(Path('data/mandate/murcia-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(), saved)
        self.assertTrue(saved['programmeCopy'])
        self.assertEqual(len(saved['records']), 38)
        self.assertEqual(len(saved['contextBlocks']), 2)
        by_id = {r['id']: r for r in saved['records']}
        self.assertEqual((by_id['r-14-26']['page'], by_id['r-14-26']['endPage']), (4, 5))
        self.assertIn('fijación del empleo', by_id['r-14-26']['text'])
        self.assertIn('11 miembros', by_id['r-14-acuerdo-5']['text'])
        self.assertIn('Defensor del Pueblo', by_id['r-14-acuerdo-8']['text'])

    def test_every_body_character_is_preserved_in_order(self):
        rows, contexts = importer.parse_pages(self.pages)
        body = []
        for page in self.pages:
            lines = [line.strip() for line in page['text'].splitlines() if line.strip()][1:]
            for line in lines:
                body.append(re.sub(r'^(?:\d+\.\s+|(?:Primero|Segundo|Tercero|Cuarto|Quinto|Sexto|Séptimo|Octavo)\.-\s+)', '', line))
        compact = lambda text: ''.join(text.split())
        self.assertEqual(compact(''.join(body)), compact(contexts[0]['rawText']+''.join(r['rawText'] for r in rows)+contexts[1]['rawText']))

    def test_missing_page_clause_or_signature_is_rejected(self):
        for mutate in [lambda p: p.pop(),
                       lambda p: p[5].update(text=p[5]['text'].replace('Octavo.-', 'Séptimo.-')),
                       lambda p: p[5].update(text=p[5]['text'].replace('5 de septiembre de 2023', '6 de septiembre de 2023'))]:
            pages = copy.deepcopy(self.pages)
            mutate(pages)
            with self.assertRaises(ValueError): importer.parse_pages(pages)

    def test_changed_pdf_or_extraction_is_rejected(self):
        original = Path.read_bytes
        for filename in ['programme.pdf', 'programme.pages.json', 'programme-second-copy.pdf', 'programme-second-copy.pages.json']:
            def changed(path):
                data = original(path)
                return data+b' ' if path.name == filename else data
            with patch.object(Path, 'read_bytes', changed):
                with self.assertRaisesRegex(ValueError, 'Changed'): importer.build_inventory()

    def test_changed_second_copy_text_is_rejected_even_if_meta_passes(self):
        verified = importer.verified_pages
        def changed(name):
            meta, pages = verified(name)
            if name == 'programme-second-copy': pages[0]['text'] += 'Otra condición'
            return meta, pages
        with patch.object(importer, 'verified_pages', changed):
            with self.assertRaisesRegex(ValueError, 'different extracted text'): importer.build_inventory()


if __name__ == '__main__': unittest.main()
