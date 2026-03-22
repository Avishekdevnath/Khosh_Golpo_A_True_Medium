from __future__ import annotations

import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models.common import ensure_utc, timestamps_for_insert, timestamps_for_replace, utc_isoformat


class CommonTimeHelpersTest(unittest.TestCase):
    def test_timestamps_for_insert_keeps_created_and_updated_equal(self) -> None:
        created = datetime(2026, 3, 22, 11, 7, 54, 516000)

        insert_created, insert_updated = timestamps_for_insert(created)

        self.assertEqual(insert_created, insert_updated)
        self.assertEqual(insert_created.tzinfo, timezone.utc)

    def test_timestamps_for_replace_preserves_created_and_refreshes_updated(self) -> None:
        created = datetime(2026, 3, 22, 11, 7, 54, 516000, tzinfo=timezone.utc)
        replacement_now = datetime(2026, 3, 22, 11, 9, 10, tzinfo=timezone.utc)

        with patch("app.models.common.utc_now", return_value=replacement_now):
            replace_created, replace_updated = timestamps_for_replace(created)

        self.assertEqual(replace_created, created)
        self.assertEqual(replace_updated, replacement_now)

    def test_utc_isoformat_adds_z_for_naive_datetimes(self) -> None:
        value = datetime(2026, 3, 22, 11, 7, 54, 516000)

        self.assertEqual(utc_isoformat(value), "2026-03-22T11:07:54.516000Z")

    def test_ensure_utc_leaves_aware_values_unchanged(self) -> None:
        value = datetime(2026, 3, 22, 11, 7, 54, tzinfo=timezone.utc)

        self.assertIs(ensure_utc(value), value)


if __name__ == "__main__":
    unittest.main()
