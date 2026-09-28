import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.parser import MIN_TIME_COLUMN_WIDTH, find_schedule, post_process_schedule


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
        for header in ("Время", "Часы", "  ВРЕМЯ\n", "  ЧАСЫ\n"):
            with self.subTest(header=header):
                self.assertEqual(self.parse([header], {}, merged=True), "time-0")

    def test_minimum_width(self):
        for width, expected in ((MIN_TIME_COLUMN_WIDTH - 1, ""), (MIN_TIME_COLUMN_WIDTH, "time-0")):
            with self.subTest(width=width):
                self.assertEqual(self.parse(["Время"], {1: width}), expected)

    def test_missing_header_leaves_time_empty(self):
        self.assertEqual(self.parse([""], {}), "")


class PostProcessScheduleTests(unittest.TestCase):
    def test_sorts_by_weekday_and_time(self):
        results = post_process_schedule([
            {"День": "Среда", "Время": "12:00", "Содержимое": "3"},
            {"День": " понедельник ", "Время": "12.10 - 13.40", "Содержимое": "3-pair"},
            {"День": "", "Время": "09:00", "Содержимое": "unknown"},
            {"День": "понедельник", "Время": "", "Содержимое": "no-time"},
            {"День": "вторник", "Время": "11:00", "Содержимое": "2"},
            {"День": "понедельник", "Время": "8.40 - 10.10", "Содержимое": "1-pair"},
            {"День": "понедельник", "Время": "10:20 - 11:50", "Содержимое": "2-pair"},
        ])

        self.assertEqual(
            [result["Содержимое"] for result in results],
            ["1-pair", "2-pair", "3-pair", "no-time", "2", "3", "unknown"],
        )
        self.assertEqual(
            [result["День"] for result in results],
            [
                "Понедельник", "Понедельник", "Понедельник", "Понедельник",
                "Вторник", "Среда", "",
            ],
        )


if __name__ == "__main__":
    unittest.main()
