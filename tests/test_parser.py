import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.parser import MIN_TIME_COLUMN_WIDTH, find_schedule


class TimeColumnTests(unittest.TestCase):
    def parse(self, headers, widths, *, hidden=(), merged=False):
        lesson_col = len(headers) + 1
        rows = [
            ["День недели", *headers, "АП-26", "ауд"],
            ["Понедельник", *[f"time-{i}" for i in range(len(headers))], "Занятие", "101"],
        ]
        if merged:
            rows.insert(1, [""] * len(rows[0]))
        sheet = SimpleNamespace(
            name="Тест", nrows=len(rows), ncols=len(rows[0]),
            cell_value=lambda r, c: rows[r][c],
            merged_cells=[(0, 2, c, c + 1) for c in range(lesson_col)] if merged else [],
            colinfo_map={c: SimpleNamespace(hidden=c in hidden) for c in widths},
            computed_column_width=lambda c: widths.get(c, 2048),
        )
        workbook = MagicMock()
        workbook.__enter__.return_value.sheets.return_value = [sheet]
        with patch("app.parser.xlrd.open_workbook", return_value=workbook):
            return find_schedule(["test.xls"], "Занятие")[0]["Время"]

    def test_skips_nearly_collapsed_time_column(self):
        self.assertEqual(self.parse(["Время", "Время"], {1: 73, 2: 3584}), "time-1")

    def test_skips_hidden_time_column(self):
        self.assertEqual(self.parse(["Время", "Время"], {1: 3584, 2: 3584}, hidden=(1,)), "time-1")

    def test_requires_header_even_when_column_is_wide(self):
        self.assertEqual(self.parse(["Другое", "Время"], {}), "time-1")

    def test_accepts_normalized_merged_header_and_default_width(self):
        self.assertEqual(self.parse(["  ВРЕМЯ\n"], {}, merged=True), "time-0")

    def test_minimum_width(self):
        for width, expected in ((MIN_TIME_COLUMN_WIDTH - 1, ""), (MIN_TIME_COLUMN_WIDTH, "time-0")):
            with self.subTest(width=width):
                self.assertEqual(self.parse(["Время"], {1: width}), expected)

    def test_missing_header_leaves_time_empty(self):
        self.assertEqual(self.parse([""], {}), "")


if __name__ == "__main__":
    unittest.main()
