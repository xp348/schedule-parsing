import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import export_schedule
import main


class ExportScheduleTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.output = Path(self.directory.name) / "output" / "schedule.json"
        self.log = Path(self.directory.name) / "logs" / "schedule.log"

    def run_export(self, schedule):
        with patch.object(export_schedule, "main", return_value=schedule):
            return export_schedule.export_schedule(self.output, self.log)

    def test_saves_json_and_log(self):
        schedule = [{"group": "ИЭ-26", "lesson": "Программирование"}]
        self.assertEqual(self.run_export(schedule), schedule)
        self.assertEqual(json.loads(self.output.read_text(encoding="utf-8")), schedule)
        self.assertIn("Расписание сохранено", self.log.read_text(encoding="utf-8"))

    def test_unchanged_data_produces_identical_file(self):
        schedule = [{"group": "ИЭ-26", "lesson": "Программирование"}]
        self.run_export(schedule)
        original = self.output.read_bytes()
        self.run_export(schedule)
        self.assertEqual(self.output.read_bytes(), original)

    def test_empty_result_preserves_previous_data_and_logs_error(self):
        self.run_export([{"group": "ИЭ-26"}])
        original = self.output.read_bytes()
        with self.assertRaises(RuntimeError):
            self.run_export([])
        self.assertEqual(self.output.read_bytes(), original)
        self.assertIn("ERROR", self.log.read_text(encoding="utf-8"))

    def test_download_failure_preserves_previous_data_and_logs_error(self):
        self.run_export([{"group": "ИЭ-26"}])
        original = self.output.read_bytes()
        with patch.object(export_schedule, "main", side_effect=OSError("download failed")):
            with self.assertRaises(OSError):
                export_schedule.export_schedule(self.output, self.log)
        self.assertEqual(self.output.read_bytes(), original)
        self.assertIn("download failed", self.log.read_text(encoding="utf-8"))

    def test_main_stops_when_a_source_cannot_be_loaded(self):
        with patch.object(main, "get_sources", return_value={"missing.xls": "https://example.test/missing.xls"}):
            with patch.object(main, "load_workbook", side_effect=OSError("download failed")):
                with contextlib.redirect_stdout(io.StringIO()):
                    with self.assertRaises(OSError):
                        main.main()


if __name__ == "__main__":
    unittest.main()
