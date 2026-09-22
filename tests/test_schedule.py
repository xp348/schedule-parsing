import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import MagicMock, patch

import requests
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app


class ScheduleTests(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.settings = Settings(
            _env_file=None,
            base_url="https://example.org/schedule/",
            files=["test.xls"],
            base_path_download=self.root / "downloads",
        )
        app.dependency_overrides[get_settings] = lambda: self.settings
        self.addCleanup(app.dependency_overrides.clear)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)
        self.get = patch("app.downloader.requests.get").start()
        self.addCleanup(patch.stopall)
        self.response = MagicMock()
        self.response.content = b"not an Excel file"
        self.get.return_value.__enter__.return_value = self.response

    def search(self):
        return self.client.get("/schedule", params={"keyword": "  Иванов  "})

    def assert_downloads_cleaned(self):
        self.assertEqual(list(self.settings.base_path_download.iterdir()), [])

    def test_success_uses_injected_settings_and_cleans_files(self):
        def parse(paths, keyword):
            self.assertEqual(keyword, "Иванов")
            self.assertEqual(paths[0].read_bytes(), self.response.content)
            self.assertTrue(paths[0].is_relative_to(self.settings.base_path_download))
            return [{
                "Лист": "Лист 1", "День": "понедельник", "Время": "09:00:00",
                "Группа": "  ИС-1  ", "Ячейка": "C5", "Содержимое": "Иванов",
            }]

        with patch("app.services.schedule.find_schedule", side_effect=parse):
            response = self.search()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["Время"], "09:00")
        self.assertEqual(response.json()[0]["Группа"], "ИС-1")
        self.assertEqual(self.get.call_args.args[0], "https://example.org/schedule/test.xls")
        self.assert_downloads_cleaned()

    def test_download_timeout(self):
        self.get.side_effect = requests.Timeout("timeout")
        response = self.search()
        self.assertEqual(response.status_code, 504)
        self.assertEqual(response.json()["detail"], "Сервер расписания не ответил вовремя: test.xls")
        self.assert_downloads_cleaned()

    def test_http_error(self):
        self.response.raise_for_status.side_effect = requests.HTTPError("404")
        response = self.search()
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()["detail"], "Не удалось получить расписание: test.xls")
        self.assert_downloads_cleaned()

    def test_html_remains_download_error(self):
        self.response.content = b"<!doctype html><html></html>"
        response = self.search()
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()["detail"], "Не удалось получить расписание: test.xls")
        self.assert_downloads_cleaned()

    def test_invalid_excel(self):
        response = self.search()
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()["detail"], "Сервер расписания вернул некорректный Excel-файл")
        self.assert_downloads_cleaned()

    def test_storage_error(self):
        self.settings.base_path_download.write_text("a file blocks directory creation")
        response = self.search()
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["detail"], "Не удалось сохранить или прочитать расписание")
        self.get.assert_not_called()

    def test_empty_keyword_does_not_download(self):
        for keyword in ("", "   "):
            with self.subTest(keyword=keyword):
                response = self.client.get("/schedule", params={"keyword": keyword})
                self.assertEqual(response.status_code, 422)
        self.get.assert_not_called()


if __name__ == "__main__":
    unittest.main()
