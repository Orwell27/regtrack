"""Missing bullets, closing conditions or originals must fail the import."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('asturias_import', 'scripts/import-asturias-programme.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class AsturiasImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = json.loads((importer.ROOT/'preagreement.pages.json').read_text(encoding='utf-8'))

    def test_reproduces_preagreement_without_inventing_official_numbering(self):
        saved = json.loads(Path('data/mandate/asturias-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.build_inventory(), saved)
        self.assertEqual(saved['inventoryKind'], 'preagreement')
        self.assertEqual(len(saved['records']), 37)
        self.assertEqual(len(saved['contextBlocks']), 1)
        self.assertTrue(all(r['officialId'].startswith('Sin número') and 'Orden editorial' in r['sourceNote'] for r in saved['records']))
        by_id = {r['id']: r for r in saved['records']}
        self.assertEqual((by_id['r-03-34']['page'], by_id['r-03-34']['endPage']), (13, 14))
        self.assertIn('oferta formativa', by_id['r-03-34']['text'])
        self.assertIn('curso 2024-2025', by_id['r-03-19']['text'])
        self.assertIn('cuatro alumnos/as', by_id['r-03-19']['text'])
        self.assertNotIn('ocho personas', by_id['r-03-36']['text'])
        self.assertIn('ocho personas', by_id['r-03-37']['text'])

    def test_every_body_character_is_preserved_in_order_in_raw_text(self):
        rows, contexts = importer.parse_pages(self.pages)
        body = [line[2:] if line.startswith('\uf0b7 ') else line for page in self.pages for line in importer.body_lines(page)]
        compact = lambda text: ''.join(text.split())
        self.assertEqual(compact(''.join(body)), compact(contexts[0]['rawText']+''.join(r['rawText'] for r in rows)))

    def test_font_corrections_are_explicit_and_do_not_replace_other_letters(self):
        self.assertEqual(importer.display_text('nn nniversal SEKnENS nrbana AnRA Universidad'), 'Un Universal SEKUENS Urbana AURA Universidad')
        rows, contexts = importer.parse_pages(self.pages)
        self.assertIn('SEKnENS', rows[10]['rawText'])
        self.assertIn('SEKUENS', rows[10]['text'])
        self.assertIn('nn Ejecutivo', contexts[0]['rawText'])
        self.assertIn('Un Ejecutivo', contexts[0]['text'])

    def test_missing_page_bullet_or_closing_conditions_are_rejected(self):
        for mutate in [lambda p: p.pop(),
                       lambda p: p[8].update(text=p[8]['text'].replace('\uf0b7', '', 1)),
                       lambda p: p[13].update(text=p[13]['text'].replace('ocho personas', 'siete personas')),
                       lambda p: p[13].update(text=p[13]['text'].replace('forma semestral', 'cada año'))]:
            pages = copy.deepcopy(self.pages)
            mutate(pages)
            with self.assertRaises(ValueError): importer.parse_pages(pages)

    def test_changed_pdf_or_extraction_is_rejected(self):
        original = Path.read_bytes
        for filename in ['preagreement.pdf', 'preagreement.pages.json']:
            def changed(path):
                data = original(path)
                return data+b' ' if path.name == filename else data
            with patch.object(Path, 'read_bytes', changed):
                with self.assertRaisesRegex(ValueError, 'Changed'): importer.build_inventory()


if __name__ == '__main__': unittest.main()
