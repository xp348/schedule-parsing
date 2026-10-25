import unittest
from schedule import get_lessons, get_week_parity


class Sheet:
    def __init__(self, cells, merged_cells=(), nrows=13):
        self.name = "ФЭЭиУ 4 курс"
        self.nrows = nrows
        self.ncols = 14
        self.cells = cells
        self.merged_cells = merged_cells

    def cell_value(self, row, column):
        return self.cells.get((row, column), "")


class GetLessonsTests(unittest.TestCase):
    groups = {
        "R8C11": {"v": "ИС-23", "row": 2, "col": 2},
        "R8C13": {"v": "ИЭ-23", "row": 2, "col": 2},
    }
    weekdays = {"R10C1": {"v": "ПОНЕДЕЛЬНИК", "row": 4, "col": 1}}
    times = {
        "R10C3": {"v": "8.40 - 10.10", "row": 2, "col": 1},
        "R12C3": {"v": "10.20 - 11.50", "row": 2, "col": 1},
    }

    def test_shared_lecture_is_exported_once_for_each_group(self):
        text = "Методы и средства проектирования информационных систем (лек)Громов В.А."
        sheet = Sheet(
            {(9, 10): text, (9, 13): "М-309"},
            merged_cells=[(9, 11, 10, 13), (9, 11, 13, 14)],
        )
        rows = get_lessons(sheet, self.groups, self.weekdays, self.times)
        self.assertEqual(rows, [
            {"group": group, "time": "8.40 - 10.10", "weekday": "ПОНЕДЕЛЬНИК",
             "lesson": text, "week_parity": None, "classroom": "М-309"}
            for group in ["ИС-23", "ИЭ-23"]
        ])

    def test_vertical_merge_keeps_each_distinct_time_and_weekday(self):
        sheet = Sheet(
            {(9, 10): "Общая пара", (9, 13): "М-309"},
            merged_cells=[(9, 13, 10, 13), (9, 13, 13, 14)],
        )
        weekdays = {
            "R10C1": {"v": "ПОНЕДЕЛЬНИК", "row": 2, "col": 1},
            "R12C1": {"v": "ВТОРНИК", "row": 2, "col": 1},
        }
        # Одинаковое время другого дня не должно считаться дубликатом.
        times = {key: {**value, "v": "8.40 - 10.10"} for key, value in self.times.items()}
        rows = get_lessons(sheet, self.groups, weekdays, times)
        self.assertEqual(len(rows), 4)
        for group in ["ИС-23", "ИЭ-23"]:
            self.assertEqual(
                [row["weekday"] for row in rows if row["group"] == group],
                ["ПОНЕДЕЛЬНИК", "ВТОРНИК"],
            )
        rows = get_lessons(sheet, self.groups, self.weekdays, self.times)
        for group in ["ИС-23", "ИЭ-23"]:
            self.assertEqual(
                [row["time"] for row in rows if row["group"] == group],
                ["8.40 - 10.10", "10.20 - 11.50"],
            )

    def test_separate_week_records_and_classrooms_are_preserved(self):
        sheet = Sheet({
            (9, 10): "н. Лекция", (9, 11): "М-301",
            (10, 10): "ч. Лекция", (10, 11): "М-302",
            (11, 10): "Практика", (11, 11): "М-303",
            (12, 10): "Практика", (12, 11): "М-304",
        })
        rows = get_lessons(sheet, self.groups, self.weekdays, self.times)
        self.assertEqual([row["lesson"] for row in rows], ["н. Лекция", "ч. Лекция", "Практика", "Практика"])
        self.assertEqual([row["classroom"] for row in rows], ["М-301", "М-302", "М-303", "М-304"])
        self.assertEqual([row["week_parity"] for row in rows], ["odd", "even", None, None])
        self.assertTrue(all(row["group"] == "ИС-23" for row in rows))


class WeekParityTests(unittest.TestCase):
    def test_standard_prefixes_with_or_without_a_space(self):
        for text, expected in [
            ("н. Математика (лек) Иванов И.И.", "odd"),
            ("ч.Математика (прак) Иванов И.И.", "even"),
            ("  Н.  Информатика (лаб.) Иванов Н. Н.", "odd"),
            ("Ч. Физика", "even"),
            ("н.", "odd"),
            ("ч.", "even"),
        ]:
            with self.subTest(text=text):
                self.assertEqual(get_week_parity(text), expected)

    def test_missing_prefix_and_other_conditions_are_not_guessed(self):
        for text in [
            "Математика (лек) Иванов Н. Ч.",
            "Лекция по нечётным неделям",
            "Математика (лек. №н. 1-7)",
            "27.10.2026 - Математика (прак)",
            "Математика (ч.)",
            "неделя 1: Математика",
            "н Математика",
            "н . Математика",
            "n. Математика",
            "",
        ]:
            with self.subTest(text=text):
                self.assertIsNone(get_week_parity(text))

    def test_combined_prefixes_are_left_unknown(self):
        for text in [
            "н./ч. Математика",
            "н. / ч. Математика",
            "н. ч. Математика",
            "н. Математика; ч. Физика",
            "ч. Математика | н. Физика",
        ]:
            with self.subTest(text=text):
                self.assertIsNone(get_week_parity(text))

    def test_extracting_explicit_prefix_does_not_interpret_remaining_conditions(self):
        self.assertEqual(get_week_parity("н. Страхование (лек. №н. 1-7) Иванов И.И."), "odd")
        self.assertEqual(get_week_parity("ч. 18.11.2026 - История (лек)"), "even")

    def test_shared_lesson_keeps_raw_text_and_parity_for_each_group(self):
        text = "ч. Информатика (лек) Иванов Н. Н."
        sheet = Sheet(
            {(9, 10): text, (9, 13): "М-309"},
            merged_cells=[(9, 11, 10, 13), (9, 11, 13, 14)],
        )
        rows = get_lessons(sheet, GetLessonsTests.groups, GetLessonsTests.weekdays, GetLessonsTests.times)
        self.assertEqual(len(rows), 2)
        self.assertEqual([row["group"] for row in rows], ["ИС-23", "ИЭ-23"])
        self.assertTrue(all(row["lesson"] == text and row["week_parity"] == "even" for row in rows))


if __name__ == "__main__":
    unittest.main()
