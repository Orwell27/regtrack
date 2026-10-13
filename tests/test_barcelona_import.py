"""Offline reproduction and corrupt-input checks for the complete municipal archive."""
import copy
import importlib.util
import json
import unittest
from unittest.mock import patch
from pathlib import Path

spec = importlib.util.spec_from_file_location('barcelona_import', 'scripts/import-barcelona-catalogue.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class BarcelonaImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.capture = json.loads((importer.ROOT / 'capture.json').read_text(encoding='utf-8'))

    def test_reproduces_every_detail_and_checks_all_original_hashes(self):
        inventory = json.loads(Path('data/mandate/barcelona-inventory.json').read_text(encoding='utf-8'))
        records = importer.import_records(self.capture)
        self.assertEqual(records, inventory['records'])
        self.assertEqual(len(records), 1248)
        self.assertTrue(all(record['detailText'] for record in records))
        self.assertEqual(inventory['sourceSha256'], self.capture['catalogue']['sha256'])

    def test_missing_detail_fails(self):
        capture = copy.deepcopy(self.capture)
        capture['details'].pop()
        with self.assertRaisesRegex(ValueError, 'Missing or duplicate'):
            importer.import_records(capture)

    def test_duplicate_detail_fails_even_when_count_matches(self):
        capture = copy.deepcopy(self.capture)
        capture['details'][0] = capture['details'][1]
        with self.assertRaisesRegex(ValueError, 'Missing or duplicate'):
            importer.import_records(capture)

    def test_changed_original_fails(self):
        metadata = copy.deepcopy(self.capture['details'][0])
        metadata['sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'Changed original'):
            importer.read_verified(metadata)

    def test_detail_link_cannot_be_reassigned(self):
        capture = copy.deepcopy(self.capture)
        capture['details'][0]['url'] += '-other'
        with self.assertRaisesRegex(ValueError, 'Detail URL mismatch'):
            importer.import_records(capture)

    def test_local_archive_path_cannot_escape(self):
        metadata = copy.deepcopy(self.capture['details'][0])
        metadata['snapshotPath'] = 'data/mandate/evidence/territorial/barcelona/../sources.json'
        with self.assertRaisesRegex(ValueError, 'Unexpected archive path'):
            importer.read_verified(metadata)

    def test_unexpected_detail_page_cannot_be_silently_imported(self):
        original_reader = importer.read_verified
        def wrong_page(metadata):
            if metadata['id'] != 'catalogue':
                return '<html><p>Service unavailable</p></html>'
            return original_reader(metadata)
        with patch.object(importer, 'read_verified', side_effect=wrong_page):
            with self.assertRaisesRegex(ValueError, 'Ambiguous detail'):
                importer.import_records(self.capture)


if __name__ == '__main__':
    unittest.main()
