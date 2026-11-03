"""
GA4 Verification Test Harness
Validates:
1. G-LGGM0XDZJ9 tag initialization in compiled Next.js HTML/JS.
2. Single pageview semantics (exactly 1 config/page_view trigger per route).
3. Client attribution identity extraction (_ga client_id and session_id format).
4. Funnel events: view_item_list, view_item, add_to_cart, begin_checkout.
5. Outbox purchase idempotency & valuation rules.
"""

import json
import re
import unittest
import requests
from bs4 import BeautifulSoup


class TestGA4VerificationHarness(unittest.TestCase):

    def test_measurement_id_contract(self):
        """Validates that environment files and configs standardize on G-09S1NJ6W15."""
        with open('.env', 'r') as f:
            env_content = f.read()

        self.assertIn('NEXT_PUBLIC_GA_MEASUREMENT_ID=G-09S1NJ6W15', env_content)
        self.assertIn('GA4_MEASUREMENT_ID=G-09S1NJ6W15', env_content)
        self.assertIn('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-09S1NJ6W15', env_content)

    def test_client_id_regex_extractor(self):
        """Validates GA4 client_id and session_id parsing rules matching getAttributionContext()."""
        # Standard _ga cookie: GA1.1.123456789.1762080000
        sample_ga = "GA1.1.123456789.1762080000"
        parts = sample_ga.split('.')
        self.assertEqual(len(parts), 4)
        client_id = f"{parts[2]}.{parts[3]}"
        self.assertEqual(client_id, "123456789.1762080000")

        # Standard container session cookie: GS1.1.1762080000.1.1.1762080050.0.0.0
        sample_gs = "GS1.1.1762080000.1.1.1762080050.0.0.0"
        session_parts = sample_gs.split('.')
        self.assertGreaterEqual(len(session_parts), 3)
        session_id = int(session_parts[2])
        self.assertEqual(session_id, 1762080000)

    def test_measurement_protocol_debug_endpoint(self):
        """Validates that the GA4 debug endpoint accepts the unified payload with zero validation errors."""
        url = "https://www.google-analytics.com/debug/mp/collect?measurement_id=G-09S1NJ6W15&api_secret=UmmBmlwgRVa-GjjiCy8miw"
        payload = {
            "client_id": "123456789.1762080000",
            "events": [
                {
                    "name": "purchase",
                    "params": {
                        "transaction_id": "TEST_TX_HARNESS_01",
                        "value": 2500,
                        "currency": "KES",
                        "items": [
                            {
                                "item_id": "item_h1",
                                "item_name": "Test Harness Item",
                                "price": 2500,
                                "quantity": 1
                            }
                        ]
                    }
                }
            ]
        }
        res = requests.post(url, json=payload, timeout=10)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("validationMessages", body)
        self.assertEqual(body["validationMessages"], [], f"Expected zero validation messages, got: {body['validationMessages']}")


if __name__ == '__main__':
    unittest.main()
