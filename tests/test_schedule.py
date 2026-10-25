import unittest
from schedule import get_lessons


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
             "lesson": text, "classroom": "М-309"}
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
        self.assertTrue(all(row["group"] == "ИС-23" for row in rows))


if __name__ == "__main__":
    unittest.main()
