"""Complete catalogue and optional follow-ups, never an invented completion score."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('donostia_import', 'scripts/import-donostia-catalogue.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class DonostiaImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.capture = json.loads((importer.ROOT/'capture.json').read_text(encoding='utf-8'))

    def test_reproduces_all_descriptions_and_checks_every_original(self):
        saved = json.loads(Path('data/mandate/donostia-inventory.json').read_text(encoding='utf-8'))
        self.assertEqual(importer.import_inventory(self.capture), saved)
        self.assertEqual(len(saved['records']), 129)
        self.assertEqual(sum('governmentReport' in r for r in saved['records']), 27)
        self.assertTrue(all(r['detailText'] and r['webSource'] for r in saved['records']))
        self.assertIn('127 proyectos', saved['scope'])

    def test_missing_duplicate_or_reassigned_project_fails(self):
        for mutate in [lambda c: c['projects'].pop(), lambda c: c['projects'].__setitem__(0, c['projects'][1]),
                       lambda c: c['projects'][0]['detail'].__setitem__('url', 'https://example.org/')]:
            capture = copy.deepcopy(self.capture); mutate(capture)
            with self.assertRaisesRegex(ValueError, 'Missing, duplicated or reassigned project'):
                importer.import_inventory(capture)

    def test_changed_original_and_escaped_path_fail(self):
        metadata = copy.deepcopy(self.capture['catalogue']); metadata['sha256'] = '0'*64
        with self.assertRaisesRegex(ValueError, 'Changed original'): importer.read_verified(metadata)
        metadata['snapshotPath'] = '../catalogue.html'
        with self.assertRaisesRegex(ValueError, 'Unexpected archive path'): importer.read_verified(metadata)

    def test_followup_cannot_be_omitted_or_reassigned(self):
        for change in ('omit', 'id', 'url'):
            capture = copy.deepcopy(self.capture)
            project = next(p for p in capture['projects'] if p['followup'])
            if change == 'omit': project['followup'] = None
            if change == 'id': project['officialId'] = '999'
            if change == 'url': project['followup']['url'] = 'https://example.org/'
            with self.assertRaisesRegex(ValueError, 'Follow-up omitted|Reassigned follow-up'):
                importer.import_inventory(capture)

    def test_changed_content_boundary_or_percentage_fails(self):
        project = next(p for p in self.capture['projects'] if p['followup'])
        for metadata, before, after, error in [
            (project['detail'], '<h1 class="dtik-wave__item__text">', '<h1>', 'Missing project heading'),
            (project['detail'], '<div class="component-button text-break">', '<div>', 'Unknown project content boundary'),
            (project['followup'], 'Progreso:', 'Sin porcentaje:', 'Invalid follow-up percentage'),
        ]:
            original = importer.read_verified
            def changed(item):
                text = original(item)
                if item['id'] == metadata['id']:
                    altered = text.replace(before, after)
                    self.assertNotEqual(altered, text)
                    return altered
                return text
            with patch.object(importer, 'read_verified', side_effect=changed):
                with self.assertRaisesRegex(ValueError, error): importer.import_inventory(self.capture)


if __name__ == '__main__': unittest.main()
