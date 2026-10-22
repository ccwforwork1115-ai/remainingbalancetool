import json
from pathlib import Path
import runpy
import unittest

ROOT = Path(__file__).resolve().parent
parse = runpy.run_path(str(ROOT.parent / 'document_service.py'))['parse_document']


class DocumentTests(unittest.TestCase):
    def test_document_fixtures(self):
        fixtures = json.loads((ROOT / '公文擷取案例.json').read_text(encoding='utf-8'))
        for case in fixtures:
            with self.subTest(case=case['name']):
                result = parse(case['text'])
                for key in ('project', 'date', 'number', 'approved'):
                    if key in case:
                        self.assertEqual(case[key], result[key])
                if 'count' in case:
                    self.assertEqual(case['count'], len(result['candidates']))
                if 'amountCount' in case:
                    self.assertEqual(case['amountCount'], len(result['amountCandidates']))
                if 'hintIncludes' in case:
                    self.assertIn(case['hintIncludes'], result['hint'])
                if 'hintExcludes' in case:
                    self.assertNotIn(case['hintExcludes'], result['hint'])


if __name__ == '__main__':
    unittest.main()
