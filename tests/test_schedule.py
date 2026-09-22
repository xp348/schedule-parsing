import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Barrier
from unittest.mock import MagicMock, patch

import requests
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.downloader import download_file, invalidate_downloads
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
        invalidate_downloads(self.settings.files, base_url=str(self.settings.base_url))
        self.addCleanup(
            invalidate_downloads, self.settings.files, base_url=str(self.settings.base_url)
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
        self.search()
        self.assertEqual(self.get.call_count, 2)

    def test_cache_expires_after_fifteen_minutes_without_sliding(self):
        with (
            patch("app.downloader.monotonic", return_value=100) as clock,
            patch("app.services.schedule.find_schedule", return_value=[]),
        ):
            self.assertEqual(self.search().status_code, 200)
            clock.return_value = 999
            response = self.client.get("/schedule", params={"keyword": "Петров"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(self.get.call_count, 1)
            clock.return_value = 1000
            self.assertEqual(self.search().status_code, 200)
            self.assertEqual(self.get.call_count, 2)
        self.assert_downloads_cleaned()

    def test_failed_refresh_is_retried_without_serving_stale_data(self):
        with (
            patch("app.downloader.monotonic", return_value=100) as clock,
            patch("app.services.schedule.find_schedule", return_value=[]),
        ):
            self.assertEqual(self.search().status_code, 200)
            clock.return_value = 1000
            self.get.side_effect = requests.Timeout("timeout")
            self.assertEqual(self.search().status_code, 504)
            self.get.side_effect = None
            self.assertEqual(self.search().status_code, 200)
            self.assertEqual(self.get.call_count, 3)
        self.assert_downloads_cleaned()

    def test_ttl_starts_after_download_finishes(self):
        with patch("app.downloader.monotonic", return_value=100) as clock:
            def finish_download(*args, **kwargs):
                clock.return_value = 130
                return self.get.return_value

            self.get.side_effect = finish_download
            download_file("test.xls", base_url=str(self.settings.base_url), directory=self.root)
            clock.return_value = 1001
            download_file("test.xls", base_url=str(self.settings.base_url), directory=self.root)
            self.assertEqual(self.get.call_count, 1)

    def test_parallel_downloads_share_cache(self):
        barrier = Barrier(4)

        def download(index):
            barrier.wait(timeout=5)
            path = download_file(
                "test.xls", base_url=str(self.settings.base_url),
                directory=self.root / str(index),
            )
            return path.read_bytes()

        with ThreadPoolExecutor(max_workers=4) as executor:
            contents = list(executor.map(download, range(4)))
        self.assertEqual(contents, [self.response.content] * 4)
        self.get.assert_called_once()

    def test_cache_distinguishes_source_urls(self):
        other_url = "https://other.example.org/"
        invalidate_downloads(["test.xls"], base_url=other_url)
        self.addCleanup(invalidate_downloads, ["test.xls"], base_url=other_url)
        download_file("test.xls", base_url=str(self.settings.base_url), directory=self.root)
        self.response.content = b"another file"
        path = download_file("test.xls", base_url=other_url, directory=self.root)
        self.assertEqual(path.read_bytes(), b"another file")
        self.assertEqual(self.get.call_count, 2)

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
